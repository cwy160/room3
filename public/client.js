const socket = io();

const welcomeScreen = document.getElementById("welcome-screen");
const mainContainer = document.getElementById("main-container");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const sendButton = document.getElementById("send");

let username;
let audioContext; // 音效上下文
let visitorList = []; // 访客音效列表
let currentVisitorIndex = 0; // 当前音效播放的访客索引

// 初始化音效功能
function initAudio() {
    if (!audioContext) {
        audioContext = new AudioContext();
        console.log("AudioContext 初始化成功");
    }
    if (audioContext.state === "suspended") {
        audioContext.resume()
            .then(() => {
                console.log("AudioContext 恢复成功！");
            })
            .catch((err) => {
                console.error("无法恢复 AudioContext:", err);
            });
    }
}

// 播放音效
function playSound(numbersSequence) {
    initAudio();
    if (!audioContext) {
        console.error("音效播放失败：AudioContext 未初始化！");
        return;
    }

    let time = audioContext.currentTime;

    numbersSequence.forEach((num) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.type = "sine"; // 设置为清脆的波形
        osc.frequency.value = 440 * Math.pow(2, (num - 4) / 12); // 根据数字计算频率

        // 淡入淡出，避免杂音
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.8, time + 0.02); // 快速淡入
        gainNode.gain.linearRampToValueAtTime(0, time + 0.2); // 快速淡出

        osc.connect(gainNode).connect(audioContext.destination);
        osc.start(time);
        osc.stop(time + 0.2); // 短音符持续时间

        time += 0.75; // 每个音符间隔
    });

    console.log(`播放音效：${numbersSequence}`);
}

// 点击进入，启用音效功能
welcomeScreen.addEventListener("click", () => {
    initAudio();

    welcomeScreen.style.display = "none";
    mainContainer.style.display = "flex";

    username = prompt("請輸入三個1到7之間的數字組成的名稱：");
    while (!isValidUsername(username)) {
        username = prompt("名稱不符合規範或已被使用，請重新輸入三個1到7之間的數字：");
    }

    const room = "main";
    socket.emit("join-room", { room, username });
});

// 更新参与者列表
socket.on("update-participants", (participants) => {
    userList.innerHTML = "<strong>Users in the room:</strong>";
    visitorList = []; // 重置访客音效列表

    participants.forEach((user) => {
        const li = document.createElement("div");
        li.textContent = user;
        userList.appendChild(li);

        const numbers = user.match(/[1-7]/g).map(Number); // 提取访客名称中的数字
        visitorList.push(numbers);
    });

    console.log("更新访客列表：", visitorList);
});

// 加载聊天历史
socket.on("load-history", (history) => {
    history.forEach((message) => {
        displayMessage(message);
    });
});

// 接收聊天消息
socket.on("receive-message", (message) => {
    displayMessage(message);
});

// 定时触发音效播放
function startTimedSoundPlayback() {
    const calculateDelay = () => {
        const currentTime = new Date();
        const seconds = currentTime.getSeconds();
        const milliseconds = currentTime.getMilliseconds();
        const nextTriggerInSeconds = 20 - (seconds % 20);
        const delay = nextTriggerInSeconds * 1000 - milliseconds;

        console.log(`距离下一次音效播放的时间：${delay} 毫秒`);
        return delay;
    };

    setTimeout(() => {
        setInterval(() => {
            if (visitorList.length > 0) {
                playSound(visitorList[currentVisitorIndex]);

                // 循环播放下一个访客
                currentVisitorIndex = (currentVisitorIndex + 1) % visitorList.length;
            } else {
                console.log("访客列表为空，无法播放音效。");
            }
        }, 20000); // 每隔20秒触发
    }, calculateDelay());
}

// 启动音效定时播放
startTimedSoundPlayback();

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
