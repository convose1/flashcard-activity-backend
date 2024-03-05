import express from "express";
const app = express();

const users = {};
let selectedQuestionId = 0;
let currentQuestionNum = 1;
let gameStarted = false;
//New imports
const http = require("http").Server(app);
const cors = require("cors");
const socketIO = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
  },
});
//Add this before the app.get() block
socketIO.on("connection", (socket) => {
  socket.emit("users_state_refreshed", users);
  socket.emit("receive_init_question_id", selectedQuestionId);
  socket.emit("receive_current_question_number", currentQuestionNum);
  socket.emit("receive_game_state", gameStarted);
  socket.on("disconnect", () => {
    delete users[socket.id];
    socket.emit("users_state_refreshed", users);
  });
  socket.on("user_join_request", (userInfo) => {
    const channel_id = userInfo.channel_id;
    //join user to room
    socket.join(channel_id);
    const user = Object.assign(Object.assign({}, userInfo), {
      joined: true,
      point: 0,
    });
    if (users[socket.id]) {
      users[socket.id] = [user];
    } else {
      users[socket.id].push(user);
    }
    console.log("userInfo===", userInfo);
    const usersRoom = users[socket.id];
    const Room = socket.to(channel_id);
    socket.emit("join_request_success", user);
    socket.emit("users_state_refreshed", usersRoom);
    Room.emit("users_state_refreshed", usersRoom);
  });
  socket.on("game_started", (channel_id) => {
    const Room = socket.to(channel_id);
    gameStarted = true;
    Room.emit("game_started");
  });
  socket.on("user_leave_request", ({ user_id, channel_id }) => {
    const usersRoom = users[channel_id];
    const user = usersRoom.find((user) => user.user_id == user_id);
    users[channel_id] = usersRoom.filter((user) => user.user_id != user_id);
    const Room = socket.to(channel_id);
    socket.emit("leave_request_success", user);
    Room.emit("users_state_refreshed", usersRoom);
  });
  socket.on("show_winner_and_next_question", (payload) => {
    const { channel_id } = payload;
    const usersRoom = users[channel_id];
    const Room = socket.to(channel_id);
    const updatedUser = usersRoom.find(
      (user) => user.user_id === payload.user_id
    );
    if (!updatedUser) return;
    updatedUser.point += 5;
    currentQuestionNum++;
    selectedQuestionId = payload.nextQuestionId;
    if (currentQuestionNum == 16) {
      currentQuestionNum = 0;
      Room.emit("game_finished");
      gameStarted = false;
    } else {
      Room.emit("receive_current_question_number", currentQuestionNum);
    }
    Room.emit("show_winner_and_next_question", {
      nextQuestionId: payload.nextQuestionId,
      winner: updatedUser,
      answer: payload.answer,
    });
  });
  socket.on("change_user_point", (payload) => {
    let usersRoom = users[socket.id];
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
    const Room = socket.to(payload.channel_id);
    Room.emit("users_state_refreshed", usersRoom);
  });
});
app.use(cors());
app.get("/api", (_, res) => {
  return res.json({
    message: "Hello world",
  });
});
app.get("/", (_, res) => {
  return res.send("hello");
});
http.listen(process.env.PORT || 4000, () => {
  console.log(`Server listening `);
});
//# sourceMappingURL=index.js.map
