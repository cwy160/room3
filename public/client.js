const socket = io();

const welcomeScreen = document.getElementById("welcome-screen");
const mainContainer = document.getElementById("main-container");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const sendButton = document.getElementById("send");

let username;
let audioContext; // 全局的 AudioContext
let gainNode; // 全局的增益節點

// 初始化音效功能
function initAudio() {
    if (!audioContext) {
        audioContext = new AudioContext();
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3; // 設置初始音量
        gainNode.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") {
        audioContext.resume(); // 確保音效可用
    }
}

// 播放音效
function playSound(numbersSequence) {
    initAudio(); // 確保音效功能已啟用
    let time = audioContext.currentTime;

    numbersSequence.forEach((num) => {
        const osc = audioContext.createOscillator();

        osc.type = "triangle"; // 三角波
        osc.frequency.value = 440 * Math.pow(2, (num + 12) / 12); // 根據數字計算音高

        osc.connect(gainNode); // 振盪器通過增益節點輸出音效
        osc.start(time);
        osc.stop(time + 0.1); // 短音符持續時間
        time += 0.15; // 間隔
    });
}

// 點擊進入，啟用音效功能
welcomeScreen.addEventListener("click", () => {
    initAudio(); // 初始化音效

    // 顯示主界面
    welcomeScreen.style.display = "none";
    mainContainer.style.display = "flex";

    username = prompt("請輸入三個1到7之間的數字組成的名稱：");
    while (!isValidUsername(username)) {
        username = prompt("名稱不符合規範或已被使用，請重新輸入三個1到7之間的數字：");
    }

    const room = "main";
    socket.emit("join-room", { room, username });
});

// 接收音效播放請求
socket.on("play-sound", (numbersSequence) => {
    playSound(numbersSequence);
});

// 接收重複名稱的錯誤提示
socket.on("duplicate-name", () => {
    username = prompt("名稱已被使用，請重新輸入三個1到7之間的數字：");
    while (!isValidUsername(username)) {
        username = prompt("名稱不符合規範或已被使用，請重新輸入三個1到7之間的數字：");
    }
    socket.emit("join-room", { room: "main", username });
});

// 更新參與者列表
socket.on("update-participants", (participants) => {
    userList.innerHTML = "<strong>Users in the room:</strong>";
    participants.forEach((user) => {
        const li = document.createElement("div");
        li.textContent = user;
        userList.appendChild(li);
    });
});

// 加載聊天歷史記錄
socket.on("load-history", (history) => {
    history.forEach((message) => {
        displayMessage(message);
    });
});

// 接收聊天訊息
socket.on("receive-message", (message) => {
    displayMessage(message);
});

// 發送聊天訊息
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit("send-message", { room: "main", username, message });
        messageInput.value = "";
    }
}

function displayMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function isValidUsername(name) {
    return /^[1-7]{3}$/.test(name);
}
