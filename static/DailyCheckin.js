document.addEventListener('DOMContentLoaded', function() {
    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    let player;
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('youtube-player', {
            height: '315',
            width: '100%',
            videoId: '',
            playerVars: {
                'playsinline': 1,
                'controls': 1
            }
        });
    };

    // DOM Elements
    const container = document.querySelector('.swipe-container');
    const dots = document.querySelectorAll('.dot');
    const assignmentsList = document.querySelector('.assignments-list');
    const tasksList = document.querySelector('.tasks-list');
    const taskDetails = document.querySelector('.task-details');
    
    // Templates
    const assignmentTemplate = document.getElementById('assignment-template');
    const taskTemplate = document.getElementById('task-template');
    const chatMessageTemplate = document.getElementById('chat-message-template');
    const todayTaskTemplate = document.getElementById('today-task-template');
    
    // State
    let currentWindow = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    let assignments = [];
    let tasks = [];
    let todayTasks = [];
    let currentTask = null;
    let classes = []; // Store available classes
    let motivators = []; // Store available motivators
    let todoTreeData = null; // Store the full TodoTree data

    // Mobile swipe handling
    container.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchEndX = touchStartX;
    });

    container.addEventListener('touchmove', e => {
        touchEndX = e.touches[0].clientX;
    });

    container.addEventListener('touchend', () => {
        const diff = touchStartX - touchEndX;
        const threshold = 50;
        const totalSlides = document.querySelectorAll('.swipe-window').length;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentWindow < totalSlides - 1) {
                switchWindow(currentWindow + 1);
            } else if (diff < 0 && currentWindow > 0) {
                switchWindow(currentWindow - 1);
            }
        }
    });

    function switchWindow(index) {
        currentWindow = index;
        const container = document.querySelector('.swipe-container');
        
        if (window.innerWidth <= 768) {
            container.style.transform = `translateX(-${index * 100}vw)`; // Use viewport width units
        }
        
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // Stop video if switching away from motivation window
        if (index !== 2 && player && typeof player.stopVideo === 'function') {
            player.stopVideo();
        }
    }

    // Load classes first
    async function loadClasses() {
        try {
            const data = await fetchRequest('/data', { data: 'Classes' });
            classes = data.Classes || [];
        } catch (error) {
            console.error('Error loading classes:', error);
            classes = [];
        }
    }

    // Data loading
    async function loadData() {
        startLoading();
        try {
            await loadClasses();
            const data = await fetchRequest('/data', { 
                data: 'Assignments, TodoTrees' 
            });
            
            // Process assignments
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Get to end of current week
            
            console.log('Filtering assignments:', {
                today: today.toISOString(),
                tomorrow: tomorrow.toISOString(),
                endOfWeek: endOfWeek.toISOString(),
                allAssignments: data.Assignments
            });
            
            // Split assignments into homework and assessments
            const homeworkDueTomorrow = data.Assignments.filter(assignment => {
                // Normalize the due date to start of day in local time
                const dueDate = new Date(assignment.due + 'T00:00:00');
                dueDate.setHours(0, 0, 0, 0);
                
                const isAssessment = /test|exam|quiz|assess/i.test(assignment.category);
                const isTomorrow = dueDate.getTime() === tomorrow.getTime();
                
                console.log('Checking homework assignment:', {
                    assignment,
                    dueDate: dueDate.toISOString(),
                    isAssessment,
                    isTomorrow,
                    tomorrowDate: tomorrow.toISOString(),
                    dueDateString: dueDate.toISOString()
                });
                return !isAssessment && isTomorrow;
            });

            console.log('Homework due tomorrow:', homeworkDueTomorrow);

            const assessmentsThisWeek = data.Assignments.filter(assignment => {
                const dueDate = new Date(assignment.due + 'T00:00:00');
                dueDate.setHours(0, 0, 0, 0);
                const isAssessment = /test|exam|quiz|assess/i.test(assignment.category);
                return isAssessment && 
                       dueDate >= today && 
                       dueDate <= endOfWeek;
            }).sort((a, b) => new Date(a.due + 'T00:00:00') - new Date(b.due + 'T00:00:00'));

            assignments = {
                homework: homeworkDueTomorrow,
                assessments: assessmentsThisWeek
            };
            
            // Process tasks and motivators
            if (data.TodoTrees && data.TodoTrees[0]) {
                todoTreeData = data.TodoTrees[0];
                const todayStr = today.toISOString().split('T')[0];
                
                // Filter tasks with check-ins
                tasks = todoTreeData.nodes.filter(node => {
                    return node.type !== 'Motivator' &&
                           node.checkInDates && 
                           node.checkInDates.includes(todayStr);
                });

                // Add parent hierarchy information to each task
                tasks = tasks.map(task => ({
                    ...task,
                    parentHierarchy: findParentHierarchy(task.id)
                }));

                // Filter tasks due today
                todayTasks = todoTreeData.nodes.filter(node => {
                    if (node.type === 'Motivator') return false;
                    
                    const targetDate = node.targetDate ? node.targetDate.split('T')[0] : null;
                    return targetDate === todayStr;
                }).map(task => ({
                    ...task,
                    parentHierarchy: findParentHierarchy(task.id),
                    isDeadlineToday: task.deadline ? task.deadline.split('T')[0] === todayStr : false
                }));

                // Create dynamic slides for each task
                createDynamicSlides(tasks);
                
                // Render today's tasks
                renderTodayTasks();
                
                // Filter motivators with video links
                motivators = data.TodoTrees[0].nodes.filter(node =>
                    node.type === 'Motivator' &&
                    node.motivationLink
                );

                // Populate motivation dropdown
                const motivationSelect = document.getElementById('motivation-select');
                if (motivationSelect) {
                    motivationSelect.innerHTML = '<option value="">Select a motivation</option>';
                    motivators.forEach(motivator => {
                        const option = document.createElement('option');
                        option.value = JSON.stringify({
                            link: motivator.motivationLink,
                            timeRange: motivator.motivationLinkTime
                        });
                        option.textContent = motivator.name;
                        motivationSelect.appendChild(option);
                    });

                    // Add change event listener
                    motivationSelect.addEventListener('change', function() {
                        const videoContainer = document.getElementById('video-container');
                        if (!this.value) {
                            videoContainer.style.display = 'none';
                            if (player && typeof player.stopVideo === 'function') {
                                player.stopVideo();
                            }
                            return;
                        }

                        const motivationData = JSON.parse(this.value);
                        const videoId = extractVideoId(motivationData.link);
                        const timeRange = motivationData.timeRange;

                        if (videoId && player && typeof player.loadVideoById === 'function') {
                            videoContainer.style.display = 'block';
                            
                            // If time range is specified (e.g., "06:00-07:00")
                            if (timeRange) {
                                const [start, end] = timeRange.split('-')
                                    .map(time => {
                                        const [min, sec] = time.split(':').map(Number);
                                        return min * 60 + sec;
                                    });
                                
                                player.loadVideoById({
                                    videoId: videoId,
                                    startSeconds: start,
                                    endSeconds: end
                                });
                            } else {
                                player.loadVideoById(videoId);
                            }
                        }
                    });
                }
            }
            
            renderAssignments();
            renderTasks();
            updateSwipeIndicator();
            renderRescheduleTasks();
        } catch (error) {
            console.error('Error loading data:', error);
        }
        endLoading();
    }

    function createDynamicSlides(tasks) {
        const container = document.querySelector('.swipe-container');
        const taskCheckinTemplate = document.getElementById('task-checkin-template');
        const taskFollowupTemplate = document.getElementById('task-followup-template');

        // Remove any existing dynamic slides
        const existingDynamicSlides = container.querySelectorAll('.task-checkin-window, .task-followup-window');
        existingDynamicSlides.forEach(slide => slide.remove());

        // Create new slides for each task
        tasks.forEach(task => {
            // Create check-in slide
            const checkinSlide = taskCheckinTemplate.content.cloneNode(true);
            const checkinWindow = checkinSlide.querySelector('.task-checkin-window');
            
            checkinWindow.dataset.taskId = task.id;
            checkinWindow.querySelector('.task-name').textContent = `📝 ${task.name} Check-in`;
            
            if (task.parentHierarchy && task.parentHierarchy.length > 0) {
                const hierarchyText = task.parentHierarchy
                    .map(parent => parent.name)
                    .join(' › ');
                checkinWindow.querySelector('.task-hierarchy').textContent = hierarchyText;
            }
            
            checkinWindow.querySelector('.task-description').textContent = task.description || '';

            // Add event listener for check-in form
            const saveCheckinBtn = checkinWindow.querySelector('.save-checkin-btn');
            saveCheckinBtn.addEventListener('click', () => saveCheckin(task.id));

            // Create follow-up slide
            const followupSlide = taskFollowupTemplate.content.cloneNode(true);
            const followupWindow = followupSlide.querySelector('.task-followup-window');
            
            followupWindow.dataset.taskId = task.id;
            followupWindow.querySelector('.task-name').textContent = task.name;

            // Initialize date fields with current values
            const targetDateInput = followupWindow.querySelector('.target-date');
            const deadlineDateInput = followupWindow.querySelector('.deadline-date');
            
            if (task.targetDate) {
                targetDateInput.value = task.targetDate.split('T')[0]; // Get just the date part
            }
            if (task.deadline) {
                deadlineDateInput.value = task.deadline.split('T')[0]; // Get just the date part
            }

            // Add event listener for follow-up form
            const saveFollowupBtn = followupWindow.querySelector('.save-followup-btn');
            saveFollowupBtn.addEventListener('click', () => saveFollowup(task.id));

            // Append both slides
            container.appendChild(checkinWindow);
            container.appendChild(followupWindow);

            // Initialize chat after the slides are in the DOM
            initializeChat(task.id);
        });

        // Update container width for mobile view
        if (window.innerWidth <= 768) {
            const totalSlides = 4 + (tasks.length * 2); // Base slides + (check-in + follow-up) per task
            container.style.width = `${totalSlides * 100}%`;
            
            // Update individual slide widths
            const allSlides = container.querySelectorAll('.swipe-window');
            allSlides.forEach(slide => {
                slide.style.width = `${100 / totalSlides}%`;
            });
        }
    }

    function updateSwipeIndicator() {
        const indicator = document.querySelector('.swipe-indicator');
        const totalSlides = document.querySelectorAll('.swipe-window').length;
        
        // Clear existing dots
        indicator.innerHTML = '';
        
        // Create new dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i === currentWindow ? ' active' : '');
            dot.addEventListener('click', () => switchWindow(i));
            indicator.appendChild(dot);
        }
    }

    async function saveCheckin(taskId) {
        const task = todoTreeData.nodes.find(node => node.id === taskId);
        const checkinWindow = document.querySelector(`.task-checkin-window[data-task-id="${taskId}"]`);
        const chatMessages = checkinWindow.querySelector('.chat-messages');

        try {
            // Save chat history to task
            const messages = Array.from(chatMessages.children).map(msg => ({
                text: msg.textContent,
                type: msg.classList.contains('user-message') ? 'user' : 'ai',
                timestamp: new Date().toISOString()
            }));

            if (!task.chatHistory) task.chatHistory = [];
            task.chatHistory.push(...messages);

            // Save updated task data to database
            await fetchRequest('/update_data', {
                sheet: 'TodoTrees',
                data: todoTreeData,
                row_name: 'id',
                row_value: todoTreeData.id
            });

            // Move to follow-up window
            const currentIndex = Array.from(document.querySelectorAll('.swipe-window')).findIndex(window => 
                window.classList.contains('task-checkin-window') && window.getAttribute('data-task-id') === taskId
            );
            switchWindow(currentIndex + 1);
        } catch (error) {
            console.error('Error saving check-in:', error);
            alert('Failed to save check-in. Please try again.');
        }
    }

    function initializeChat(taskId) {
        const checkinWindow = document.querySelector(`.task-checkin-window[data-task-id="${taskId}"]`);
        const chatMessages = checkinWindow.querySelector('.chat-messages');
        const chatInput = checkinWindow.querySelector('.chat-input');
        const sendButton = checkinWindow.querySelector('.chat-send-btn');

        // Load existing chat history
        const task = todoTreeData.nodes.find(node => node.id === taskId);
        if (task.chatHistory) {
            task.chatHistory.forEach(msg => {
                addChatMessage(chatMessages, msg.text, msg.type);
            });
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Send message on button click
        sendButton.addEventListener('click', () => sendMessage(taskId));

        // Send message on Enter (but Shift+Enter for new line)
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(taskId);
            }
        });
    }

    async function sendMessage(taskId) {
        const checkinWindow = document.querySelector(`.task-checkin-window[data-task-id="${taskId}"]`);
        const chatMessages = checkinWindow.querySelector('.chat-messages');
        const chatInput = checkinWindow.querySelector('.chat-input');
        const message = chatInput.value.trim();

        if (!message) return;

        try {
            // Add user message to UI
            addChatMessage(chatMessages, message, 'user');
            chatInput.value = '';

            // Add user message to task's chat history
            const task = todoTreeData.nodes.find(node => node.id === taskId);
            if (!task.chatHistory) task.chatHistory = [];
            task.chatHistory.push({
                type: 'user',
                text: message,
                timestamp: new Date().toISOString()
            });

            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            for (let i = 0; i < 3; i++) {
                typingIndicator.appendChild(document.createElement('span'));
            }
            chatMessages.appendChild(typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Prepare messages for AI
            const messages = [
                {
                    role: "system",
                    content: `You are an AI assistant helping with a task named "${task.name}" in a task management system. 
                    ${task.deadline ? `The deadline is ${task.deadline}.` : ''}
                    ${task.targetDate ? `The target date is ${task.targetDate}.` : ''}
                    
                    Help the user with:
                    - Progress updates and challenges
                    - Breaking down complex tasks
                    - Time management strategies
                    - Motivation and accountability
                    - Setting realistic milestones
                    
                    Be concise, practical, and encouraging in your responses.`
                }
            ];

            // Add chat history (last 10 messages)
            const history = task.chatHistory.slice(-10);
            history.forEach(msg => {
                messages.push({
                    role: msg.type === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            });

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            // Send to AI and get response
            const response = await fetchRequest('/AI', {
                data: messages
            });

            // Remove typing indicator
            typingIndicator.remove();

            // Add AI response to UI
            addChatMessage(chatMessages, response, 'ai');

            // Add AI response to task's chat history
            task.chatHistory.push({
                type: 'ai',
                text: response,
                timestamp: new Date().toISOString()
            });

            // Save updated chat history to database
            await fetchRequest('/update_data', {
                sheet: 'TodoTrees',
                data: todoTreeData,
                row_name: 'id',
                row_value: todoTreeData.id
            });

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    function addChatMessage(container, text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.textContent = text;
        container.appendChild(messageDiv);
    }

    async function saveFollowup(taskId) {
        const followupWindow = document.querySelector(`.task-followup-window[data-task-id="${taskId}"]`);
        const nextDate = followupWindow.querySelector('.next-checkin-date').value;
        const targetDate = followupWindow.querySelector('.target-date').value;
        const deadline = followupWindow.querySelector('.deadline-date').value;

        if (!nextDate) {
            alert('Please select the next check-in date');
            return;
        }

        try {
            // Update task data
            const task = todoTreeData.nodes.find(node => node.id === taskId);
            
            // Update check-in dates
            if (!task.checkInDates) task.checkInDates = [];
            task.checkInDates.push(nextDate);
            task.checkInDates.sort();

            // Update target date and deadline if changed
            if (targetDate) {
                task.targetDate = targetDate + 'T00:00';
            }
            if (deadline) {
                task.deadline = deadline + 'T00:00';
            }

            // Update the database
            await fetchRequest('/update_data', {
                sheet: 'TodoTrees',
                data: todoTreeData,
                row_name: 'id',
                row_value: todoTreeData.id
            });

            // Return to tasks list
            switchWindow(3);
            loadData(); // Refresh the data

        } catch (error) {
            console.error('Error saving follow-up:', error);
            alert('Failed to save follow-up. Please try again.');
        }
    }

    // Function to find parent hierarchy of a node
    function findParentHierarchy(nodeId) {
        if (!todoTreeData || !todoTreeData.edges || !todoTreeData.nodes) return [];
        
        const currentNode = todoTreeData.nodes.find(node => node.id === nodeId);
        if (!currentNode) return [];

        // Find the highest motivator as root
        const rootMotivator = todoTreeData.nodes
            .filter(node => node.type === 'Motivator')
            .sort((a, b) => a.position.y - b.position.y)[0];

        if (!rootMotivator) return [];

        // Build adjacency list for the graph
        const graph = {};
        todoTreeData.nodes.forEach(node => {
            graph[node.id] = [];
        });
        
        todoTreeData.edges.forEach(edge => {
            graph[edge.from].push(edge.to);
            graph[edge.to].push(edge.from); // Since edges are bidirectional
        });

        // Find path using BFS, preferring nodes with higher y position
        const queue = [[rootMotivator.id]];
        const visited = new Set([rootMotivator.id]);
        
        while (queue.length > 0) {
            const path = queue.shift();
            const currentId = path[path.length - 1];
            
            if (currentId === nodeId) {
                // Convert path of IDs to array of nodes (excluding the target node)
                return path.slice(0, -1).map(id => 
                    todoTreeData.nodes.find(node => node.id === id)
                );
            }
            
            // Get all neighbors
            const neighbors = graph[currentId] || [];
            
            // Sort neighbors by y position (top to bottom)
            const sortedNeighbors = neighbors
                .map(id => todoTreeData.nodes.find(node => node.id === id))
                .sort((a, b) => a.position.y - b.position.y)
                .map(node => node.id);
            
            // Add unvisited neighbors to queue
            for (const neighborId of sortedNeighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push([...path, neighborId]);
                }
            }
        }
        
        return []; // No path found
    }

    function renderAssignments() {
        assignmentsList.innerHTML = '';

        // Create homework section
        const homeworkSection = document.createElement('div');
        homeworkSection.className = 'assignments-section';
        const homeworkTitle = document.createElement('h3');
        homeworkTitle.textContent = '📚 HW for Tomorrow';
        homeworkSection.appendChild(homeworkTitle);

        assignments.homework.forEach(assignment => {
            const clone = assignmentTemplate.content.cloneNode(true);
            const item = clone.querySelector('.assignment-item');
            
            item.dataset.id = assignment.id;
            item.querySelector('.class-name').textContent = assignment.class_name;
            item.querySelector('.due-date').textContent = processDate(assignment.due);
            item.querySelector('.assignment-name').textContent = assignment.name;
            item.querySelector('.assignment-points').textContent = `${assignment.points} points`;
            item.querySelector('.assignment-category').textContent = assignment.category;
            
            if (assignment.description) {
                const desc = item.querySelector('.assignment-description');
                desc.textContent = assignment.description;
                desc.style.display = 'block';
            }
            
            homeworkSection.appendChild(item);
        });

        // Create assessments section
        const assessmentsSection = document.createElement('div');
        assessmentsSection.className = 'assignments-section';
        const assessmentsTitle = document.createElement('h3');
        assessmentsTitle.textContent = '📝 Assessments This Week';
        assessmentsSection.appendChild(assessmentsTitle);

        assignments.assessments.forEach(assignment => {
            const clone = assignmentTemplate.content.cloneNode(true);
            const item = clone.querySelector('.assignment-item');
            
            item.dataset.id = assignment.id;
            item.querySelector('.class-name').textContent = assignment.class_name;
            item.querySelector('.due-date').textContent = processDate(assignment.due);
            item.querySelector('.assignment-name').textContent = assignment.name;
            item.querySelector('.assignment-points').textContent = `${assignment.points} points`;
            item.querySelector('.assignment-category').textContent = assignment.category;
            
            if (assignment.description) {
                const desc = item.querySelector('.assignment-description');
                desc.textContent = assignment.description;
                desc.style.display = 'block';
            }
            
            assessmentsSection.appendChild(item);
        });

        // Add sections to the assignments list
        assignmentsList.appendChild(homeworkSection);
        assignmentsList.appendChild(assessmentsSection);

        // Add empty state messages if needed
        if (assignments.homework.length === 0) {
            const emptyHW = document.createElement('p');
            emptyHW.className = 'empty-message';
            emptyHW.textContent = 'No homework due tomorrow';
            homeworkSection.appendChild(emptyHW);
        }

        if (assignments.assessments.length === 0) {
            const emptyAssessments = document.createElement('p');
            emptyAssessments.className = 'empty-message';
            emptyAssessments.textContent = 'No assessments this week';
            assessmentsSection.appendChild(emptyAssessments);
        }
    }

    function renderTasks() {
        tasksList.innerHTML = '';
        console.log('Rendering tasks:', tasks);
        tasks.forEach(task => {
            const clone = taskTemplate.content.cloneNode(true);
            const item = clone.querySelector('.task-item');
            
            item.dataset.id = task.id;
            
            // Create hierarchy display
            if (task.parentHierarchy && task.parentHierarchy.length > 0) {
                const hierarchyDiv = document.createElement('div');
                hierarchyDiv.className = 'task-hierarchy';
                const hierarchyText = task.parentHierarchy
                    .map(parent => parent.name)
                    .join(' › ');
                hierarchyDiv.textContent = hierarchyText;
                item.appendChild(hierarchyDiv);
            }
            
            // Create task content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'task-content';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'task-name';
            nameDiv.textContent = task.name;
            contentDiv.appendChild(nameDiv);
            
            if (task.description) {
                const descDiv = document.createElement('div');
                descDiv.className = 'task-description';
                descDiv.textContent = task.description.substring(0, 100) + 
                    (task.description.length > 100 ? '...' : '');
                contentDiv.appendChild(descDiv);
            }
            
            item.appendChild(contentDiv);
            
            // Create meta section
            const metaDiv = document.createElement('div');
            metaDiv.className = 'task-meta';
            
            // Add task type with icon
            const typeDiv = document.createElement('div');
            typeDiv.className = 'task-type';
            const typeIcon = document.createElement('span');
            typeIcon.className = 'material-icons';
            typeIcon.textContent = task.type === 'Task' ? 'assignment' : 'track_changes';
            typeDiv.appendChild(typeIcon);
            typeDiv.appendChild(document.createTextNode(task.type));
            metaDiv.appendChild(typeDiv);
            
            // Create dates section
            const datesDiv = document.createElement('div');
            datesDiv.className = 'task-dates';
            
            // Add check-in date
            if (task.checkInDates && task.checkInDates.length > 0) {
                const checkinDiv = document.createElement('div');
                checkinDiv.className = 'date-bubble check-in';
                const checkinIcon = document.createElement('span');
                checkinIcon.className = 'material-icons';
                checkinIcon.textContent = 'event';
                checkinDiv.appendChild(checkinIcon);
                checkinDiv.appendChild(
                    document.createTextNode(processDate(task.checkInDates[0]))
                );
                datesDiv.appendChild(checkinDiv);
            }
            
            // Add target date if exists
            if (task.targetDate) {
                const targetDiv = document.createElement('div');
                targetDiv.className = 'date-bubble target';
                const targetIcon = document.createElement('span');
                targetIcon.className = 'material-icons';
                targetIcon.textContent = 'flag';
                targetDiv.appendChild(targetIcon);
                targetDiv.appendChild(
                    document.createTextNode(processDate(task.targetDate))
                );
                datesDiv.appendChild(targetDiv);
            }
            
            // Add deadline if exists
            if (task.deadline) {
                const deadlineDiv = document.createElement('div');
                deadlineDiv.className = 'date-bubble deadline';
                const deadlineIcon = document.createElement('span');
                deadlineIcon.className = 'material-icons';
                deadlineIcon.textContent = 'timer';
                deadlineDiv.appendChild(deadlineIcon);
                deadlineDiv.appendChild(
                    document.createTextNode(processDate(task.deadline))
                );
                datesDiv.appendChild(deadlineDiv);
            }
            
            metaDiv.appendChild(datesDiv);
            item.appendChild(metaDiv);
            
            item.addEventListener('click', () => showTaskDetails(task));
            
            tasksList.appendChild(item);
        });
    }

    function showTaskDetails(task) {
        currentTask = task;
        switchWindow(2);
        
        const header = taskDetails.querySelector('.task-header');
        
        // Show hierarchy in header if it exists
        if (task.parentHierarchy && task.parentHierarchy.length > 0) {
            const hierarchyDiv = document.createElement('div');
            hierarchyDiv.className = 'task-hierarchy';
            const hierarchyText = task.parentHierarchy
                .map(parent => parent.name)
                .join(' › ');
            hierarchyDiv.textContent = hierarchyText + ' › ' + task.name;
            header.querySelector('.task-name').textContent = '';
            header.querySelector('.task-name').appendChild(hierarchyDiv);
        } else {
            header.querySelector('.task-name').textContent = task.name;
        }
        
        // Add task type with icon
        const typeDiv = header.querySelector('.task-type');
        typeDiv.innerHTML = '';
        const typeIcon = document.createElement('span');
        typeIcon.className = 'material-icons';
        typeIcon.textContent = task.type === 'Task' ? 'assignment' : 'track_changes';
        typeDiv.appendChild(typeIcon);
        typeDiv.appendChild(document.createTextNode(task.type));
        
        taskDetails.querySelector('.task-description').textContent = task.description || '';
        
        // Render dates with bubbles
        const datesList = taskDetails.querySelector('.dates-list');
        datesList.innerHTML = '';
        
        // Add check-in dates
        if (task.checkInDates) {
            task.checkInDates.forEach(date => {
                const dateEl = document.createElement('div');
                dateEl.className = 'date-bubble check-in';
                const icon = document.createElement('span');
                icon.className = 'material-icons';
                icon.textContent = 'event';
                dateEl.appendChild(icon);
                dateEl.appendChild(document.createTextNode(processDate(date)));
                datesList.appendChild(dateEl);
            });
        }
        
        // Add target date if exists
        if (task.targetDate) {
            const targetEl = document.createElement('div');
            targetEl.className = 'date-bubble target';
            const icon = document.createElement('span');
            icon.className = 'material-icons';
            icon.textContent = 'flag';
            targetEl.appendChild(icon);
            targetEl.appendChild(document.createTextNode(processDate(task.targetDate)));
            datesList.appendChild(targetEl);
        }
        
        // Add deadline if exists
        if (task.deadline) {
            const deadlineEl = document.createElement('div');
            deadlineEl.className = 'date-bubble deadline';
            const icon = document.createElement('span');
            icon.className = 'material-icons';
            icon.textContent = 'timer';
            deadlineEl.appendChild(icon);
            deadlineEl.appendChild(document.createTextNode(processDate(task.deadline)));
            datesList.appendChild(deadlineEl);
        }
        
        // Render chat history
        const chatMessages = taskDetails.querySelector('.chat-messages');
        chatMessages.innerHTML = '';
        if (task.chatHistory) {
            task.chatHistory.forEach(msg => {
                const clone = chatMessageTemplate.content.cloneNode(true);
                const message = clone.querySelector('.chat-message');
                
                message.querySelector('.message-content').textContent = msg.text;
                message.querySelector('.message-type').textContent = msg.type;
                message.querySelector('.message-time').textContent = 
                    new Date(msg.timestamp).toLocaleTimeString();
                
                chatMessages.appendChild(message);
            });
        }
    }

    // Add new check-in date
    const addCheckinDateBtn = document.getElementById('add-checkin-date-btn');
    if (addCheckinDateBtn) {
        addCheckinDateBtn.addEventListener('click', async () => {
            if (!currentTask) return;
            
            const date = prompt('Enter check-in date (YYYY-MM-DD):');
            if (!date) return;
            
            try {
                const data = await fetchRequest('/data', { data: 'TodoTrees' });
                if (!data.TodoTrees || !data.TodoTrees[0]) return;
                
                const treeData = data.TodoTrees[0];
                const taskIndex = treeData.nodes.findIndex(n => n.id === currentTask.id);
                
                if (taskIndex === -1) return;
                
                if (!treeData.nodes[taskIndex].checkInDates) {
                    treeData.nodes[taskIndex].checkInDates = [];
                }
                
                treeData.nodes[taskIndex].checkInDates.push(date);
                treeData.nodes[taskIndex].checkInDates.sort();
                
                await fetchRequest('/update_data', {
                    sheet: 'TodoTrees',
                    data: treeData,
                    row_name: 'id',
                    row_value: treeData.id
                });
                
                currentTask = treeData.nodes[taskIndex];
                showTaskDetails(currentTask);
                loadData(); // Refresh the tasks list
            } catch (error) {
                console.error('Error adding check-in date:', error);
            }
        });
    }

    // Create new assignment
    async function createAssignment(formData) {
        try {
            const today = new Date();
            const newAssignment = {
                id: Math.floor(1000 + Math.random() * 9000).toString(), // Generate 4-digit ID
                name: formData.name,
                class: parseInt(formData.classId), // Ensure class is an integer
                class_name: classes.find(c => c.id === formData.classId)?.name || '',
                category: formData.category,
                due: formData.dueDate,
                points: parseInt(formData.points),
                description: formData.description || '',
                time_spent: {},
                difficulty: {},
                completed: {}
            };

            // Show loading indicator
            startLoading();

            // Post to database and clear cache to force fresh data
            await fetchRequest('/post_data', {
                sheet: 'Assignments',
                data: newAssignment
            });

            // Clear the assignments cache to force a fresh fetch
            localStorage.removeItem('Assignments');
            
            // Refresh assignments
            await loadData();
            
            // Close modal and reset form
            const modal = document.getElementById('assignment-modal');
            const form = document.getElementById('assignment-form');
            if (modal && form) {
                modal.style.display = 'none';
                form.reset();
            }

            // End loading
            endLoading();
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment. Please try again.');
            endLoading();
        }
    }

    // Add new assignment modal handler
    const addAssignmentBtn = document.getElementById('add-assignment-btn');
    const assignmentModal = document.getElementById('assignment-modal');
    const assignmentForm = document.getElementById('assignment-form');

    console.log('Found elements:', {
        addAssignmentBtn,
        assignmentModal,
        assignmentForm
    });

    if (addAssignmentBtn && assignmentModal && assignmentForm) {
        // Show modal when clicking add button
        addAssignmentBtn.addEventListener('click', () => {
            console.log('Add assignment button clicked');
            // Clear previous form data
            assignmentForm.reset();
            
            // Populate class select
            const classSelect = assignmentForm.querySelector('#assignment-class');
            console.log('Class select element:', classSelect);
            if (classSelect) {
                classSelect.innerHTML = '<option value="">Select a class</option>';
                console.log('Available classes:', classes);
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    classSelect.appendChild(option);
                });

                // Add change event listener to update categories
                classSelect.addEventListener('change', () => {
                    const selectedClass = classes.find(c => c.id === classSelect.value);
                    const categorySelect = assignmentForm.querySelector('#assignment-category');
                    
                    if (selectedClass && selectedClass.categories && categorySelect) {
                        categorySelect.innerHTML = '<option value="">Select a category</option>';
                        // Categories are stored as ["homework", 40, "Assessments", 60]
                        // We need to extract just the category names (even indices)
                        for (let i = 0; i < selectedClass.categories.length; i += 2) {
                            const option = document.createElement('option');
                            option.value = selectedClass.categories[i];
                            option.textContent = selectedClass.categories[i];
                            categorySelect.appendChild(option);
                        }
                        categorySelect.disabled = false;
                    } else {
                        categorySelect.innerHTML = '<option value="">Select a class first</option>';
                        categorySelect.disabled = true;
                    }
                });
            }
            
            assignmentModal.style.display = 'block';
            console.log('Modal displayed');
        });

        // Handle form submission
        assignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                name: e.target.elements['assignment-name'].value,
                classId: e.target.elements['assignment-class'].value,
                category: e.target.elements['assignment-category'].value,
                dueDate: e.target.elements['assignment-due'].value,
                points: e.target.elements['assignment-points'].value,
                description: e.target.elements['assignment-description'].value
            };

            // Validate form data
            if (!formData.name || !formData.classId || !formData.category || !formData.dueDate || !formData.points) {
                alert('Please fill in all required fields');
                return;
            }

            await createAssignment(formData);
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === assignmentModal) {
                assignmentModal.style.display = 'none';
            }
        });
    }

    function processDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    // Helper function to extract YouTube video ID from URL
    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Initialize
    loadData();

    // Todo functionality
    const todosList = document.querySelector('.todos-list');
    const newTodoInput = document.getElementById('new-todo-input');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoTemplate = document.getElementById('todo-item-template');
    let todos = JSON.parse(localStorage.getItem('dailyTodos') || '[]');

    // Render initial todos
    function renderTodos() {
        todosList.innerHTML = '';
        todos.forEach((todo, index) => {
            const clone = todoTemplate.content.cloneNode(true);
            const item = clone.querySelector('.todo-item');
            
            if (todo.completed) {
                item.classList.add('completed');
            }
            
            const checkbox = item.querySelector('.todo-checkbox');
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(index));
            
            item.querySelector('.todo-text').textContent = todo.text;
            
            const deleteBtn = item.querySelector('.delete-todo-btn');
            deleteBtn.addEventListener('click', () => deleteTodo(index));
            
            todosList.appendChild(item);
        });
    }

    // Add new todo
    function addTodo(text) {
        todos.push({
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('dailyTodos', JSON.stringify(todos));
        renderTodos();
    }

    // Toggle todo completion
    function toggleTodo(index) {
        todos[index].completed = !todos[index].completed;
        localStorage.setItem('dailyTodos', JSON.stringify(todos));
        renderTodos();
    }

    // Delete todo
    function deleteTodo(index) {
        todos.splice(index, 1);
        localStorage.setItem('dailyTodos', JSON.stringify(todos));
        renderTodos();
    }

    // Event listeners for todo functionality
    if (addTodoBtn && newTodoInput) {
        addTodoBtn.addEventListener('click', () => {
            const text = newTodoInput.value.trim();
            if (text) {
                addTodo(text);
                newTodoInput.value = '';
            }
        });

        newTodoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = newTodoInput.value.trim();
                if (text) {
                    addTodo(text);
                    newTodoInput.value = '';
                }
            }
        });
    }

    // Initialize todos
    renderTodos();

    // Render today's tasks
    function renderTodayTasks() {
        const todayTasksList = document.querySelector('.today-tasks-list');
        if (!todayTasksList) return;

        todayTasksList.innerHTML = '';

        if (todayTasks.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No tasks due today';
            todayTasksList.appendChild(emptyMessage);
            return;
        }

        todayTasks.forEach(task => {
            const clone = todayTaskTemplate.content.cloneNode(true);
            const item = clone.querySelector('.today-task-item');
            
            item.querySelector('.task-name').textContent = task.name;
            
            if (task.description) {
                item.querySelector('.task-description').textContent = task.description;
            } else {
                item.querySelector('.task-description').style.display = 'none';
            }
            
            if (task.parentHierarchy && task.parentHierarchy.length > 0) {
                const hierarchyText = task.parentHierarchy
                    .map(parent => parent.name)
                    .join(' › ');
                item.querySelector('.task-hierarchy').textContent = hierarchyText;
            } else {
                item.querySelector('.task-hierarchy').style.display = 'none';
            }
            
            const deadlineIndicator = item.querySelector('.deadline-indicator');
            if (task.isDeadlineToday) {
                deadlineIndicator.style.display = 'block';
            } else {
                deadlineIndicator.style.display = 'none';
            }
            
            todayTasksList.appendChild(item);
        });
    }

    function renderRescheduleTasks() {
        const rescheduleList = document.querySelector('.reschedule-tasks-list');
        rescheduleList.innerHTML = '';
        
        // Get today's date at start of day in local timezone
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Today (for comparison):', today.toISOString());
        
        // Get all tasks from todoTreeData instead of just tasks with check-ins today
        const allTasks = todoTreeData.nodes.filter(node => node.type !== 'Motivator')
            .map(task => ({
                ...task,
                parentHierarchy: findParentHierarchy(task.id)
            }));
            
        console.log('All tasks before filtering:', allTasks.map(task => ({
            name: task.name,
            targetDate: task.targetDate,
            completed: task.completed,
            parentHierarchy: task.parentHierarchy
        })));
        
        const overdueTasks = allTasks.filter(task => {
            if (!task.targetDate || task.completed) {
                console.log(`Task "${task.name}" skipped:`, {
                    hasTargetDate: !!task.targetDate,
                    isCompleted: task.completed
                });
                return false;
            }
            
            // Parse the target date and set to start of day for fair comparison
            const targetDate = new Date(task.targetDate);
            targetDate.setHours(0, 0, 0, 0);
            
            const isOverdue = targetDate < today;
            console.log(`Task "${task.name}" date comparison:`, {
                targetDate: targetDate.toISOString(),
                isOverdue,
                rawTargetDate: task.targetDate
            });
            
            return isOverdue;
        });
        
        console.log('Overdue tasks after filtering:', overdueTasks.map(task => ({
            name: task.name,
            targetDate: task.targetDate,
            parentHierarchy: task.parentHierarchy
        })));
        
        if (overdueTasks.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No overdue tasks! 🎉';
            rescheduleList.appendChild(emptyMessage);
            return;
        }
        
        const template = document.getElementById('reschedule-task-template');
        
        overdueTasks.forEach(task => {
            const clone = template.content.cloneNode(true);
            const taskItem = clone.querySelector('.reschedule-task-item');
            
            taskItem.querySelector('.task-name').textContent = task.name;
            taskItem.querySelector('.task-description').textContent = task.description || '';
            
            if (task.parentHierarchy && task.parentHierarchy.length > 0) {
                const hierarchyText = task.parentHierarchy
                    .map(parent => parent.name)
                    .join(' > ');
                taskItem.querySelector('.task-hierarchy').textContent = hierarchyText;
            } else {
                taskItem.querySelector('.task-hierarchy').style.display = 'none';
            }
            
            // Format the original target date
            const originalDate = new Date(task.targetDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            taskItem.querySelector('.date-value').textContent = originalDate;
            
            const dateInput = taskItem.querySelector('.new-target-date');
            dateInput.min = new Date().toISOString().split('T')[0];
            
            const rescheduleBtn = taskItem.querySelector('.reschedule-btn');
            rescheduleBtn.addEventListener('click', () => rescheduleTask(task.id, dateInput.value));
            
            rescheduleList.appendChild(taskItem);
        });
    }

    async function rescheduleTask(taskId, newTargetDate) {
        if (!newTargetDate) {
            alert('Please select a new target date');
            return;
        }
        
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            
            task.targetDate = newTargetDate;
            
            // Update the task in the backend
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ targetDate: newTargetDate })
            });
            
            // Refresh the tasks lists
            await loadData();
            renderRescheduleTasks();
            renderTodayTasks();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Task rescheduled successfully! 🎯';
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                successMessage.remove();
            }, 3000);
            
        } catch (error) {
            console.error('Error rescheduling task:', error);
            alert('Failed to reschedule task. Please try again.');
        }
    }
});