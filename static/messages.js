var current_location;
var current_recipients;
var current_chat;
var location_to_recipients={}
var users;

document.addEventListener('DOMContentLoaded', function() {
    getData().then(data => {
        console.log(data);
        DisplayThreads(data);
    });

    // Add event listeners
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    document.getElementById('refresh-chat').addEventListener('click', refresh);
    document.getElementById('upload').addEventListener('change', handleFileUpload);
    document.getElementById('clear').addEventListener('click', clearInput);

});

function toggleSection(sectionId) {
    const list = document.getElementById(`${sectionId}-list`);
    list.classList.toggle('active');
}

async function refresh(){
    console.log("refreshing...")
    data = await fetchRequest('/data', { data: "FILTERED Chat"});
    current_chat = data.Chat;
    receive_messages(data.Chat, users, current_location);
}

function isThreadSet(){
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get('thread');
    if (threadId) {
        console.log(current_chat)
        displayChat(threadId, location_to_recipients[threadId], current_chat);
    }
}

async function getData(){
    return await fetchRequest('/data', { data: "FILTERED Classes, FILTERED Leagues, FILTERED Friends, Users, FILTERED Chat" });
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

function sendMessage() {
    console.log('Sending message...');
    var message = '';
    if (document.getElementById('upload').files.length > 0) {
        let image = document.getElementById('upload').files[0];
        getBase64(image).then(base64 => {
            let id = Math.floor(Math.random() * 9000000) + 1000000;
            message = "file: " + id;
            uploadFile(base64, id);

            document.getElementById('upload').value = '';
            let chat = {
                text: message,
                location: classId,
                sender: osis,
                OSIS: current_class.OSIS,
                id: Math.floor(Math.random() * 10000),
                timestamp: Date.now()
            }
            post_message(chat);
            document.getElementById('image-container').innerHTML = '';
        }).catch(error => {
            console.error(error);
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
    var response = await fetchRequest('/get-file', {file: fileId});
    let file = response.file;
    let type;
    if(file.includes('pngbase64')){
        type = 'png';
        file = file.replace('dataimage/pngbase64', 'data:image/png;base64,');
        file = file.slice(0, -1);
    } else if(file.includes('jpegbase64')){
        type = 'jpeg';
        file = file.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
    } else if(file.includes('pdfbase64')){
        type = 'pdf';
        file = file.replace('dataapplication/pdfbase64', 'data:application/pdf;base64,');
    } else {
        console.log('Error: File type not supported', file);
    }
    return [file, type];
}

async function uploadFile(xfile, id) {
    var data = await fetchRequest('/upload-file', {file: xfile, name: id});
    return data;
}

function base64ToBlob(base64, type = 'application/octet-stream') {
    base64 = base64.split('base64,')[1];
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], {type});
}



