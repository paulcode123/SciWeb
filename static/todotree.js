document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('infiniteContainer');
    const content = container.querySelector('.infinite-content');
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
    let currentTreeId = null;
    let isDragMode = false;

    // Add new variables for container management
    const EXPANSION_THRESHOLD = 50; // pixels from edge before expanding
    const EXPANSION_AMOUNT = 200; // pixels to expand by
    let containerWidth = 3000;
    let containerHeight = 3000;

    // Initialize container position
    function initializeContainer() {
        // Set initial content dimensions
        content.style.width = `${containerWidth}px`;
        content.style.height = `${containerHeight}px`;
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Center the viewport
        container.scrollLeft = (containerWidth - container.clientWidth) / 2;
        container.scrollTop = (containerHeight - container.clientHeight) / 2;

        // Position initial nodes in the center if they don't have positions set
        circles.forEach(circle => {
            if (!circle.style.left || !circle.style.top) {
                const centerX = containerWidth / 2;
                const centerY = containerHeight / 2;
                
                // Calculate offset based on node's data-id to create a nice spread
                const id = parseInt(circle.dataset.id);
                const angle = (id - 1) * (2 * Math.PI / 10); // Spread 10 nodes in a circle
                const radius = 200; // Increased radius for better spacing
                
                const x = centerX + radius * Math.cos(angle) - 60;
                const y = centerY + radius * Math.sin(angle) - 60;
                
                circle.style.left = `${x}px`;
                circle.style.top = `${y}px`;
            }
        });

        // Initial edge drawing
        drawEdges();
    }

    // Call on load
    initializeContainer();

    // Function to check and expand container if needed
    function checkAndExpandContainer() {
        let needsExpansion = false;
        let expandRight = false;
        let expandBottom = false;
        let expandLeft = false;
        let expandTop = false;

        // Check active node position if dragging
        if (activeCircle) {
            const rect = activeCircle.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate absolute position relative to container
            const absoluteX = parseFloat(activeCircle.style.left) || 0;
            const absoluteY = parseFloat(activeCircle.style.top) || 0;

            // Check if too close to edges
            if (containerWidth - absoluteX < EXPANSION_THRESHOLD + 120) { // Add node width
                expandRight = true;
                needsExpansion = true;
            }
            if (containerHeight - absoluteY < EXPANSION_THRESHOLD + 120) { // Add node height
                expandBottom = true;
                needsExpansion = true;
            }
            if (absoluteX < EXPANSION_THRESHOLD) {
                expandLeft = true;
                needsExpansion = true;
            }
            if (absoluteY < EXPANSION_THRESHOLD) {
                expandTop = true;
                needsExpansion = true;
            }
        }

        if (needsExpansion) {
            expandContainer(expandRight, expandBottom, expandLeft, expandTop);
        }
    }

    // Function to expand container
    function expandContainer(right, bottom, left, top) {
        const oldScrollLeft = container.scrollLeft;
        const oldScrollTop = container.scrollTop;

        if (right) {
            containerWidth += EXPANSION_AMOUNT;
        }
        if (bottom) {
            containerHeight += EXPANSION_AMOUNT;
        }

        // If expanding left or top, we need to adjust all node positions
        if (left) {
            containerWidth += EXPANSION_AMOUNT;
            circles.forEach(circle => {
                const currentLeft = parseInt(circle.style.left) || 0;
                circle.style.left = `${currentLeft + EXPANSION_AMOUNT}px`;
            });
            container.scrollLeft = oldScrollLeft + EXPANSION_AMOUNT;
        }
        if (top) {
            containerHeight += EXPANSION_AMOUNT;
            circles.forEach(circle => {
                const currentTop = parseInt(circle.style.top) || 0;
                circle.style.top = `${currentTop + EXPANSION_AMOUNT}px`;
            });
            container.scrollTop = oldScrollTop + EXPANSION_AMOUNT;
        }

        // Update container and canvas dimensions
        content.style.width = `${containerWidth}px`;
        content.style.height = `${containerHeight}px`;
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Redraw edges with new dimensions
        drawEdges();
    }

    // Set canvas size
    function resizeCanvas() {
        content.style.width = `${containerWidth}px`;
        content.style.height = `${containerHeight}px`;
        canvas.width = containerWidth;
        canvas.height = containerHeight;
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
    document.getElementById('dragModeBtn').addEventListener('click', toggleDragMode);

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
            circle.addEventListener('click', handleNodeClick);
        });
    }

    function toggleDragMode() {
        isDragMode = !isDragMode;
        const dragBtn = document.getElementById('dragModeBtn');
        dragBtn.classList.toggle('active');
        container.style.cursor = isDragMode ? 'move' : 'default';
        
        // Update all circles' cursor style
        circles.forEach(circle => {
            circle.style.cursor = isDragMode ? 'move' : 'pointer';
        });
        
        console.log(`Drag mode ${isDragMode ? 'enabled' : 'disabled'}`);
    }

    function startDragging(e) {
        if (!isDragMode || isAddingEdge || isDeleteMode) return;
        e.preventDefault();
        e.stopPropagation();
        
        activeCircle = this;
        isDragging = false;
        dragStartTime = Date.now();
        
        const event = e.type === 'mousedown' ? e : e.touches[0];
        const rect = activeCircle.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate click offset relative to the container
        initialX = event.clientX - containerRect.left - parseFloat(activeCircle.style.left || 0) + container.scrollLeft;
        initialY = event.clientY - containerRect.top - parseFloat(activeCircle.style.top || 0) + container.scrollTop;

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

        if (!isDragging) {
            const moveThreshold = 5;
            const deltaX = Math.abs(event.clientX - rect.left - parseFloat(activeCircle.style.left || 0));
            const deltaY = Math.abs(event.clientY - rect.top - parseFloat(activeCircle.style.top || 0));
            
            if (deltaX > moveThreshold || deltaY > moveThreshold) {
                isDragging = true;
            }
        }

        if (isDragging) {
            // Calculate new position relative to container
            const x = event.clientX - rect.left + container.scrollLeft - initialX;
            const y = event.clientY - rect.top + container.scrollTop - initialY;

            // Store the previous position
            const prevX = parseFloat(activeCircle.style.left) || 0;
            const prevY = parseFloat(activeCircle.style.top) || 0;

            activeCircle.style.left = `${x}px`;
            activeCircle.style.top = `${y}px`;

            // Only check for expansion and redraw if position actually changed
            if (x !== prevX || y !== prevY) {
                checkAndExpandContainer();

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
    }

    function stopDragging(e) {
        if (!activeCircle) return;
        
        window.removeEventListener('mousemove', drag);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('touchmove', drag);
        window.removeEventListener('touchend', stopDragging);

        activeCircle.classList.remove('dragging');

        // Always schedule auto-save if we were dragging
        if (isDragging) {
            scheduleAutoSave();
        }

        isDragging = false;
        activeCircle = null;
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

                // Draw grade goal indicator if node has one
                if (fromNode.dataset.gradeGoalClass) {
                    const centerX = fromX;
                    const centerY = fromY - fromRect.height/2 - 10;
                    
                    ctx.fillStyle = '#4CAF50';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
    }

    // Add this function at the top level
    function generateUniqueNodeId() {
        const existingIds = Array.from(document.querySelectorAll('.circle')).map(node => node.dataset.id);
        let newId;
        do {
            // Generate a random 8-digit number
            newId = Math.floor(10000000 + Math.random() * 90000000).toString();
        } while (existingIds.includes(newId));
        return newId;
    }

    function addNewNode() {
        const nodeId = generateUniqueNodeId();
        const circle = document.createElement('div');
        circle.className = 'circle';
        circle.draggable = true;
        circle.dataset.id = nodeId;
        circle.dataset.type = 'Task';

        const span = document.createElement('span');
        span.textContent = `Task ${nodeId.slice(-4)}`;
        circle.appendChild(span);

        content.appendChild(circle);
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
        const description = this.dataset.description || '';

        // Check if we came from the todo list
        const todoListState = sessionStorage.getItem('todoList_state');
        const showBackButton = todoListState && 
            (Date.now() - JSON.parse(todoListState).timestamp < 300000); // State is less than 5 minutes old

        // Update modal header to include back button if needed
        const modalHeader = modal.querySelector('.modal-header');
        if (!modalHeader) {
            console.error('Modal header not found');
            return;
        }
        
        modalHeader.innerHTML = `
            ${showBackButton ? `
                <button class="back-to-list-btn">
                    <span class="material-icons">arrow_back</span>
                    Back to List
                </button>
            ` : ''}
            <h2>Edit Node</h2>
            <button class="close-btn">&times;</button>
        `;

        // Re-add event listeners after updating header HTML
        const newCloseBtn = modalHeader.querySelector('.close-btn');
        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', closeModal);
        }

        // Add back button event listener if present
        if (showBackButton) {
            const backBtn = modalHeader.querySelector('.back-to-list-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    closeModal();
                    window.location.href = '/TodoList';
                });
            }
        }

        // Update basic fields
        const nodeNameInput = document.getElementById('nodeName');
        const nodeTypeSelect = document.getElementById('nodeType');
        const nodeDescriptionInput = document.getElementById('nodeDescription');
        
        if (!nodeNameInput || !nodeTypeSelect || !nodeDescriptionInput) {
            console.error('Required form elements not found');
            return;
        }

        nodeNameInput.value = name;
        nodeTypeSelect.value = type;
        nodeDescriptionInput.value = description;
        
        // Update type selector UI
        const typeOptions = document.querySelectorAll('.type-option');
        if (typeOptions.length > 0) {
            typeOptions.forEach(option => {
                option.classList.toggle('selected', option.dataset.type === type);
            });
        }

        // Show/hide date notification section based on type
        const dateNotificationSection = document.getElementById('dateNotificationSection');
        if (dateNotificationSection) {
            dateNotificationSection.classList.toggle('show', type !== 'Motivator');
        }

        // Load existing dates and check-ins if any
        if (type !== 'Motivator') {
            const deadlineInput = document.getElementById('deadline');
            const targetDateInput = document.getElementById('targetDate');
            const checkInList = document.getElementById('checkInDateList');
            
            if (deadlineInput) {
                deadlineInput.value = editingNode.dataset.deadline || '';
            }
            if (targetDateInput) {
                targetDateInput.value = editingNode.dataset.targetDate || '';
            }
            
            // Clear existing check-in dates
            if (checkInList) {
                checkInList.innerHTML = '';
                
                // Load saved check-in dates
                try {
                    const dates = JSON.parse(editingNode.dataset.checkInDates || '[]');
                    dates.forEach(date => addCheckInDateItem(date));
                } catch (e) {
                    console.error('Error loading check-in dates:', e);
                }
            }
        }

        // Initialize grade goal section
        updateGradeGoalSection(type);

        // Load chat history if it exists
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) {
            chatHistory.innerHTML = '';
            try {
                const messages = JSON.parse(editingNode.dataset.chatHistory || '[]');
                messages.forEach(msg => addChatMessage(msg.text, msg.type));
            } catch (e) {
                console.error('Error loading chat history:', e);
            }
        }

        modal.classList.add('show');
        initializeChat();
    }

    function closeModal() {
        modal.classList.remove('show');
        editingNode = null;
    }

    // Add validation function for check-in dates
    function validateCheckInDate(dateInput) {
        const selectedDate = new Date(dateInput.value);
        const now = new Date();
        
        if (selectedDate < now) {
            alert('Cannot set check-in dates in the past');
            dateInput.value = '';
            return false;
        }
        
        return true;
    }

    // Update saveNodeChanges to handle check-in dates
    function saveNodeChanges() {
        if (!editingNode) return;

        const newName = nodeNameInput.value.trim();
        const newType = nodeTypeSelect.value;
        const description = document.getElementById('nodeDescription').value.trim();

        if (newName) {
            editingNode.querySelector('span').textContent = newName;
            editingNode.dataset.type = newType;
            editingNode.dataset.description = description;
            
            // If this is a new node (no position set yet), position it at viewport center
            if (!editingNode.style.left || !editingNode.style.top) {
                const x = container.scrollLeft + (container.clientWidth / 2) - 60;
                const y = container.scrollTop + (container.clientHeight / 2) - 60;
                editingNode.style.left = `${x}px`;
                editingNode.style.top = `${y}px`;
            }
            
            // Save dates and check-ins for Task and Goal types
            if (newType !== 'Motivator') {
                const oldCheckInDates = JSON.parse(editingNode.dataset.checkInDates || '[]');
                const newCheckInDates = Array.from(document.querySelectorAll('.check-in-date'))
                    .map(input => input.value)
                    .filter(date => date);

                editingNode.dataset.deadline = document.getElementById('deadline').value;
                editingNode.dataset.targetDate = document.getElementById('targetDate').value;
                editingNode.dataset.checkInDates = JSON.stringify(newCheckInDates);
            } else {
                delete editingNode.dataset.deadline;
                delete editingNode.dataset.targetDate;
                delete editingNode.dataset.checkInDates;
            }

            // Save chat history
            const messages = Array.from(document.querySelectorAll('.chat-message')).map(msg => ({
                text: msg.querySelector('.message-text').textContent,
                type: msg.classList.contains('user-message') ? 'user' : 'ai'
            }));
            editingNode.dataset.chatHistory = JSON.stringify(messages);
            
            // Handle grade goal data if it's a Goal
            if (newType === 'Goal') {
                const gradeGoalClass = document.getElementById('gradeGoalClass').value;
                const gradeGoalTarget = document.getElementById('gradeGoalTarget').value;
                if (gradeGoalClass && gradeGoalTarget) {
                    editingNode.dataset.gradeGoalClass = gradeGoalClass;
                    editingNode.dataset.gradeGoalTarget = gradeGoalTarget;
                } else {
                    delete editingNode.dataset.gradeGoalClass;
                    delete editingNode.dataset.gradeGoalTarget;
                }
            } else {
                delete editingNode.dataset.gradeGoalClass;
                delete editingNode.dataset.gradeGoalTarget;
            }
        }

        scheduleAutoSave();
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

        container.classList.toggle('delete-mode', isDeleteMode);

        if (!isDeleteMode) {
            hoveredEdge = null;
            canvas.classList.remove('edge-hover');
            drawEdges();
        }
        
        console.log(`Delete mode ${isDeleteMode ? 'enabled' : 'disabled'}`);
    }

    function handleNodeClick(e) {
        if (isDragMode) return; // Prevent any click actions in drag mode
        
        if (isDeleteMode) {
            e.preventDefault();
            e.stopPropagation();
            deleteNode(this.dataset.id);
            return;
        }
        
        if (!isAddingEdge) {
            if (!isDragging) {
                openNodeEditor.call(this, e);
            }
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
                scheduleAutoSave();
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
            scheduleAutoSave();
            
            if (isDeleteMode) {
                toggleDeleteMode();
            }
            
            console.log(`Node ${nodeId} deleted successfully`);
        }
    }

    function deleteConnectedEdges(nodeId) {
        const originalLength = edges.length;
        edges = edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
        
        const removedCount = originalLength - edges.length;
        console.log(`Removed ${removedCount} edges connected to node ${nodeId}`);
        
        drawEdges();
    }

    // Add edge hover detection for delete mode
    canvas.addEventListener('mousemove', function(e) {
        if (!isDeleteMode) {
            hoveredEdge = null;
            canvas.classList.remove('edge-hover');
            return;
        }

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
                    canvas.classList.add('edge-hover');
                    return;
                }
            }
        });
        
        if (!hoveredEdge) {
            canvas.classList.remove('edge-hover');
        }
        
        drawEdges();
    });

    canvas.addEventListener('mouseleave', function() {
        if (isDeleteMode) {
            hoveredEdge = null;
            canvas.classList.remove('edge-hover');
            drawEdges();
        }
    });

    canvas.addEventListener('click', function(e) {
        if (isDeleteMode && hoveredEdge) {
            deleteEdge(hoveredEdge);
            hoveredEdge = null;
            drawEdges();
            scheduleAutoSave();
        }
    });

    function deleteEdge(edge) {
        edges = edges.filter(e => 
            !(e.from === edge.from && e.to === edge.to)
        );
        console.log(`Edge deleted: ${edge.from} -> ${edge.to}`);
    }

    function isPointNearLine(px, py, x1, y1, x2, y2) {
        const lineLength = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
        const distance = Math.abs((y2-y1)*px - (x2-x1)*py + x2*y1 - y2*x1) / lineLength;
        const threshold = 5;

        // Also check if point is within the bounding box of the line
        const minX = Math.min(x1, x2) - threshold;
        const maxX = Math.max(x1, x2) + threshold;
        const minY = Math.min(y1, y2) - threshold;
        const maxY = Math.max(y1, y2) + threshold;

        return distance < threshold && 
               px >= minX && px <= maxX &&
               py >= minY && py <= maxY;
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

            // Update grade goal section visibility
            updateGradeGoalSection(this.dataset.type);
        });
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

            // Get node context for AI
            const nodeContext = {
                type: editingNode.dataset.type,
                name: editingNode.querySelector('span').textContent,
                deadline: editingNode.dataset.deadline || null,
                targetDate: editingNode.dataset.targetDate || null,
                notificationText: editingNode.dataset.notificationText || null,
                notificationTimes: JSON.parse(editingNode.dataset.notificationTimes || '[]')
            };

            // Prepare messages for AI
            const messages = [
                {
                    role: "system",
                    content: `You are an AI assistant helping with a ${nodeContext.type} node named "${nodeContext.name}" in a TodoTree task management system. 
                    ${nodeContext.deadline ? `The deadline is ${nodeContext.deadline}.` : ''}
                    ${nodeContext.targetDate ? `The target date is ${nodeContext.targetDate}.` : ''}
                    ${nodeContext.notificationText ? `The notification text is: ${nodeContext.notificationText}` : ''}
                    ${nodeContext.notificationTimes.length > 0 ? `Notification times: ${nodeContext.notificationTimes.join(', ')}` : ''}
                    
                    For Tasks and Goals:
                    - Help break down complex tasks into smaller steps
                    - Suggest time management strategies
                    - Provide motivation and accountability tips
                    - Help set realistic deadlines and milestones
                    
                    For Motivators:
                    - Help clarify the motivation
                    - Suggest ways to stay inspired
                    - Connect the motivation to concrete actions
                    - Provide encouragement and perspective
                    
                    Be concise, practical, and encouraging in your responses.`
                },
                {
                    role: "user",
                    content: message
                }
            ];

            // Get chat history
            try {
                const history = JSON.parse(editingNode.dataset.chatHistory || '[]');
                // Add relevant history (last 5 messages)
                const recentHistory = history.slice(-10);
                recentHistory.forEach(msg => {
                    messages.splice(1, 0, {
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    });
                });
            } catch (e) {
                console.error('Error parsing chat history:', e);
            }

            // Send to backend
            fetchRequest('/AI', {
                data: messages
            }).then(response => {
                hideTypingIndicator();
                addChatMessage(response, 'ai');
                
                // Save chat history
                try {
                    const history = JSON.parse(editingNode.dataset.chatHistory || '[]');
                    history.push({ text: message, type: 'user', timestamp: new Date().toISOString() });
                    history.push({ text: response, type: 'ai', timestamp: new Date().toISOString() });
                    editingNode.dataset.chatHistory = JSON.stringify(history);
                    scheduleAutoSave();
                } catch (e) {
                    console.error('Error saving chat history:', e);
                }
            }).catch(error => {
                hideTypingIndicator();
                addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
                console.error('Error getting AI response:', error);
            });
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
        const messageText = clone.querySelector('.message-text');

        // Process markdown-style formatting in AI messages
        if (type === 'ai') {
            // Find all child nodes that were broken off from this text
            const childNodes = Array.from(document.querySelectorAll('.circle')).filter(node => {
                const breakOffText = node.dataset.breakOffText;
                return breakOffText && text.includes(breakOffText);
            });

            // Add markers for each break-off point
            childNodes.forEach(childNode => {
                const breakOffText = childNode.dataset.breakOffText;
                const markerHtml = `<span class="break-off-marker" data-node-id="${childNode.dataset.id}">
                    <span class="break-off-text">${breakOffText}</span>
                    <span class="material-icons break-off-icon" title="View broken-off task">call_split</span>
                </span>`;
                text = text.replace(breakOffText, markerHtml);
            });

            // Convert code blocks
            text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<div class="code-block${lang ? ' ' + lang : ''}">
                    <div class="code-header">
                        <span class="code-lang">${lang || 'plaintext'}</span>
                        <button class="copy-code" onclick="copyCode(this)">
                            <span class="material-icons">content_copy</span>
                        </button>
                    </div>
                    <pre><code>${escapeHtml(code.trim())}</code></pre>
                </div>`;
            });

            // Convert inline code
            text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

            // Convert bold text
            text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // Convert italic text
            text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

            // Convert bullet points
            text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
            text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

            // Convert numbered lists
            text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
            text = text.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
        }

        messageText.innerHTML = text;
        clone.querySelector('.message-time').textContent = new Date().toLocaleTimeString();

        // Add selection handling for AI messages
        if (type === 'ai') {
            messageText.addEventListener('mouseup', handleAIMessageSelection);
            messageText.addEventListener('mousedown', () => {
                // Remove any existing break task buttons when starting a new selection
                removeBreakTaskButton();
            });

            // Add click handlers for break-off markers
            messageText.querySelectorAll('.break-off-marker').forEach(marker => {
                marker.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const nodeId = marker.dataset.nodeId;
                    const childNode = document.querySelector(`.circle[data-id="${nodeId}"]`);
                    if (childNode) {
                        // Close current modal
                        closeModal();
                        // Open child node's modal
                        setTimeout(() => {
                            openNodeEditor.call(childNode);
                        }, 300); // Wait for current modal to close
                    }
                });
            });
        }

        chatHistory.appendChild(clone);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Initialize code copy buttons
        document.querySelectorAll('.copy-code').forEach(button => {
            button.addEventListener('click', function() {
                const codeBlock = this.closest('.code-block').querySelector('code');
                navigator.clipboard.writeText(codeBlock.textContent);
                
                // Show copied indicator
                const originalText = this.innerHTML;
                this.innerHTML = '<span class="material-icons">check</span>';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            });
        });
    }

    function handleAIMessageSelection(e) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Remove any existing break task buttons
        removeBreakTaskButton();
        
        if (selectedText) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Create button
            const button = document.createElement('button');
            button.className = 'break-task-button';
            button.innerHTML = '<span class="material-icons">call_split</span> Break off task';
            
            // Position the button near the selection
            button.style.position = 'fixed';
            button.style.left = `${rect.right + 10}px`;
            button.style.top = `${rect.top}px`;
            
            // Add click event listener
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                createBreakOffTask(selectedText);
                removeBreakTaskButton();
                selection.removeAllRanges();
            });
            
            document.body.appendChild(button);
            
            // Add global click listener to remove button when clicking elsewhere
            setTimeout(() => {
                document.addEventListener('click', handleGlobalClick);
            }, 0);
        }
    }

    function handleGlobalClick(e) {
        if (!e.target.closest('.break-task-button')) {
            removeBreakTaskButton();
            document.removeEventListener('click', handleGlobalClick);
        }
    }

    function removeBreakTaskButton() {
        const existingButton = document.querySelector('.break-task-button');
        if (existingButton) {
            existingButton.remove();
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    // Add auto-save functionality
    let saveTimeout;
    function scheduleAutoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        showSavingToast(); // Show indicator immediately
        saveTimeout = setTimeout(saveToDatabase, 5000); // Wait 5 seconds before saving
    }

    // Add these functions at the top level of the DOMContentLoaded callback
    function showSavingToast() {
        let toast = document.getElementById('savingToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'savingToast';
            toast.innerHTML = `
                <div class="saving-spinner"></div>
                <span>Saving...</span>
            `;
            document.body.appendChild(toast);
        }
        toast.classList.add('show');
    }

    function hideSavingToast() {
        const toast = document.getElementById('savingToast');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    async function saveToDatabase() {
        showSavingToast();
        
        // Collect all node data
        const nodes = Array.from(document.querySelectorAll('.circle')).map(node => {
            const rect = node.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate absolute position
            const x = parseFloat(node.style.left) || (rect.left - containerRect.left + container.scrollLeft);
            const y = parseFloat(node.style.top) || (rect.top - containerRect.top + container.scrollTop);
            
            // Build node data object
            const nodeData = {
                id: node.dataset.id,
                type: node.dataset.type,
                name: node.querySelector('span').textContent,
                description: node.dataset.description || '',
                position: { x, y }
            };

            // Add optional data if present
            if (node.dataset.deadline) nodeData.deadline = node.dataset.deadline;
            if (node.dataset.targetDate) nodeData.targetDate = node.dataset.targetDate;
            if (node.dataset.checkInDates) nodeData.checkInDates = JSON.parse(node.dataset.checkInDates);
            if (node.dataset.chatHistory) nodeData.chatHistory = JSON.parse(node.dataset.chatHistory);
            if (node.dataset.context) nodeData.context = node.dataset.context;
            if (node.dataset.breakOffText) nodeData.breakOffText = node.dataset.breakOffText;
            if (node.dataset.gradeGoalClass) {
                nodeData.gradeGoalClass = node.dataset.gradeGoalClass;
                nodeData.gradeGoalTarget = node.dataset.gradeGoalTarget;
            }

            return nodeData;
        });

        const treeData = {
            name: 'Task Tree',
            OSIS: osis,
            nodes: nodes,
            edges: edges,
            lastModified: new Date().toISOString()
        };

        try {
            if (currentTreeId) {
                // Update existing tree
                treeData.id = currentTreeId;
                await fetchRequest('/update_data', {
                    sheet: 'TodoTrees',
                    data: treeData,
                    row_name: 'id',
                    row_value: currentTreeId
                });
                console.log('Tree updated successfully');
            } else {
                // Create new tree
                treeData.id = Math.floor(10000 + Math.random() * 90000);
                currentTreeId = treeData.id;
                await fetchRequest('/post_data', {
                    sheet: 'TodoTrees',
                    data: treeData
                });
                console.log('New tree created successfully');
            }
        } catch (error) {
            console.error('Error saving tree:', error);
        }
        
        hideSavingToast();
    }

    async function loadFromDatabase() {
        startLoading();
        
        try {
            const data = await fetchRequest('/data', {
                data: 'TodoTrees'
            });
            console.log(data);
            if (!data.TodoTrees || !data.TodoTrees[0].nodes) {
                console.log('No saved tree found');
                endLoading();
                return;
            }

            // Store the tree ID
            currentTreeId = data.TodoTrees[0].id;

            // Clear existing nodes and edges
            content.querySelectorAll('.circle').forEach(node => node.remove());
            edges = [];

            // Create nodes with their saved positions
            data.TodoTrees[0].nodes.forEach(nodeData => {
                const circle = document.createElement('div');
                circle.className = 'circle';
                circle.draggable = true;
                circle.dataset.id = nodeData.id;
                circle.dataset.type = nodeData.type;

                // Set the exact position from saved data
                if (nodeData.position) {
                    circle.style.left = `${nodeData.position.x}px`;
                    circle.style.top = `${nodeData.position.y}px`;
                }

                // Add name span
                const span = document.createElement('span');
                span.textContent = nodeData.name;
                circle.appendChild(span);

                // Restore other data attributes
                if (nodeData.description) circle.dataset.description = nodeData.description;
                if (nodeData.deadline) circle.dataset.deadline = nodeData.deadline;
                if (nodeData.targetDate) circle.dataset.targetDate = nodeData.targetDate;
                if (nodeData.checkInDates) circle.dataset.checkInDates = JSON.stringify(nodeData.checkInDates);
                if (nodeData.chatHistory) circle.dataset.chatHistory = JSON.stringify(nodeData.chatHistory);
                if (nodeData.context) circle.dataset.context = nodeData.context;
                if (nodeData.breakOffText) circle.dataset.breakOffText = nodeData.breakOffText;
                if (nodeData.gradeGoalClass) {
                    circle.dataset.gradeGoalClass = nodeData.gradeGoalClass;
                    circle.dataset.gradeGoalTarget = nodeData.gradeGoalTarget;
                }

                // Add orbital dots for Goal type
                if (nodeData.type === 'Goal') {
                    const orbitalDots = document.createElement('div');
                    orbitalDots.className = 'orbital-dots';
                    for (let i = 0; i < 4; i++) {
                        const dot = document.createElement('div');
                        dot.className = 'orbital-dot';
                        orbitalDots.appendChild(dot);
                    }
                    circle.appendChild(orbitalDots);
                }

                content.appendChild(circle);
            });

            // Restore edges
            edges = data.TodoTrees[0].edges;

            // Initialize everything
            initializeCircles();
            
            // Initialize container and center view
            initializeContainer();
            
            // Handle hash navigation after loading
            handleHashNavigation();
            
            console.log('Tree loaded successfully');
        } catch (error) {
            console.error('Error loading tree:', error);
        }
        
        endLoading();
    }

    // Load data when page loads
    loadFromDatabase();

    drawEdges();
    container.addEventListener('scroll', drawEdges);

    // Add this to your existing CSS or create a new style tag
    const style = document.createElement('style');
    style.textContent = `
        .chat-message {
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 0.5rem;
            animation: fadeIn 0.3s ease-out;
        }

        .user-message {
            background: #343541;
            color: #ECECF1;
        }

        .ai-message {
            background: #444654;
            color: #D1D5DB;
            line-height: 1.6;
        }

        .message-text {
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }

        .message-text ul, .message-text ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }

        .message-text li {
            margin: 0.25rem 0;
        }

        .code-block {
            background: #1E1E1E;
            border-radius: 0.375rem;
            margin: 1rem 0;
            overflow: hidden;
        }

        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 1rem;
            background: #2D2D2D;
            border-bottom: 1px solid #404040;
        }

        .code-lang {
            color: #A9A9A9;
            font-size: 0.875rem;
        }

        .copy-code {
            background: transparent;
            border: none;
            color: #A9A9A9;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 0.25rem;
            transition: background-color 0.2s;
        }

        .copy-code:hover {
            background: #404040;
        }

        .code-block pre {
            margin: 0;
            padding: 1rem;
            overflow-x: auto;
        }

        .code-block code {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            line-height: 1.5;
        }

        .inline-code {
            background: #2D2D2D;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.875em;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message-text {
            position: relative;
        }

        .break-task-button {
            position: fixed;
            background: #4a5568;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: opacity 0.2s;
        }

        .break-task-button:hover {
            background: #606b7d;
        }

        .break-task-button .material-icons {
            font-size: 14px;
        }

        ::selection {
            background: #4a5568;
            color: white;
        }

        .break-off-marker {
            position: relative;
            display: inline;
            background: rgba(74, 85, 104, 0.2);
            border-radius: 4px;
            padding: 2px 4px;
            margin: 0 2px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .break-off-marker:hover {
            background: rgba(74, 85, 104, 0.3);
        }

        .break-off-icon {
            font-size: 14px !important;
            color: #718096;
            vertical-align: middle;
            margin-left: 4px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .break-off-marker:hover .break-off-icon {
            opacity: 1;
        }

        .break-off-text {
            text-decoration: underline;
            text-decoration-style: dotted;
            text-decoration-thickness: 1px;
            text-underline-offset: 2px;
        }

        .grade-goal-section {
            display: none;
            margin-top: 1rem;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 0.5rem;
        }

        .grade-goal-section.show {
            display: block;
        }

        .grade-goal-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #4a5568;
            color: white;
            border: none;
            border-radius: 0.25rem;
            cursor: pointer;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }

        .grade-goal-btn:hover {
            background: #606b7d;
        }

        .grade-goal-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .grade-goal-form select,
        .grade-goal-form input {
            padding: 0.5rem;
            border-radius: 0.25rem;
            border: 1px solid #4a5568;
            background: #2d3748;
            color: white;
        }

        .grade-goal-form input[type="number"] {
            width: 100px;
        }

        .control-btn {
            padding: 8px 16px;
            margin: 0 4px;
            border: none;
            border-radius: 4px;
            background: #4a5568;
            color: white;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
        }

        .control-btn:hover {
            background: #606b7d;
        }

        .control-btn:active {
            transform: scale(0.95);
        }

        .control-btn.active {
            background: #68d391;
            color: #1a202c;
        }

        .control-btn.active:hover {
            background: #9ae6b4;
        }

        .circle {
            cursor: pointer;
            transition: cursor 0.2s;
        }

        .circle.dragging {
            opacity: 0.8;
            cursor: move;
        }

        .form-group.compact {
            margin-bottom: 1rem;
        }

        .form-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #4a5568;
            border-radius: 0.25rem;
            background: #2d3748;
            color: white;
            font-size: 0.875rem;
        }

        textarea.form-input {
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
        }

        textarea.form-input:focus {
            outline: none;
            border-color: #68d391;
        }
    `;
    document.head.appendChild(style);

    // Add the styles for the saving toast
    const savingStyles = document.createElement('style');
    savingStyles.textContent = `
        #savingToast {
            position: fixed;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: top 0.3s ease-in-out;
            z-index: 10000;
            backdrop-filter: blur(4px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        #savingToast.show {
            top: 16px;
        }

        .saving-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(savingStyles);

    async function createBreakOffTask(selectedText) {
        if (!editingNode) {
            console.error('No editing node found');
            return;
        }

        showSavingToast();
        
        try {
            // Get parent node's conversation history and context
            const parentHistory = JSON.parse(editingNode.dataset.chatHistory || '[]');
            const recentHistory = parentHistory.slice(-15);
            const parentContext = editingNode.dataset.context || '';

            // Generate context synthesis for the new task
            const messages = [
                {
                    role: "system",
                    content: "You are a context synthesizer. Create a concise 40-word summary of how the conversation history relates to this broken-off task. Focus on key points and requirements that are relevant to the selected text."
                },
                {
                    role: "user",
                    content: `Parent context: ${parentContext}\n\nSelected text to break off: ${selectedText}\n\nConversation history:\n${recentHistory.map(msg => `${msg.type}: ${msg.text}`).join('\n')}\n\nWrite a 40-word synthesis of how this context and history relates to the broken-off task.`
                }
            ];

            console.log('Generating context synthesis...');
            const contextSynthesis = await fetchRequest('/AI', { data: messages });
            console.log('Context synthesis:', contextSynthesis);

            // Create new node with unique ID
            const nodeId = generateUniqueNodeId();
            const circle = document.createElement('div');
            circle.className = 'circle';
            circle.draggable = true;
            circle.dataset.id = nodeId;
            circle.dataset.type = 'Task';
            circle.dataset.context = contextSynthesis;
            circle.dataset.breakOffText = selectedText;
            circle.dataset.parentId = editingNode.dataset.id;

            // Initialize chat history with the selected text as first AI message
            const initialChat = [{
                text: `This task was broken off from "${editingNode.querySelector('span').textContent}". Here's the relevant excerpt:\n\n${selectedText}`,
                type: 'ai',
                timestamp: new Date().toISOString()
            }];
            circle.dataset.chatHistory = JSON.stringify(initialChat);

            // Add name span
            const span = document.createElement('span');
            span.textContent = selectedText.slice(0, 30) + (selectedText.length > 30 ? '...' : '');
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

            // Position slightly offset from parent
            const parentRect = editingNode.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const x = (parentRect.left - containerRect.left + container.scrollLeft) + 100;
            const y = (parentRect.top - containerRect.top + container.scrollTop) + 100;
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;

            // Add to container
            container.appendChild(circle);

            // Create edge from parent to new node
            const newEdge = { from: editingNode.dataset.id, to: nodeId };
            edges.push(newEdge);
            console.log('Added edge:', newEdge);

            // Initialize new node and redraw edges
            initializeCircles();
            drawEdges();

            // Save to database immediately to ensure edge is persisted
            await saveToDatabase();
            
            // Open editor for the new node
            openNodeEditor.call(circle);
            
            console.log('Break-off task created successfully');
        } catch (error) {
            console.error('Error creating break-off task:', error);
        } finally {
            hideSavingToast();
        }
    }

    // Update the updateGradeGoalSection function
    function updateGradeGoalSection(type) {
        const gradeGoalSection = document.getElementById('gradeGoalSection');
        const addGradeGoalBtn = document.getElementById('addGradeGoalBtn');
        const gradeGoalForm = document.getElementById('gradeGoalForm');
        const gradeGoalClass = document.getElementById('gradeGoalClass');
        
        if (type === 'Goal') {
            gradeGoalSection.classList.add('show');
            
            // Load classes and restore grade goal data
            fetchRequest('/data', { data: 'Classes' }).then(data => {
                const classes = data.Classes || [];
                gradeGoalClass.innerHTML = '<option value="">Select Class</option>';
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    gradeGoalClass.appendChild(option);
                });

                // Set values if node has grade goal
                if (editingNode.dataset.gradeGoalClass) {
                    gradeGoalForm.style.display = 'flex';
                    gradeGoalClass.value = editingNode.dataset.gradeGoalClass;
                    document.getElementById('gradeGoalTarget').value = editingNode.dataset.gradeGoalTarget;
                    addGradeGoalBtn.innerHTML = '<span class="material-icons">edit</span> Edit Grade Goal';
                } else {
                    gradeGoalForm.style.display = 'none';
                    addGradeGoalBtn.innerHTML = '<span class="material-icons">add</span> Add Grade Goal';
                }
            });
        } else {
            gradeGoalSection.classList.remove('show');
            gradeGoalForm.style.display = 'none';
        }
    }

    // Add event listeners for grade goal functionality
    document.getElementById('addGradeGoalBtn').addEventListener('click', function() {
        const form = document.getElementById('gradeGoalForm');
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });

    // Add event listener for Add Check-in Date button
    document.getElementById('addCheckInDate').addEventListener('click', () => {
        addCheckInDateItem();
    });

    function addCheckInDateItem(value = '') {
        const template = document.getElementById('checkInDateTemplate');
        const clone = template.content.cloneNode(true);
        
        const dateInput = clone.querySelector('.check-in-date');
        dateInput.value = value;
        
        // Add validation on change
        dateInput.addEventListener('change', function() {
            if (validateCheckInDate(this)) {
                scheduleAutoSave();
            }
        });
        
        const removeBtn = clone.querySelector('.remove-time-btn');
        removeBtn.addEventListener('click', function() {
            this.closest('.check-in-date-item').remove();
            scheduleAutoSave();
        });
        
        document.getElementById('checkInDateList').appendChild(clone);
    }

    // Add these new functions after initializeContainer()
    function handleHashNavigation() {
        const hash = window.location.hash;
        if (hash) {
            const nodeId = hash.substring(1); // Remove the # symbol
            const targetNode = document.querySelector(`.circle[data-id="${nodeId}"]`);
            if (targetNode) {
                // Wait for initial load and positioning
                setTimeout(() => {
                    scrollToNode(targetNode);
                    highlightNode(targetNode);
                    openNodeEditor.call(targetNode);
                }, 500);
            }
        }
    }

    function scrollToNode(node) {
        const rect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the scroll position to center the node
        const scrollX = rect.left - containerRect.left + container.scrollLeft - (container.clientWidth / 2) + (rect.width / 2);
        const scrollY = rect.top - containerRect.top + container.scrollTop - (container.clientHeight / 2) + (rect.height / 2);
        
        // Smooth scroll to the node
        container.scrollTo({
            left: scrollX,
            top: scrollY,
            behavior: 'smooth'
        });
    }

    function highlightNode(node) {
        // Add highlight animation class
        node.classList.add('highlight-pulse');
        
        // Remove the class after animation completes
        setTimeout(() => {
            node.classList.remove('highlight-pulse');
        }, 2000);
    }

    // Add highlight-pulse animation to the existing styles
    const highlightStyles = document.createElement('style');
    highlightStyles.textContent = `
        @keyframes highlightPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
            }
            
            50% {
                transform: scale(1.1);
                box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
            }
            
            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
            }
        }

        .highlight-pulse {
            animation: highlightPulse 2s ease-out;
        }
    `;
    document.head.appendChild(highlightStyles);

    // Add styles for the back button
    const backButtonStyles = document.createElement('style');
    backButtonStyles.textContent = `
        .back-to-list-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #2c3e50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
            height: 36px;
        }

        .back-to-list-btn:hover {
            background: #34495e;
            transform: translateX(-2px);
        }

        .back-to-list-btn .material-icons {
            font-size: 18px;
            transition: transform 0.2s;
        }

        .back-to-list-btn:hover .material-icons {
            transform: translateX(-2px);
        }

        .modal-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #1a202c;
            border-bottom: 1px solid #2d3748;
            border-radius: 8px 8px 0 0;
        }

        .modal-header h2 {
            flex: 1;
            margin: 0;
            font-size: 1.5rem;
            color: white;
        }

        .modal-header .close-btn {
            background: transparent;
            border: none;
            color: #a0aec0;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 4px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
        }

        .modal-header .close-btn:hover {
            background: #2d3748;
            color: white;
        }
    `;
    document.head.appendChild(backButtonStyles);
});
