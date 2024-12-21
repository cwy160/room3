const socket = io();

const welcomeScreen = document.getElementById("welcome-screen");
const mainContainer = document.getElementById("main-container");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const sendButton = document.getElementById("send");

let username;

// 點擊進入，啟用音效功能
welcomeScreen.addEventListener("click", async () => {
    const context = new AudioContext();
    await context.resume(); // 確保音效允許播放
    setTimeout(() => {
        welcomeScreen.style.display = "none";
        mainContainer.style.display = "flex";

        username = prompt("請輸入三個1到7之間的數字組成的名稱：");
        while (!isValidUsername(username)) {
            username = prompt("名稱不符合規範或已被使用，請重新輸入三個1到7之間的數字：");
        }

        const room = "main";
        socket.emit("join-room", { room, username });
    }, 1800); // 延長1.5秒以便音效加載
});

socket.on("duplicate-name", () => {
    username = prompt("名稱已被使用，請重新輸入三個1到7之間的數字：");
    while (!isValidUsername(username)) {
        username = prompt("名稱不符合規範或已被使用，請重新輸入三個1到7之間的數字：");
    }
    socket.emit("join-room", { room: "main", username });
});

socket.on("update-participants", (participants) => {
    userList.innerHTML = "<strong>Users in the room:</strong>";
    participants.forEach((user) => {
        const li = document.createElement("div");
        li.textContent = user;
        userList.appendChild(li);
    });
});

socket.on("load-history", (history) => {
    history.forEach((message) => {
        displayMessage(message);
    });
});

socket.on("receive-message", (message) => {
    displayMessage(message);
});

socket.on("play-sound", (numbersSequence) => {
    playSound(numbersSequence);
});

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

function playSound(numbersSequence) {
    const context = new AudioContext();
    context.resume(); // 確保播放權限
    let time = context.currentTime;

    numbersSequence.forEach((num) => {
        const osc = context.createOscillator();
        const gainNode = context.createGain();

        osc.type = "triangle";
        osc.frequency.value = 440 * Math.pow(2, (num - 4) / 12);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.8, time + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, time + 0.2);

        osc.connect(gainNode).connect(context.destination);
        osc.start(time);
        osc.stop(time + 0.2);

        time += 0.75;
    });
}
