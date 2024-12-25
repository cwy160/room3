const socket = io();
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatBox = document.getElementById("chat-box");

const username = prompt("請輸入您的名字:");

socket.emit("join-room", { room: "main", username });

// 音頻相關變數
let audioContext;
const noteFrequencies = {
    1: 523.26, // Do 高八度
    2: 587.32, // Re 高八度
    3: 659.26, // Mi 高八度
    4: 698.46, // Fa 高八度
    5: 784.00, // Sol 高八度
    6: 880.00, // La 高八度
    7: 987.76  // Si 高八度
};

// 初始化音頻上下文
function initAudio() {
    if (!audioContext) {
        audioContext = new AudioContext();
        console.log("AudioContext 已初始化");
    }
    if (audioContext.state === "suspended") {
        audioContext.resume()
            .then(() => console.log("AudioContext 恢复成功"))
            .catch((err) => console.error(`无法恢复 AudioContext: ${err}`));
    }
}

// 播放聲音
function playSound(numbersSequence) {
    initAudio();
    if (!audioContext || audioContext.state !== "running") {
        console.error("音效播放失败：AudioContext 未运行！");
        return;
    }

    let time = audioContext.currentTime;

    numbersSequence.forEach((num) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.type = "sawtooth";  // 改為鋸齒波，模擬鐵琴聲
        osc.frequency.value = noteFrequencies[num] || 440; // 預設頻率為 A4
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(1.0, time + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, time + 0.2);

        osc.connect(gainNode).connect(audioContext.destination);
        osc.start(time);
        osc.stop(time + 0.2);

        time += 0.5; // 每個音符間隔 0.5 秒
    });
}

// 顯示訊息
function displayMessage(message) {
    console.log("Displaying message:", message); // 確保這裡的 message 是文字
    const messageElement = document.createElement("div");
    messageElement.textContent = message; // 確保這裡傳遞的 message 是文字內容
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 設置 1 分鐘後自動刪除
    setTimeout(() => {
        if (messageElement.parentNode) {
            chatBox.removeChild(messageElement);
        }
    }, 15 * 60 * 1000); // 設置 1 分鐘後刪除訊息
}

// 接收歷史訊息
socket.on("load-history", (messages) => {
    messages.forEach((msg) => {
        displayMessage(msg.text, msg.timestamp);
    });
});

// 接收即時訊息
socket.on("receive-message", (msg) => {
    try {
        const messageText = typeof msg === "string" ? msg : msg.text;
        if (messageText) {
            displayMessage(messageText);
        } else {
            throw new Error("Message format is invalid");
        }
    } catch (error) {
        console.error("Invalid message received:", msg, error);
    }
});

// 接收伺服器廣播的聲音播放指令
socket.on("play-sound", (numbersSequence) => {
    console.log("接收到播放指令，聲音序列：", numbersSequence);
    playSound(numbersSequence);
});

// 發送訊息
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
