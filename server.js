const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ROBOT_NAME = "訪客123";
const rooms = {}; // 儲存房間內的參與者
const chatHistory = {}; // 儲存每個房間的聊天記錄
const userMap = {}; // 綁定用戶名稱與 socket ID
const NOTE_SEQUENCE_INTERVAL = 15000; // 聲音廣播間隔（15秒）


app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", ({ room, username }) => {
        // 初始化房間
        if (!rooms[room]) {
            rooms[room] = [ROBOT_NAME];
            chatHistory[room] = [];
        }

        // 添加 "訪客" 前綴
        const fullUsername = `訪客${username}`;

        // 檢查是否有重複名稱
        const isDuplicate = rooms[room].some((user) => user === fullUsername);
        if (isDuplicate) {
            socket.emit("duplicate-name");
            return; // 結束處理
        }

        // 綁定用戶名稱與 socket ID
        userMap[socket.id] = fullUsername;

        // 加入用戶到房間
        rooms[room].push(fullUsername);
        socket.join(room);

        // 更新參與者列表
        io.to(room).emit("update-participants", rooms[room]);

        // 播放新用戶的數字音高
        const userNumbers = username.match(/[1-7]/g)?.map(Number) || []; // 提取用戶名稱中的數字
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        const recentMessages = chatHistory[room].filter(
            (message) => message.timestamp >= fifteenMinutesAgo
        );
        socket.emit("load-history", recentMessages);

        // 傳送歷史聊天記錄
        socket.emit("load-history", chatHistory[room]);
    });

    socket.on("send-message", ({ room, username, message }) => {
        const timestamp = Date.now();
        const timeString = new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const fullUsername = `訪客${username}`;
        const userMessage = {
            text: `[${timeString}] ${fullUsername}: ${message}`,
            timestamp,
        };
        chatHistory[room].push(userMessage);
        io.to(room).emit("receive-message", userMessage);

        // 機器人回覆邏輯
        if (Math.random() < 0.3) {
            setTimeout(() => {
                const botTimestamp = new Date();
                const botTimeString = botTimestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); // AM/PM 格式
                const botResponse = {
                    text: `[${botTimeString}] ${ROBOT_NAME}: ${generateBotReply(message)}`,
                    timestamp: botTimestamp.getTime(),
                };
                chatHistory[room].push(botResponse);
                io.to(room).emit("receive-message", botResponse.text);
            }, Math.random() * 3000 + 1000);
        }
    });

    socket.on("disconnect", () => {
        const username = userMap[socket.id];

        if (!username) {
            console.warn(`Disconnected user not found in userMap: ${socket.id}`);
            return; // 如果無法找到對應用戶名稱，直接返回
        }

        console.log(`User disconnected: ${username}`);

        // 移除用戶並更新房間參與者列表
        for (const room in rooms) {
            rooms[room] = rooms[room].filter((user) => user !== username);
            io.to(room).emit("update-participants", rooms[room]);
        }

        // 從 userMap 中刪除
        delete userMap[socket.id];
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

// 每15秒廣播一次聲音播放指令
let soundQueue = []; // 初始化聲音序列隊列
let currentIndex = 0; // 追踪目前播放的起始索引

setInterval(() => {
    for (const room in rooms) {
        const participants = rooms[room];

        // 更新聲音序列隊列（從訪客名稱提取數字）
        soundQueue = participants.flatMap((username) =>
            username.match(/[1-7]/g)?.map(Number) || []
        );

        // 若隊列非空，提取並播放當前的三個數字
        if (soundQueue.length > 0) {
            if (currentIndex + 3 > soundQueue.length) {
                currentIndex = 0; // 重設為頭部
            }

            const sequenceToPlay = soundQueue.slice(currentIndex, currentIndex + 3); // 提取三個數字
            currentIndex += 3; // 移動索引

            console.log(`廣播聲音到房間 ${room}:`, sequenceToPlay);
            io.to(room).emit("play-sound", sequenceToPlay);
        }
    }
}, NOTE_SEQUENCE_INTERVAL);


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});