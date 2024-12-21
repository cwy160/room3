const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ROBOT_NAME = "QR";
const rooms = {}; // 儲存房間內的參與者
const chatHistory = {}; // 儲存每個房間的聊天記錄
const userMap = {}; // 綁定用戶名稱與 socket ID

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", ({ room, username }) => {
        if (!rooms[room]) {
            rooms[room] = [ROBOT_NAME];
            chatHistory[room] = [];
        }

        const fullUsername = `訪客${username}`;
        const isDuplicate = rooms[room].some((user) => user === fullUsername);
        if (isDuplicate) {
            socket.emit("duplicate-name");
            return;
        }

        userMap[socket.id] = fullUsername;
        rooms[room].push(fullUsername);
        socket.join(room);
        io.to(room).emit("update-participants", rooms[room]);
        const userNumbers = username.match(/[1-7]/g).map(Number);
        io.to(room).emit("play-sound", userNumbers);
        socket.emit("load-history", chatHistory[room]);
    });

    socket.on("send-message", ({ room, username, message }) => {
        const fullUsername = `訪客${username}`;
        const userMessage = `${fullUsername}: ${message}`;
        chatHistory[room].push(userMessage);
        io.to(room).emit("receive-message", userMessage);

        if (Math.random() < 0.3) {
            setTimeout(() => {
                const botResponse = `${ROBOT_NAME}: ${generateBotReply(message)}`;
                chatHistory[room].push(botResponse);
                io.to(room).emit("receive-message", botResponse);
            }, Math.random() * 3000 + 1000);
        }
    });

    socket.on("disconnect", () => {
        for (const room in rooms) {
            const username = userMap[socket.id];
            if (username) {
                rooms[room] = rooms[room].filter((user) => user !== username);
                io.to(room).emit("update-participants", rooms[room]);
            }
        }
        delete userMap[socket.id];
        console.log(`User disconnected: ${socket.id}`);
    });
});

function generateBotReply(message) {
    const replies = [
        "這很有趣！",
        "我不太明白你的意思。",
        "能說得更詳細些嗎？",
        "真的嗎？",
        "我覺得你說得很好。",
        "嗯……我需要再想一想。",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
