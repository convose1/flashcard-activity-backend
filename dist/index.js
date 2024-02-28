"use strict";
/* eslint-disable no-undef */
const express = require("express");
const path = require("path");
const app = express();
const PORT = 4000;
const users = [];
let autoUserId = 0;
let selectedQuestionId = 0;
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
    autoUserId++;
    users.push({
        userid: autoUserId,
        socketid: socket.id,
        avatar: "./assets/images/users/user" + autoUserId + ".png",
        name: "user" + autoUserId,
        email: "user" + autoUserId + "@gmail.com",
        point: 0,
        joined: false,
    });
    socket.emit("users_state_refreshed", users);
    socket.emit("receive_init_question_number", selectedQuestionId);
    socket.on("disconnect", () => {
        users.splice(users.findIndex((user) => user.socketid === socket.id), 1);
    });
    socket.on("user_join_request", () => {
        const user = users.find((row) => row.socketid === socket.id);
        if (user)
            user.joined = true;
        socket.emit("join_request_success", user);
        socket.emit("users_state_refreshed", users);
        socket.broadcast.emit("users_state_refreshed", users);
    });
    socket.on("user_leave_request", () => {
        const user = users.find((row) => row.socketid === socket.id);
        if (user)
            user.joined = false;
        socket.emit("leave_request_success", user);
        socket.emit("users_state_refreshed", users);
        socket.broadcast.emit("users_state_refreshed", users);
    });
    socket.on("show_winner_and_next_question", (param) => {
        const user = users.find((row) => row.socketid === socket.id);
        if (user) {
            user.point += 5;
            selectedQuestionId = param.nextQuestionId;
            socket.emit("show_winner_and_next_question", {
                nextQuestionId: param.nextQuestionId,
                winner: user,
                answer: param.answer,
            });
            socket.broadcast.emit("show_winner_and_next_question", {
                nextQuestionId: param.nextQuestionId,
                winner: user,
                answer: param.answer,
            });
        }
    });
    socket.on("change_user_point", (param) => {
        const user = users.find((row) => row.socketid === socket.id);
        if (user) {
            if (!param.plus && user.point > 0) {
                user.point -= 5;
            }
            socket.emit("users_state_refreshed", users);
            socket.broadcast.emit("users_state_refreshed", users);
        }
    });
});
app.use(cors());
app.get("/api", (req, res) => {
    res.json({
        message: "Hello world",
    });
});
app.use(express.static(path.resolve(__dirname, "./build")));
app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "./build", "index.html"));
});
http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
