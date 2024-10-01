let currentThreadId = null;
let currentUsers = [];

async function initializeMessageCenter() {
    await loadThreads();
    await loadFriendRequests();
    setupNewMessageForm();
    setupEventListeners();
}

async function loadThreads() {
    const threads = await fetchRequest('/get_threads', { osis: currentUserOsis });
    const sidebarThreads = document.getElementById('sidebar-threads');
    sidebarThreads.innerHTML = '';

    threads.forEach(thread => {
        const threadElement = createThreadElement(thread);
        sidebarThreads.appendChild(threadElement);
    });
}

function createThreadElement(thread) {
    const threadElement = document.createElement('div');
    threadElement.className = 'thread-item';
    threadElement.textContent = thread.name || thread.participants.join(', ');
    threadElement.onclick = () => loadThread(thread.id);
    return threadElement;
}

async function loadThread(threadId) {
    currentThreadId = threadId;
    const messages = await fetchRequest('/get_messages', { threadId });
    const users = await fetchRequest('/get_users', { userIds: messages.map(m => m.sender) });
    currentUsers = users;

    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';

    messages.forEach(message => {
        const messageElement = createMessageElement(message, users);
        chatBox.appendChild(messageElement);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

function createMessageElement(message, users) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';

    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = users.find(u => u.osis === message.sender).first_name;
    messageElement.appendChild(senderElement);

    const contentElement = document.createElement('div');
    contentElement.className = 'content';

    if (message.text.includes('file:')) {
        const fileId = message.text.slice(-7);
        getFile(fileId).then(([image, type]) => {
            if (type === 'pdf') {
                const pdfElement = createPdfElement(image);
                contentElement.appendChild(pdfElement);
            } else {
                const imageElement = createImageElement(image);
                contentElement.appendChild(imageElement);
            }
        });
    } else {
        contentElement.textContent = message.text;
    }

    messageElement.appendChild(contentElement);

    const reactionsElement = createReactionsElement(message);
    messageElement.appendChild(reactionsElement);

    return messageElement;
}

function createPdfElement(pdfData) {
    const pdfElement = document.createElement('a');
    const pdfBlob = base64ToBlob(pdfData, 'application/pdf');
    const url = URL.createObjectURL(pdfBlob);
    pdfElement.href = url;
    pdfElement.textContent = 'Open PDF ➡️';
    pdfElement.target = '_blank';
    pdfElement.className = 'pdf';
    return pdfElement;
}

function createImageElement(imageData) {
    const imageElement = document.createElement('img');
    imageElement.src = imageData;
    imageElement.className = 'message-image';
    return imageElement;
}

function createReactionsElement(message) {
    const reactionsElement = document.createElement('div');
    reactionsElement.className = 'reactions';

    const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    reactions.forEach(reaction => {
        const reactionButton = document.createElement('button');
        reactionButton.className = 'reaction-button';
        reactionButton.textContent = reaction;
        reactionButton.onclick = () => addReaction(message.id, reaction);
        reactionsElement.appendChild(reactionButton);
    });

    return reactionsElement;
}

async function addReaction(messageId, reaction) {
    await fetchRequest('/add_reaction', { messageId, reaction, osis: currentUserOsis });
    await loadThread(currentThreadId);
}

function setupNewMessageForm() {
    const newMessageForm = document.getElementById('new-message-form');
    newMessageForm.onsubmit = async (e) => {
        e.preventDefault();
        const recipients = document.getElementById('recipients').value.split(',').map(r => r.trim());
        const message = document.getElementById('new-message').value;
        await fetchRequest('/create_thread', { recipients, message, osis: currentUserOsis });
        await loadThreads();
        newMessageForm.reset();
    };
}

function setupEventListeners() {
    const sendButton = document.getElementById('send-button');
    sendButton.addEventListener('click', sendMessage);

    const inputField = document.getElementById('message-input');
    inputField.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    const uploadInput = document.getElementById('upload');
    uploadInput.addEventListener('change', handleFileUpload);
}

async function sendMessage() {
    const inputField = document.getElementById('message-input');
    const message = inputField.value;
    inputField.value = '';

    if (message || document.getElementById('upload').files.length > 0) {
        const chat = {
            text: message,
            threadId: currentThreadId,
            sender: currentUserOsis,
            id: Math.floor(Math.random() * 10000),
            timestamp: Date.now()
        };

        await postMessage(chat);
        await loadThread(currentThreadId);
    }
}

async function handleFileUpload(event) {
    if (event.target.files.length > 0) {
        const file = event.target.files[0];
        const base64 = await getBase64(file);
        const fileId = Math.floor(Math.random() * 9000000) + 1000000;
        await uploadFile(base64, fileId);

        const chat = {
            text: `file: ${fileId}`,
            threadId: currentThreadId,
            sender: currentUserOsis,
            id: Math.floor(Math.random() * 10000),
            timestamp: Date.now()
        };

        await postMessage(chat);
        await loadThread(currentThreadId);
        event.target.value = '';
    }
}

async function loadFriendRequests() {
    const friendRequests = await fetchRequest('/get_friend_requests', { osis: currentUserOsis });
    const friendRequestsContainer = document.getElementById('friend-requests');
    friendRequestsContainer.innerHTML = '';

    friendRequests.forEach(request => {
        const requestElement = createFriendRequestElement(request);
        friendRequestsContainer.appendChild(requestElement);
    });
}

function createFriendRequestElement(request) {
    const requestElement = document.createElement('div');
    requestElement.className = 'friend-request';
    
    const nameElement = document.createElement('span');
    nameElement.textContent = `${request.first_name} ${request.last_name}`;
    requestElement.appendChild(nameElement);

    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.onclick = () => handleFriendRequest(request.id, 'accept');
    requestElement.appendChild(acceptButton);

    const rejectButton = document.createElement('button');
    rejectButton.textContent = 'Reject';
    rejectButton.onclick = () => handleFriendRequest(request.id, 'reject');
    requestElement.appendChild(rejectButton);

    return requestElement;
}

async function handleFriendRequest(requestId, action) {
    await fetchRequest('/handle_friend_request', { requestId, action, osis: currentUserOsis });
    await loadFriendRequests();
}

// Initialize the message center when the page loads
document.addEventListener('DOMContentLoaded', initializeMessageCenter);