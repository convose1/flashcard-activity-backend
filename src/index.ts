import express, { Express, Request, Response } from "express";
import { Socket, Server } from "socket.io";
import cors from "cors";
import { createServer } from "http";
import dotenv from "dotenv";
import {
  ChannelQuestionType,
  ParamsType,
  WinnerPlayload,
  socketToUserType,
  userObject,
} from "./types";
dotenv.config();
const app: Express = express();
const PORT = process.env.PORT || 4000;

const users: userObject = {};
const socketIdToUser: socketToUserType = {};

let gameStarted = false;
const channelQuestion: ChannelQuestionType = {};

//New imports
const httpServer = createServer(app);
const socketIO = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://convose-flashcard-activity.netlify.app",
      "https://www.convose.com",
    ],
  },
});

//Add this before the app.get() block
socketIO.on("connection", (socket: Socket) => {
  socket.on("disconnect", () => {
    delete users[socket.id];
    const user = socketIdToUser[socket.id] || null;
    if (user) {
      const { channel_id, user_id } = user;
      socket.leave(channel_id);
      const Room = socketIO.to(channel_id);
      users[channel_id] = users[channel_id].filter(
        (user) => user.user_id != user_id
      );
      Room.emit("users_state_refreshed", users[channel_id]);
    }
  });

  socket.on("user_open_activity", (userInfo: ParamsType) => {
    const channel_id = userInfo.channel_id;
    const usersRoom = users[channel_id];
    const { currentQuestionIndex = 0 } = channelQuestion[channel_id] || {};
    socket.emit("receive_init_question_index", currentQuestionIndex);
    socket.emit("receive_game_state", gameStarted);
    socket.emit("users_state_refreshed", usersRoom);
  });
  socket.on("user_join_request", (userInfo: ParamsType) => {
    const channel_id = userInfo.channel_id;

    if (!channelQuestion[channel_id]) {
      channelQuestion[channel_id] = {
        currentQuestionIndex: 0,
      };
    }
    //join user to room
    socket.join(channel_id);
    const user = {
      ...userInfo,
      joined: true,
      point: 0,
    };
    socketIdToUser[socket.id] = user;
    if (users[channel_id]) {
      users[channel_id].push(user);
    } else {
      users[channel_id] = [user];
    }
    const { currentQuestionIndex } = channelQuestion[channel_id];
    const usersRoom = users[channel_id];
    const Room = socketIO.to(channel_id);
    socket.emit("join_request_success", user);
    Room.emit("users_state_refreshed", usersRoom);
    socket.emit("receive_init_question_index", currentQuestionIndex);
  });
  socket.on("game_started", (channel_id: string) => {
    const Room = socketIO.to(channel_id);
    gameStarted = true;
    Room.emit("game_started");
  });

  socket.on(
    "user_leave_request",
    ({ user_id, channel_id }: { user_id: string; channel_id: string }) => {
      const usersRoom = users[channel_id] || [];
      const user = usersRoom.find((user) => user.user_id == user_id);
      if (!user) return;
      users[channel_id] = usersRoom.filter((user) => user.user_id != user_id);
      const Room = socketIO.to(channel_id);
      if (users[channel_id].length < 1) {
        channelQuestion[channel_id].currentQuestionIndex = 0;
        Room.emit("receive_current_question_index", 0);
      }
      Room.emit("users_state_refreshed", users[channel_id]);
      socket.emit("leave_request_success", user);
      socket.leave(channel_id);
    }
  );

  socket.on("show_winner_and_next_question", (payload: WinnerPlayload) => {
    const { channel_id, user_id, nextQuestionIndex, questionId } = payload;
    let usersRoom = users[channel_id] || [];
    const Room = socketIO.to(channel_id);
    const channelQuestionSelected = channelQuestion[channel_id];
    const updatedUser = usersRoom.find(
      (user) => user.user_id === payload.user_id
    );

    if (!updatedUser) return;

    updatedUser.point += 5;

    usersRoom = usersRoom.map((user) => {
      if (user.user_id != user_id) {
        return user;
      } else {
        return updatedUser;
      }
    });

    users[socket.id] = usersRoom;
    channelQuestionSelected.currentQuestionIndex = nextQuestionIndex;

    if (channelQuestionSelected.currentQuestionIndex == 56) {
      channelQuestionSelected.currentQuestionIndex = 0;
      Room.emit("game_finished");
      gameStarted = false;
    } else {
      Room.emit(
        "receive_current_question_index",
        channelQuestionSelected.currentQuestionIndex
      );
    }
    const response = {
      nextQuestionIndex,
      winner: updatedUser,
      questionId,
    };

    Room.emit("show_winner_and_next_question", response);
    Room.emit("users_state_refreshed", usersRoom);
  });

  socket.on(
    "change_user_point",
    (payload: { plus: boolean; user_id: string; channel_id: string }) => {
      let usersRoom = users[payload.channel_id] || [];
      const updatedUser = usersRoom.find(
        (user) => user.user_id === payload.user_id
      );
      if (!updatedUser) return;
      if (!payload.plus && updatedUser.point > 0) {
        updatedUser.point -= 5;
      }
      usersRoom = usersRoom.map((user) => {
        if (user.user_id != payload.user_id) {
          return user;
        } else {
          return updatedUser;
        }
      });
      users[socket.id] = usersRoom;
      const Room = socketIO.to(payload.channel_id);
      Room.emit("users_state_refreshed", usersRoom);
    }
  );
});

app.use(cors());
app.get("/", (_, res) => {
  return res.send("hello");
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT} `);
});
