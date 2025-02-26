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
    
    // State
    let currentWindow = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    let assignments = [];
    let tasks = [];
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
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentWindow < 3) {
                switchWindow(currentWindow + 1);
            } else if (diff < 0 && currentWindow > 0) {
                switchWindow(currentWindow - 1);
            }
        }
    });

    function switchWindow(index) {
        currentWindow = index;
        container.style.transform = `translateX(-${index * 20}%)`; // Changed from 25% to 20% for 5 windows
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
            await loadClasses(); // Load classes first
            const data = await fetchRequest('/data', { 
                data: 'Assignments, TodoTrees' 
            });
            
            // Process assignments
            const today = new Date();
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setDate(today.getDate() + 2);
            
            assignments = data.Assignments.filter(assignment => {
                const dueDate = new Date(assignment.due);
                return dueDate >= today && dueDate <= twoDaysFromNow;
            }).sort((a, b) => new Date(a.due) - new Date(b.due));
            
            // Process tasks and motivators
            if (data.TodoTrees && data.TodoTrees[0]) {
                todoTreeData = data.TodoTrees[0]; // Store the full tree data
                const todayStr = today.toISOString().split('T')[0];
                console.log('Today string:', todayStr);
                console.log('Available nodes:', todoTreeData.nodes);
                
                // Filter tasks with check-ins
                tasks = todoTreeData.nodes.filter(node => {
                    console.log('Checking node:', node);
                    return node.type !== 'Motivator' &&
                           node.checkInDates && 
                           node.checkInDates.includes(todayStr);
                });
                
                console.log('Filtered tasks:', tasks);

                // Add parent hierarchy information to each task
                tasks = tasks.map(task => ({
                    ...task,
                    parentHierarchy: findParentHierarchy(task.id)
                }));
                
                console.log('Tasks with hierarchy:', tasks);

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
        } catch (error) {
            console.error('Error loading data:', error);
        }
        endLoading();
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
        assignments.forEach(assignment => {
            const clone = assignmentTemplate.content.cloneNode(true);
            const item = clone.querySelector('.assignment-item');
            
            // Add assignment ID as data attribute
            item.dataset.id = assignment.id;
            
            // Fill in all assignment details
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
            
            assignmentsList.appendChild(item);
        });
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
}); 