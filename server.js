const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 保存每個房間的參與者和訊息記錄
const participants = {};
const messageHistory = {};

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // 用戶加入房間
    socket.on("join-room", ({ room, username }) => {
        socket.join(room);

        // 初始化房間的參與者與歷史訊息
        if (!participants[room]) participants[room] = [];
        if (!messageHistory[room]) messageHistory[room] = [];

        // 添加用戶到參與者清單
        participants[room].push({ id: socket.id, username });
        console.log(`${username} joined room: ${room}`);

        // 傳送歷史訊息給新用戶
        socket.emit("load-history", messageHistory[room]);

        // 更新房間的參與者列表
        io.to(room).emit("update-participants", participants[room]);
    });

    // 接收並廣播訊息
    socket.on("send-message", ({ room, message, username }) => {
        const msg = { username, message };

        // 保存訊息到歷史記錄
        if (!messageHistory[room]) messageHistory[room] = [];
        messageHistory[room].push(msg);

        // 廣播訊息給房間內的所有用戶
        io.to(room).emit("receive-message", msg);
    });

    // 用戶斷開連接
    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);

        // 從所有房間移除該用戶
        for (const room in participants) {
            participants[room] = participants[room].filter((user) => user.id !== socket.id);
            io.to(room).emit("update-participants", participants[room]);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
