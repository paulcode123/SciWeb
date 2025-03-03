var current_location;
var current_recipients;
var current_chat;
var location_to_recipients = {};
var users;
var folders = {
    all: { name: 'All Messages', icon: 'inbox' },
    unread: { name: 'Unread', icon: 'envelope', count: 0 },
    starred: { name: 'Starred', icon: 'star', messages: [] }
};
var currentFolder = 'all';
var searchQuery = '';
var dateFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    getData().then(data => {
        console.log(data);
        DisplayThreads(data);
    });
});

function initializeUI() {
    // Message input handlers
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // File upload handler
    document.getElementById('upload').addEventListener('change', handleFileUpload);
    
    // Search and filter handlers
    document.getElementById('message-search').addEventListener('input', handleSearch);
    document.getElementById('date-filter').addEventListener('change', handleDateFilter);
    
    // Folder handlers
    document.getElementById('create-folder').addEventListener('click', showFolderModal);
    document.getElementById('folder-form').addEventListener('submit', handleCreateFolder);
    document.getElementById('cancel-folder').addEventListener('click', hideFolderModal);
    
    // Thread view handlers
    document.getElementById('thread-view').addEventListener('click', toggleThreadView);
    document.querySelector('.back-to-chat').addEventListener('click', closeThreadView);
    
    // Chat actions
    document.getElementById('star-chat').addEventListener('click', toggleStarChat);
    document.getElementById('move-to-folder').addEventListener('click', showFoldersList);
    
    // Utility buttons
    document.getElementById('refresh-chat').addEventListener('click', refresh);
    document.getElementById('clear').addEventListener('click', clearInput);
    document.getElementById('emoji-btn').addEventListener('click', toggleEmojiPicker);

    // Initialize folders
    loadFolders();
    
    // Start real-time updates
    initializeRealTimeUpdates();
}

async function refresh() {
    console.log("refreshing...");
    const data = await fetchRequest('/data', { data: "Chat" });
    current_chat = data.Chat;
    receive_messages(data.Chat, users, current_location);
    updateUnreadCount();
}

function handleSearch(event) {
    searchQuery = event.target.value.toLowerCase();
    filterMessages();
}

function handleDateFilter(event) {
    dateFilter = event.target.value;
    filterMessages();
}

function filterMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        const text = message.querySelector('.message-text').textContent.toLowerCase();
        const date = new Date(message.dataset.timestamp);
        const isVisible = shouldShowMessage(message, text, date);
        message.style.display = isVisible ? 'flex' : 'none';
    });
}

function shouldShowMessage(message, text, date) {
    // Search filter
    if (searchQuery && !text.includes(searchQuery)) {
        return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
        const now = new Date();
        switch (dateFilter) {
            case 'today':
                if (date.toDateString() !== now.toDateString()) return false;
                break;
            case 'week':
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                if (date < weekAgo) return false;
                break;
            case 'month':
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                if (date < monthAgo) return false;
                break;
        }
    }

    // Folder filter
    if (currentFolder !== 'all') {
        if (currentFolder === 'unread' && !message.classList.contains('unread')) return false;
        if (currentFolder === 'starred' && !message.classList.contains('starred')) return false;
        if (folders[currentFolder] && !folders[currentFolder].messages.includes(message.dataset.id)) return false;
    }

    return true;
}

function loadFolders() {
    const foldersList = document.getElementById('folders-list');
    foldersList.innerHTML = '';

    // Add default folders
    Object.entries(folders).forEach(([key, folder]) => {
        const button = createFolderButton(key, folder);
        foldersList.appendChild(button);
    });
}

function createFolderButton(key, folder) {
    const button = document.createElement('button');
    button.className = `folder-item ${currentFolder === key ? 'active' : ''}`;
    button.dataset.folder = key;
    button.innerHTML = `
        <i class="fas fa-${folder.icon}"></i>
        ${folder.name}
        ${folder.count ? `<span class="badge">${folder.count}</span>` : ''}
    `;
    button.onclick = () => switchFolder(key);
    return button;
}

function switchFolder(folderKey) {
    currentFolder = folderKey;
    document.querySelectorAll('.folder-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.folder === folderKey);
    });
    filterMessages();
}

function showFolderModal() {
    document.getElementById('folder-modal').classList.add('active');
}

function hideFolderModal() {
    document.getElementById('folder-modal').classList.remove('active');
}

function handleCreateFolder(event) {
    event.preventDefault();
    const name = document.getElementById('folder-name').value;
    const color = document.getElementById('folder-color').value;
    
    const folderKey = name.toLowerCase().replace(/\s+/g, '-');
    folders[folderKey] = {
        name: name,
        icon: 'folder',
        color: color,
        messages: []
    };
    
    loadFolders();
    hideFolderModal();
    event.target.reset();
}

function toggleThreadView() {
    const threadContainer = document.querySelector('.thread-container');
    threadContainer.classList.toggle('active');
    if (threadContainer.classList.contains('active')) {
        loadThreadMessages();
    }
}

function closeThreadView() {
    document.querySelector('.thread-container').classList.remove('active');
}

function loadThreadMessages() {
    const threadMessages = document.querySelector('.thread-messages');
    threadMessages.innerHTML = '';
    
    // Get messages in the current thread
    const messages = Array.from(document.querySelectorAll('.message'))
        .filter(msg => msg.dataset.threadId === current_location);
    
    messages.forEach(msg => {
        const clone = msg.cloneNode(true);
        threadMessages.appendChild(clone);
    });
}

function toggleStarChat() {
    const button = document.getElementById('star-chat');
    const isStarred = button.classList.toggle('active');
    
    if (isStarred) {
        folders.starred.messages.push(current_location);
        button.querySelector('i').classList.replace('far', 'fas');
    } else {
        const index = folders.starred.messages.indexOf(current_location);
        if (index > -1) folders.starred.messages.splice(index, 1);
        button.querySelector('i').classList.replace('fas', 'far');
    }
}

function showFoldersList() {
    // Create and show a dropdown of available folders
    const dropdown = document.createElement('div');
    dropdown.className = 'folder-dropdown';
    
    Object.entries(folders).forEach(([key, folder]) => {
        if (key !== 'all' && key !== 'unread') {
            const item = document.createElement('div');
            item.className = 'folder-dropdown-item';
            item.innerHTML = `<i class="fas fa-${folder.icon}"></i> ${folder.name}`;
            item.onclick = () => moveToFolder(key);
            dropdown.appendChild(item);
        }
    });
    
    const button = document.getElementById('move-to-folder');
    button.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && !button.contains(e.target)) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function moveToFolder(folderKey) {
    if (folders[folderKey]) {
        folders[folderKey].messages.push(current_location);
        showNotification(`Moved to ${folders[folderKey].name}`);
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleSection(sectionId) {
    const list = document.getElementById(`${sectionId}-list`);
    list.classList.toggle('active');
}

function isThreadSet(){
    const urlParams = new URLSearchParams(window.location.search);
    var threadId = urlParams.get('thread');
    if (threadId) {
        // if the threadId is 7 digits, then it is a friend thread and the threadId is the other person's OSIS. in this case, find the key in location_to_recipients that has the threadId as a substring
        if(threadId.length == 7){
            threadId = Object.keys(location_to_recipients).find(key => key.includes(threadId));
        }
        console.log(current_chat)
        displayChat(threadId, location_to_recipients[threadId], current_chat);
    }
}

async function getData(){
    return await fetchRequest('/data', { data: "Classes, Leagues, Friends, Users, Chat" });
}

function DisplayThreads(data) {
    let classes = data['Classes'];
    let leagues = data['Leagues'];
    let friends = data['Friends'];
    users = data['Users'];
    chat = data['Chat'];
    current_chat = chat;

    

    let classesList = document.getElementById('classes-list');
    let leaguesList = document.getElementById('leagues-list');
    let friendsList = document.getElementById('friends-list');

    // Clear existing list items
    classesList.innerHTML = '';
    leaguesList.innerHTML = '';
    friendsList.innerHTML = '';

    // Display Classes
    classes.forEach(cls => {
        const button = document.createElement('button');
        button.textContent = cls.name;
        button.threadId = cls.id;
        classesList.appendChild(button);
        button.onclick = () => displayChat(cls.id, cls.OSIS, chat);
        location_to_recipients[cls.id] = cls.OSIS;
    });

    // Display Leagues
    leagues.forEach(league => {
        const button = document.createElement('button');
        button.textContent = league.Name;
        button.threadId = league.id;
        leaguesList.appendChild(button);
        button.onclick = () => displayChat(league.id, league.OSIS, chat);
        location_to_recipients[league.id] = league.OSIS;
    });

    // Display Friends
    friends.forEach(friend => {
        if(friend.status == "accepted"){
            other_persons_osis = friend.targetOSIS == osis ? friend.OSIS : friend.targetOSIS;
            otherUser = users.find(user => user.osis == other_persons_osis);
            let combosis = otherUser.osis.toString()+osis.toString()
            let csvOsis = otherUser.osis.toString()+", "+osis.toString()
            const button = document.createElement('button');
            button.textContent = `${otherUser.first_name} ${otherUser.last_name}`;
            button.threadId = combosis;
            friendsList.appendChild(button);
            
            button.onclick = () => displayChat(combosis, csvOsis, chat);
            location_to_recipients[combosis] = csvOsis;
            console.log(osis, otherUser.osis)
        }
    });

    isThreadSet();
}

function displayChat(location, recipients, chat) {
    console.log("displaying chat:", location);
    const newUrl = `Messages?thread=${location}`;
    history.pushState({ thread: location }, '', newUrl);
    current_location = location;
    current_recipients = recipients;
    console.log(current_recipients);
    receive_messages(chat, users, location);

    // Highlight the active thread button
    const buttons = document.querySelectorAll('.sidebar-list button');
    buttons.forEach(button => {
        button.classList.remove('active-thread');
    });


    const activeButton = Array.from(buttons).find(button => button.threadId == location);
    if (activeButton) {
        activeButton.classList.add('active-thread');
    }
}

function receive_messages(messages, users, location) {
    var messageList = document.getElementById('message-list');
    clearMessages();
    messages.sort((a, b) => a.timestamp - b.timestamp);
    messages.forEach(message => {
        if (message.data) {
            message = message.data;
        }

        if(message.id==1373){
            console.log(message);
        }
        
        if ((message['location']).toString() == location.toString()) {
            let listItem = document.createElement('li');
            listItem.className = 'message';

            let senderElement = document.createElement('div');
            senderElement.className = 'sender';
            let senderName = 'default';
            
            for (let i = 0; i < users.length; i++) {
                if (users[i].osis == message.sender) {
                    senderName = users[i].first_name;
                    break;
                }
            }
            senderElement.textContent = senderName;

            let textElement = document.createElement('div');
            if (message.text.includes('file:')) {
                let id = message.text.slice(-7);
                getFile(id).then(([image, type]) => {
                    if(type == 'pdf'){
                        let pdfElement = document.createElement('a');
                        let pdfBlob = base64ToBlob(image, 'application/pdf');
                        let url = URL.createObjectURL(pdfBlob);
                        pdfElement.href = url;
                        pdfElement.textContent = 'Open PDF     ➡️';
                        pdfElement.target = '_blank';
                        pdfElement.className = 'pdf';
                        textElement.appendChild(pdfElement);
                    } else {
                        let imageElement = document.createElement('img');
                        imageElement.src = image;
                        imageElement.width = 120;
                        imageElement.height = 120;
                        textElement.appendChild(imageElement);
                    }
                });
            } else {
                textElement.textContent = message.text;
            }
            listItem.appendChild(senderElement);
            listItem.appendChild(textElement);
            messageList.appendChild(listItem);
        }
    });
    messageList.scrollTop = messageList.scrollHeight;
}

function clearMessages() {
    let messageList = document.getElementById('message-list');
    while (messageList.firstChild) {
        messageList.firstChild.remove();
    }
}

function cleanText(text) {
    const curseWords = ['fuck', 'shit', 'ass', 'bitch', 'nigger', 'nigga', 'faggot', 'retard', 'retarded', 'cunt', 'piss', 'pussy', 'dick', 'cock'];
    let ltext = text.toLowerCase();
    for (let i = 0; i < curseWords.length; i++) {
        if (ltext.includes(curseWords[i])) {
            alert('SciWeb supports academic communication and collaboration. Please be respectful and appropriate in your language. Thank you for your cooperation.');
            return false;
        }
    }
    return true;
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Don't strip the data URL prefix as we need it for proper file type detection
            let encoded = reader.result;
            resolve(encoded);
        };
        reader.onerror = error => reject(error);
    });
}

async function uploadFile(base64String, id) {
    try {
        // Split the base64 string into metadata and data
        const [header, data] = base64String.split(',');
        
        // Send only the base64 data, not the metadata prefix
        const response = await fetchRequest('/upload-file', {
            file: data,
            name: id.toString(),
            type: header.split(';')[0].split(':')[1] // Extract mime type
        });
        return true;
    } catch (error) {
        console.error('Error uploading file:', error);
        return false;
    }
}

function sendMessage() {
    console.log('Sending message...');
    var message = '';
    if (document.getElementById('upload').files.length > 0) {
        let file = document.getElementById('upload').files[0];
        getBase64(file).then(base64 => {
            let id = Math.floor(Math.random() * 9000000) + 1000000;
            message = "file: " + id;
            uploadFile(base64, id).then(success => {
                if (success) {
                    document.getElementById('upload').value = '';
                    let chat = {
                        text: message,
                        location: current_location,
                        sender: osis,
                        OSIS: current_recipients,
                        id: Math.floor(Math.random() * 10000),
                        timestamp: Date.now()
                    }
                    post_message(chat);
                    document.getElementById('image-container').innerHTML = '';
                } else {
                    alert('Failed to upload file. Please try again.');
                }
            });
        }).catch(error => {
            console.error('Error processing file:', error);
            alert('Error processing file. Please try again.');
        });
        return;
    }
    
    let inputField = document.getElementById('message-input');
    message = inputField.value;
    inputField.value = '';

    if (!cleanText(message)) {
        return;
    }
    
    let chat = {
        text: message,
        location: current_location,
        sender: osis,
        OSIS: current_recipients,
        id: Math.floor(Math.random() * 10000),
        timestamp: Date.now()
    }
    post_message(chat);
}

async function post_message(message){
    var a = await fetchRequest('/post_data', {sheet: 'Chat', data: message});
    refresh();
}


function handleFileUpload(event) {
    if (this.files && this.files.length > 0) {
        const file = this.files[0];
        renderImage(URL.createObjectURL(file));
    }
}

function clearInput() {
    document.getElementById('message-input').value = '';
    document.getElementById('upload').value = '';
    document.getElementById('image-container').innerHTML = '';
}

function renderImage(image) {
    const img = document.createElement('img');
    img.src = image;
    img.width = 60;
    img.height = 60;
    document.getElementById('image-container').appendChild(img);
}

async function getFile(fileId) {
    try {
        var response = await fetchRequest('/get-file', {file: fileId});
        let file = response.file;
        let type = response.type || 'application/octet-stream';
        
        // Reconstruct proper data URL
        return [`data:${type};base64,${file}`, type.split('/')[0]];
    } catch (error) {
        console.error('Error getting file:', error);
        return [null, null];
    }
}

function base64ToBlob(base64, type = 'application/octet-stream') {
    try {
        const [, data] = base64.split(',');
        const byteCharacters = atob(data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        
        return new Blob(byteArrays, { type });
    } catch (error) {
        console.error('Error converting base64 to blob:', error);
        return null;
    }
}

function initializeRealTimeUpdates() {
    setInterval(async () => {
        await refresh();
    }, 5000); // Poll every 5 seconds
}

function updateUnreadCount() {
    const unreadMessages = document.querySelectorAll('.message.unread').length;
    folders.unread.count = unreadMessages;
    document.querySelector('[data-folder="unread"] .badge').textContent = unreadMessages;
}



