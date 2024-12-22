// 服務端代碼 (server.js)
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
            return;
        }

        // 綁定用戶名稱與 socket ID
        userMap[socket.id] = fullUsername;

        // 加入用戶到房間
        rooms[room].push(fullUsername);
        socket.join(room);

        // 更新參與者列表
        io.to(room).emit("update-participants", rooms[room]);

        // 播放新用戶的數字音高
        const userNumbers = username.match(/[1-7]/g).map(Number); // 提取用戶名稱中的數字
        io.to(room).emit("play-sound", userNumbers);

        // 傳送歷史聊天記錄
        socket.emit("load-history", chatHistory[room]);
    });

    socket.on("send-message", ({ room, username, message }) => {
        const fullUsername = `訪客${username}`;
        const userMessage = `${fullUsername}: ${message}`;
        chatHistory[room].push(userMessage);
        io.to(room).emit("receive-message", userMessage);

        // 機器人回應
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

// 前端代碼 (public/script.js)
function playSound(numbersSequence) {
    const context = new AudioContext();
    const gainNode = context.createGain(); // 創建增益節點
    gainNode.gain.value = 0.3; // 設置音量，範圍為 0 到 1，調整到更舒適的值
    gainNode.connect(context.destination);

    let time = context.currentTime;

    numbersSequence.forEach((num) => {
        const osc = context.createOscillator();
        osc.type = "triangle"; // 設定波形類型
        osc.frequency.value = 440 * Math.pow(2, (num + 12) / 12); // 計算音高（Hz）
        osc.connect(gainNode); // 將振盪器連接到增益節點
        osc.start(time);
        osc.stop(time + 0.1); // 每個音符持續 0.1 秒
        time += 0.75; // 每個音符間隔 0.15 秒
    });
    setInterval(() => {
        const currentTime = Date.now();
        const soundSequence = [1, 3, 5, 7]; // 示例统一声音序列
        io.emit("play-sound", { timestamp: currentTime, sequence: soundSequence });
        console.log(`广播play-sound事件：时间戳 ${currentTime}, 序列 ${soundSequence}`);
    }, 20000);
    
}