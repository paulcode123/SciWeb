document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('infiniteContainer');
    const canvas = document.getElementById('edgeCanvas');
    const ctx = canvas.getContext('2d');
    const contextMenu = document.getElementById('contextMenu');
    const modal = document.getElementById('nodeModal');
    const closeBtn = modal.querySelector('.close-btn');
    const saveBtn = document.getElementById('saveNodeBtn');
    const nodeNameInput = document.getElementById('nodeName');
    const nodeTypeSelect = document.getElementById('nodeType');
    
    let circles = document.querySelectorAll('.circle');
    let activeCircle = null;
    let initialX;
    let initialY;
    let edges = [];
    let isAddingEdge = false;
    let isDeleteMode = false;
    let selectedNode = null;
    let nextNodeId = 11;
    let hoveredEdge = null;
    let editingNode = null;
    let isDragging = false;
    let dragStartTime = 0;

    // Set canvas size
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawEdges();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize edges for the tree structure
    initializeDefaultEdges();

    // Initialize controls
    document.getElementById('addNodeBtn').addEventListener('click', addNewNode);
    document.getElementById('addEdgeBtn').addEventListener('click', startAddingEdge);
    document.getElementById('cancelEdgeBtn').addEventListener('click', cancelAddingEdge);
    document.getElementById('deleteBtn').addEventListener('click', toggleDeleteMode);

    // Modal event listeners
    closeBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveNodeChanges);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    // Initialize drag events for existing circles
    initializeCircles();

    // Context menu event listeners
    document.addEventListener('click', hideContextMenu);
    document.getElementById('deleteNode').addEventListener('click', handleDeleteNode);
    document.getElementById('deleteEdges').addEventListener('click', handleDeleteEdges);

    function initializeDefaultEdges() {
        // Level 1 to 2
        edges.push({ from: '1', to: '2' });
        edges.push({ from: '1', to: '3' });
        // Level 2 to 3
        edges.push({ from: '2', to: '4' });
        edges.push({ from: '2', to: '5' });
        edges.push({ from: '3', to: '6' });
        edges.push({ from: '3', to: '7' });
        // Level 3 to 4
        edges.push({ from: '4', to: '8' });
        edges.push({ from: '5', to: '9' });
        edges.push({ from: '6', to: '10' });
    }

    function initializeCircles() {
        circles = document.querySelectorAll('.circle');
        circles.forEach(circle => {
            circle.addEventListener('mousedown', startDragging);
            circle.addEventListener('touchstart', startDragging, { passive: false });
            circle.addEventListener('contextmenu', showContextMenu);
        });
    }

    function startDragging(e) {
        if (isAddingEdge || isDeleteMode) return;
        e.preventDefault();
        e.stopPropagation();
        
        activeCircle = this;
        isDragging = false;
        dragStartTime = Date.now();
        
        const event = e.type === 'mousedown' ? e : e.touches[0];
        const rect = activeCircle.getBoundingClientRect();
        
        initialX = event.clientX - rect.left;
        initialY = event.clientY - rect.top;

        if (e.type === 'mousedown') {
            window.addEventListener('mousemove', drag);
            window.addEventListener('mouseup', stopDragging);
        } else {
            window.addEventListener('touchmove', drag, { passive: false });
            window.addEventListener('touchend', stopDragging);
        }

        activeCircle.classList.add('dragging');
    }

    function drag(e) {
        if (!activeCircle) return;
        e.preventDefault();
        e.stopPropagation();

        const event = e.type === 'mousemove' ? e : e.touches[0];
        const rect = container.getBoundingClientRect();

        // If not yet dragging, check if we should start
        if (!isDragging) {
            const moveThreshold = 5; // pixels
            const deltaX = Math.abs(event.clientX - (initialX + activeCircle.getBoundingClientRect().left));
            const deltaY = Math.abs(event.clientY - (initialY + activeCircle.getBoundingClientRect().top));
            
            if (deltaX > moveThreshold || deltaY > moveThreshold) {
                isDragging = true;
            }
        }

        if (isDragging) {
            const x = event.clientX - rect.left - initialX + container.scrollLeft;
            const y = event.clientY - rect.top - initialY + container.scrollTop;

            activeCircle.style.left = `${x}px`;
            activeCircle.style.top = `${y}px`;

            // Throttle edge redrawing for better performance
            if (!drag.throttled) {
                drag.throttled = true;
                requestAnimationFrame(() => {
                    drawEdges();
                    drag.throttled = false;
                });
            }
        }
    }

    function stopDragging(e) {
        if (!activeCircle) return;
        
        window.removeEventListener('mousemove', drag);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('touchmove', drag);
        window.removeEventListener('touchend', stopDragging);

        activeCircle.classList.remove('dragging');

        // Only trigger click if it wasn't a drag and it was a short interaction
        if (!isDragging && Date.now() - dragStartTime < 200) {
            openNodeEditor.call(activeCircle, e);
        }

        activeCircle = null;
        isDragging = false;
        drawEdges();
    }

    function drawEdges() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        edges.forEach(edge => {
            const fromNode = document.querySelector(`.circle[data-id="${edge.from}"]`);
            const toNode = document.querySelector(`.circle[data-id="${edge.to}"]`);
            
            if (fromNode && toNode) {
                const fromRect = fromNode.getBoundingClientRect();
                const toRect = toNode.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                const fromX = fromRect.left - containerRect.left + fromRect.width/2 + container.scrollLeft;
                const fromY = fromRect.top - containerRect.top + fromRect.height/2 + container.scrollTop;
                const toX = toRect.left - containerRect.left + toRect.width/2 + container.scrollLeft;
                const toY = toRect.top - containerRect.top + toRect.height/2 + container.scrollTop;

                if (isDeleteMode && hoveredEdge && 
                    hoveredEdge.from === edge.from && 
                    hoveredEdge.to === edge.to) {
                    ctx.strokeStyle = '#ff4444';
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                }

                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.stroke();
            }
        });
    }

    function addNewNode() {
        const nodeId = nextNodeId++;
        const circle = document.createElement('div');
        circle.className = 'circle';
        circle.draggable = true;
        circle.dataset.id = nodeId;
        circle.dataset.type = 'Task';

        const span = document.createElement('span');
        span.textContent = `Task ${nodeId}`;
        circle.appendChild(span);

        // Add orbital dots container
        const orbitalDots = document.createElement('div');
        orbitalDots.className = 'orbital-dots';
        for (let i = 0; i < 4; i++) {
            const dot = document.createElement('div');
            dot.className = 'orbital-dot';
            orbitalDots.appendChild(dot);
        }
        circle.appendChild(orbitalDots);

        const x = (container.clientWidth / 2) - 60;
        const y = (container.clientHeight / 2) - 60 + container.scrollTop;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;

        container.appendChild(circle);
        initializeCircles();
        drawEdges();
        
        // Open editor for new node
        openNodeEditor.call(circle);
    }

    function openNodeEditor(e) {
        if (isAddingEdge || isDeleteMode) return;
        if (e) e.preventDefault();
        
        editingNode = this;
        const name = this.querySelector('span').textContent;
        const type = this.dataset.type;

        // Update basic fields
        nodeNameInput.value = name;
        nodeTypeSelect.value = type;
        
        // Update type selector UI
        document.querySelectorAll('.type-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.type === type);
        });

        // Show/hide date notification section based on type
        const dateNotificationSection = document.getElementById('dateNotificationSection');
        dateNotificationSection.classList.toggle('show', type !== 'Motivator');

        // Load existing dates and notifications if any
        if (type !== 'Motivator') {
            document.getElementById('deadline').value = editingNode.dataset.deadline || '';
            document.getElementById('targetDate').value = editingNode.dataset.targetDate || '';
            document.getElementById('notificationText').value = editingNode.dataset.notificationText || '';
            
            // Clear existing notification times
            const timeList = document.getElementById('notificationTimeList');
            timeList.innerHTML = '';
            
            // Load saved notification times
            try {
                const times = JSON.parse(editingNode.dataset.notificationTimes || '[]');
                times.forEach(time => addNotificationTimeItem(time));
            } catch (e) {
                console.error('Error loading notification times:', e);
            }
        }

        // Load chat history if it exists
        const chatHistory = document.getElementById('chatHistory');
        chatHistory.innerHTML = '';
        try {
            const messages = JSON.parse(editingNode.dataset.chatHistory || '[]');
            messages.forEach(msg => addChatMessage(msg.text, msg.type));
        } catch (e) {
            console.error('Error loading chat history:', e);
        }

        modal.classList.add('show');
        initializeChat();
    }

    function closeModal() {
        modal.classList.remove('show');
        editingNode = null;
    }

    function saveNodeChanges() {
        if (!editingNode) return;

        const newName = nodeNameInput.value.trim();
        const newType = nodeTypeSelect.value;

        if (newName) {
            editingNode.querySelector('span').textContent = newName;
            editingNode.dataset.type = newType;
            
            // Save dates and notifications for Task and Goal types
            if (newType !== 'Motivator') {
                editingNode.dataset.deadline = document.getElementById('deadline').value;
                editingNode.dataset.targetDate = document.getElementById('targetDate').value;
                editingNode.dataset.notificationText = document.getElementById('notificationText').value;
                
                // Save notification times
                const times = Array.from(document.querySelectorAll('.notification-time'))
                    .map(input => input.value)
                    .filter(time => time);
                editingNode.dataset.notificationTimes = JSON.stringify(times);
            } else {
                delete editingNode.dataset.deadline;
                delete editingNode.dataset.targetDate;
                delete editingNode.dataset.notificationText;
                delete editingNode.dataset.notificationTimes;
            }

            // Save chat history
            const messages = Array.from(document.querySelectorAll('.chat-message')).map(msg => ({
                text: msg.querySelector('.message-text').textContent,
                type: msg.classList.contains('user-message') ? 'user' : 'ai'
            }));
            editingNode.dataset.chatHistory = JSON.stringify(messages);
            
            // Handle orbital dots for Goal type
            let orbitalDots = editingNode.querySelector('.orbital-dots');
            if (newType === 'Goal' && !orbitalDots) {
                orbitalDots = document.createElement('div');
                orbitalDots.className = 'orbital-dots';
                for (let i = 0; i < 4; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'orbital-dot';
                    orbitalDots.appendChild(dot);
                }
                editingNode.appendChild(orbitalDots);
            } else if (newType !== 'Goal' && orbitalDots) {
                orbitalDots.remove();
            }
        }

        closeModal();
    }

    function startAddingEdge() {
        isAddingEdge = true;
        document.getElementById('addEdgeBtn').style.display = 'none';
        document.getElementById('cancelEdgeBtn').style.display = 'inline-block';
        container.style.cursor = 'pointer';
    }

    function cancelAddingEdge() {
        isAddingEdge = false;
        selectedNode = null;
        document.getElementById('addEdgeBtn').style.display = 'inline-block';
        document.getElementById('cancelEdgeBtn').style.display = 'none';
        container.style.cursor = 'default';
        circles.forEach(circle => circle.classList.remove('selected'));
    }

    function toggleDeleteMode() {
        isDeleteMode = !isDeleteMode;
        const deleteBtn = document.getElementById('deleteBtn');
        deleteBtn.classList.toggle('active');
        
        circles.forEach(circle => {
            circle.classList.toggle('delete-mode');
        });

        if (!isDeleteMode) {
            hoveredEdge = null;
            drawEdges();
        }
    }

    function handleNodeClick(e) {
        if (isDeleteMode) {
            e.preventDefault();
            deleteNode(this.dataset.id);
            return;
        }
        
        if (!isAddingEdge) {
            openNodeEditor.call(this, e);
            return;
        }
        
        const clickedNode = this;
        const clickedId = clickedNode.dataset.id;

        if (!selectedNode) {
            selectedNode = clickedNode;
            clickedNode.classList.add('selected');
        } else {
            const fromId = selectedNode.dataset.id;
            if (fromId !== clickedId) {
                edges.push({ from: fromId, to: clickedId });
                drawEdges();
            }
            cancelAddingEdge();
        }
    }

    function showContextMenu(e) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        contextMenu.style.display = 'block';
        contextMenu.style.left = (e.clientX - rect.left + container.scrollLeft) + 'px';
        contextMenu.style.top = (e.clientY - rect.top + container.scrollTop) + 'px';
        selectedNode = this;
    }

    function hideContextMenu() {
        contextMenu.style.display = 'none';
    }

    function handleDeleteNode() {
        if (selectedNode) {
            deleteNode(selectedNode.dataset.id);
            hideContextMenu();
        }
    }

    function handleDeleteEdges() {
        if (selectedNode) {
            deleteConnectedEdges(selectedNode.dataset.id);
            hideContextMenu();
        }
    }

    function deleteNode(nodeId) {
        const node = document.querySelector(`.circle[data-id="${nodeId}"]`);
        if (node) {
            deleteConnectedEdges(nodeId);
            node.remove();
            drawEdges();
        }
    }

    function deleteConnectedEdges(nodeId) {
        edges = edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
        drawEdges();
    }

    // Edge hover detection for delete mode
    canvas.addEventListener('mousemove', function(e) {
        if (!isDeleteMode) return;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + container.scrollLeft;
        const mouseY = e.clientY - rect.top + container.scrollTop;

        hoveredEdge = null;
        edges.forEach(edge => {
            const fromNode = document.querySelector(`.circle[data-id="${edge.from}"]`);
            const toNode = document.querySelector(`.circle[data-id="${edge.to}"]`);
            
            if (fromNode && toNode) {
                const fromRect = fromNode.getBoundingClientRect();
                const toRect = toNode.getBoundingClientRect();
                
                const fromX = fromRect.left - rect.left + fromRect.width/2 + container.scrollLeft;
                const fromY = fromRect.top - rect.top + fromRect.height/2 + container.scrollTop;
                const toX = toRect.left - rect.left + toRect.width/2 + container.scrollLeft;
                const toY = toRect.top - rect.top + toRect.height/2 + container.scrollTop;

                if (isPointNearLine(mouseX, mouseY, fromX, fromY, toX, toY)) {
                    hoveredEdge = edge;
                }
            }
        });
        
        drawEdges();
    });

    canvas.addEventListener('click', function(e) {
        if (isDeleteMode && hoveredEdge) {
            edges = edges.filter(edge => 
                edge.from !== hoveredEdge.from || 
                edge.to !== hoveredEdge.to
            );
            hoveredEdge = null;
            drawEdges();
        }
    });

    function isPointNearLine(px, py, x1, y1, x2, y2) {
        const lineLength = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
        const distance = Math.abs((y2-y1)*px - (x2-x1)*py + x2*y1 - y2*x1) / lineLength;
        return distance < 5;
    }

    // Initialize type selector with date/notification section toggle
    document.querySelectorAll('.type-option').forEach(option => {
        option.addEventListener('click', function() {
            // Update hidden input
            nodeTypeSelect.value = this.dataset.type;
            
            // Update UI
            document.querySelectorAll('.type-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');

            // Toggle date notification section
            const dateNotificationSection = document.getElementById('dateNotificationSection');
            dateNotificationSection.classList.toggle('show', this.dataset.type !== 'Motivator');
        });
    });

    // Initialize notification time functionality
    function addNotificationTimeItem(value = '') {
        const template = document.getElementById('notificationTimeTemplate');
        const clone = template.content.cloneNode(true);
        
        const timeInput = clone.querySelector('.notification-time');
        timeInput.value = value;
        
        const removeBtn = clone.querySelector('.remove-time-btn');
        removeBtn.addEventListener('click', function() {
            this.closest('.notification-time-item').remove();
        });
        
        document.getElementById('notificationTimeList').appendChild(clone);
    }

    document.getElementById('addNotificationTime').addEventListener('click', () => {
        addNotificationTimeItem();
    });

    // Initialize chat functionality
    function initializeChat() {
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessage');

        function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;

            // Add user message
            addChatMessage(message, 'user');
            chatInput.value = '';

            // Show typing indicator
            showTypingIndicator();

            // Simulate AI response after a delay
            setTimeout(() => {
                hideTypingIndicator();
                addChatMessage('This is a simulated AI response to: ' + message, 'ai');
            }, 1500);
        }

        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    function addChatMessage(text, type) {
        const chatHistory = document.getElementById('chatHistory');
        const template = document.getElementById(type === 'user' ? 'userMessageTemplate' : 'aiMessageTemplate');
        const clone = template.content.cloneNode(true);

        clone.querySelector('.message-text').textContent = text;
        clone.querySelector('.message-time').textContent = new Date().toLocaleTimeString();

        chatHistory.appendChild(clone);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function showTypingIndicator() {
        const chatHistory = document.getElementById('chatHistory');
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatHistory.appendChild(indicator);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    drawEdges();
    container.addEventListener('scroll', drawEdges);
});
