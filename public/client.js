const socket = io();

// DOM 元素
const userList = document.getElementById('user-list');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message');
const sendButton = document.getElementById('send');

// 用戶資訊
let username = prompt("Enter your name:");
while (!username || username.trim() === "") {
    username = prompt("Name cannot be empty. Enter your name:");
}
const room = 'main';

// 通知伺服器加入房間
socket.emit('join-room', { room, username });

// 更新用戶列表
socket.on('update-participants', (participants) => {
    userList.innerHTML = '<strong>Users in the room:</strong>';
    participants.forEach(user => {
        const li = document.createElement('div');
        li.textContent = user.username;
        userList.appendChild(li);
    });
});

// 接收歷史訊息
socket.on('load-history', (history) => {
    history.forEach(({ username, message }) => {
        displayMessage(username, message);
    });
});

// 接收並顯示訊息
socket.on('receive-message', ({ username, message }) => {
    displayMessage(username, message);
});

// 發送訊息
sendButton.addEventListener('click', sendMessage);

// 監聽 Enter 鍵
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('send-message', { room, message, username });
        messageInput.value = '';
    }
}

function displayMessage(username, message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${username}: ${message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
