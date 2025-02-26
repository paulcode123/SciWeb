// Initialize chat functionality
let lastMessageTimestamp = 0;
let currentUser = null; // Add current user storage

async function main() {
    try {
        const data = await fetchRequest('/data', {data: "Leagues, Name, Users, Chat"});
        const league_id = window.location.href.split('/').pop();
        const leagueData = data['Leagues'].find(league => league['id'] == league_id);
        
        if (!leagueData) {
            console.error('League not found');
            return;
        }

        // Store current user
        currentUser = data['Name'];

        // Initialize all components
        await Promise.all([
            set_leaderboards(leagueData),
            set_graph(leagueData),
            set_class_img(leagueData['img']),
            add_user_bubbles(leagueData, data['Users'])
        ]);

        // Set up design elements
        setImageEl(leagueData, "Leagues");
        set_color_EL("Leagues", leagueData);
        show_Join(currentUser, leagueData, "Leagues");

        // Set up chat functionality
        initializeChat(league_id, currentUser, data['Chat'], data['Users']);

        // Hide loading wheel
        document.getElementById("loadingWheel").style.display = "none";
    } catch (error) {
        console.error('Error in main:', error);
    }
}

// Initialize chat functionality
function initializeChat(leagueId, userData, chatData, users) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear');
    const refreshButton = document.getElementById('refresh-chat');
    const fileUpload = document.getElementById('upload');

    if (!messageInput || !sendButton) {
        console.error('Chat elements not found');
        return;
    }

    // Send message on button click or enter key
    sendButton.addEventListener('click', () => sendMessage(leagueId, userData, users));
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(leagueId, userData, users);
        }
    });

    // Clear message
    clearButton?.addEventListener('click', () => {
        messageInput.value = '';
        messageInput.focus();
    });

    // Refresh chat
    refreshButton?.addEventListener('click', () => refreshChatData(leagueId, users));

    // Handle file upload
    fileUpload?.addEventListener('change', handleFileUpload);

    // Initial chat load
    if (chatData && Array.isArray(chatData)) {
        displayExistingMessages(chatData, leagueId, users);
    }
    
    // Start auto-refresh
    setInterval(() => refreshChatData(leagueId, users), 5000);
}

// Send a chat message
async function sendMessage(leagueId, userData, users) {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message || !userData) return;

    try {
        // Create message data
        const messageData = {
            id: Math.random().toString(36).substr(2, 9),
            OSIS: userData.osis,
            location: leagueId,
            sender: userData.osis,
            text: message,
            timestamp: Date.now()
        };

        // Post to database
        const response = await fetchRequest('/post_data', {
            sheet: "Chat",
            data: messageData
        });

        if (response && response.message === "success") {
            messageInput.value = '';
            messageInput.focus();
            
            // Clear cache for Chat sheet to ensure fresh data
            localStorage.removeItem('Chat');
            
            // Immediately display the new message
            displayExistingMessages([messageData], leagueId, users, true);
            
            // Then refresh to get any other new messages
            await refreshChatData(leagueId, users);
        } else {
            console.error('Failed to send message:', response?.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Refresh chat data
async function refreshChatData(leagueId, users) {
    try {
        // Clear cache to get fresh data
        localStorage.removeItem('Chat');
        
        const data = await fetchRequest('/data', {data: "Chat"});
        if (data && data.Chat) {
            displayExistingMessages(data.Chat, leagueId, users);
        }
    } catch (error) {
        console.error('Error refreshing chat:', error);
    }
}

// Display existing messages
function displayExistingMessages(chatData, leagueId, users, isNewMessage = false) {
    if (!Array.isArray(chatData)) {
        console.error('Invalid chat data format');
        return;
    }

    // Filter messages for this league and sort by timestamp
    const leagueMessages = chatData
        .filter(msg => msg.location === leagueId)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Clear existing messages before displaying
    const messageList = document.getElementById('message-list');
    if (messageList) {
        messageList.innerHTML = '';
    }

    updateChatDisplay(leagueMessages, users, isNewMessage);
}

// Update chat display
function updateChatDisplay(messages, users, isNewMessage = false) {
    const messageList = document.getElementById('message-list');
    if (!messageList) {
        console.error('Message list element not found');
        return;
    }

    const wasScrolledToBottom = messageList.scrollHeight - messageList.scrollTop === messageList.clientHeight;
    
    messages.forEach(msg => {
        if (!msg || !msg.id) return;

        // Check if message already exists
        const existingMessage = document.querySelector(`[data-message-id="${msg.id}"]`);
        if (existingMessage) return;

        const sender = users.find(u => u.osis == msg.sender);
        const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown';

        const li = document.createElement('li');
        li.className = 'chat-message';
        li.dataset.messageId = msg.id;
        
        // Add 'own-message' class if the message is from the current user
        if (currentUser && msg.sender === currentUser.osis) {
            li.classList.add('own-message');
        }
        
        const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        li.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${escapeHtml(senderName)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${formatMessage(msg.text || '')}</div>
        `;
        messageList.appendChild(li);
    });

    // Auto-scroll if was at bottom before adding new messages or if it's a new message
    if (wasScrolledToBottom || isNewMessage) {
        messageList.scrollTop = messageList.scrollHeight;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Format message content (handle links, emojis, etc.)
function formatMessage(text) {
    if (typeof text !== 'string') {
        console.error('Invalid message text:', text);
        return '';
    }

    // Escape HTML first
    text = escapeHtml(text);

    // Convert URLs to clickable links
    text = text.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert image URLs to image elements
    text = text.replace(
        /(https?:\/\/[^\s]+\.(?:jpg|jpeg|gif|png))/gi,
        '<img src="$1" alt="Shared image" class="chat-image">'
    );
    
    return text;
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const base64 = await getBase64(file);
        const response = await fetchRequest('/upload_chat_file', {
            file: base64,
            name: file.name
        });

        if (response.url) {
            const messageInput = document.getElementById('message-input');
            messageInput.value += ` ${response.url}`;
            messageInput.focus();
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

// Set up leaderboards
function set_leaderboards(leagueData) {
    const leaderboards = ['RIlb', 'Glb', 'GPAlb'];
    
    leaderboards.forEach(lbId => {
        if (!leagueData[lbId]) return;

        try {
            let lbData = JSON.parse(leagueData[lbId].replace(/'/g, '"'));
            const lbElement = document.getElementById(lbId);
            if (!lbElement) return;

            lbElement.style.display = 'block';
            
            // Convert values to numbers and sort
            const sortedData = Object.entries(lbData)
                .map(([key, value]) => [key, parseFloat(value)])
                .sort(([,a], [,b]) => b - a);

            // Update table
            const tbody = lbElement.querySelector('tbody');
            sortedData.forEach(([name, score], index) => {
                if (index < tbody.children.length) {
                    tbody.children[index].children[1].textContent = name;
                    tbody.children[index].children[2].textContent = score.toFixed(2);
                }
            });
        } catch (error) {
            console.error(`Error setting up ${lbId} leaderboard:`, error);
        }
    });
}

// Set up grades over time chart
function set_graph(leagueData) {
    if (!leagueData.GOTC) return;

    try {
        const data = JSON.parse(leagueData.GOTC.replace(/'/g, '"'));
        const dates = data.dates
            .replace(/\n/g, '')
            .slice(1, -1)
            .split(' ')
            .filter(Boolean);

        const labels = dates.map(date => 
            new Date((date - 719163) * 86400000).toISOString().split('T')[0]
        );

        const datasets = Object.entries(data)
            .filter(([key]) => key !== 'dates')
            .map(([key, values]) => ({
                label: key,
                data: values,
                fill: false,
                borderColor: getRandomColor(),
                tension: 0.1
            }));

        const config = {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'Grades Over Time'
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'day' },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Grade'
                        }
                    }
                }
            }
        };

        const ctx = document.getElementById('myChart').getContext('2d');
        new Chart(ctx, config);
    } catch (error) {
        console.error('Error setting up graph:', error);
    }
}

// Generate random color for graph lines
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Start the application
main();