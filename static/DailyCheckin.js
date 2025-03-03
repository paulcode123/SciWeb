document.addEventListener('DOMContentLoaded', function() {
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

    // Mobile swipe handling
    container.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
    });

    container.addEventListener('touchmove', e => {
        touchEndX = e.touches[0].clientX;
        const diff = touchStartX - touchEndX;
        const threshold = 50;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentWindow < 2) {
                switchWindow(currentWindow + 1);
            } else if (diff < 0 && currentWindow > 0) {
                switchWindow(currentWindow - 1);
            }
        }
    });

    function switchWindow(index) {
        currentWindow = index;
        container.style.transform = `translateX(-${index * 33.333}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    // Data loading
    async function loadData() {
        startLoading();
        try {
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
            
            // Process tasks with check-ins
            if (data.TodoTrees && data.TodoTrees[0]) {
                const todayStr = today.toISOString().split('T')[0];
                tasks = data.TodoTrees[0].nodes.filter(node => 
                    node.checkIn_dates && 
                    node.checkIn_dates.includes(todayStr)
                );
            }
            
            renderAssignments();
            renderTasks();
        } catch (error) {
            console.error('Error loading data:', error);
        }
        endLoading();
    }

    function renderAssignments() {
        assignmentsList.innerHTML = '';
        assignments.forEach(assignment => {
            const clone = assignmentTemplate.content.cloneNode(true);
            const item = clone.querySelector('.assignment-item');
            
            item.querySelector('.class-name').textContent = assignment.class_name;
            item.querySelector('.due-date').textContent = processDate(assignment.due);
            item.querySelector('.assignment-name').textContent = assignment.name;
            item.querySelector('.assignment-points').textContent = `${assignment.points} points`;
            
            assignmentsList.appendChild(item);
        });
    }

    function renderTasks() {
        tasksList.innerHTML = '';
        tasks.forEach(task => {
            const clone = taskTemplate.content.cloneNode(true);
            const item = clone.querySelector('.task-item');
            
            item.dataset.id = task.id;
            const icon = item.querySelector('.material-icons');
            icon.textContent = task.type === 'Task' ? 'assignment' : 'track_changes';
            
            item.querySelector('.task-name').textContent = task.name;
            item.querySelector('.task-description').textContent = 
                task.description ? task.description.substring(0, 100) + '...' : '';
            
            const nextCheckin = new Date(task.checkIn_dates[0]);
            item.querySelector('.next-checkin').textContent = processDate(nextCheckin);
            item.querySelector('.task-type').textContent = task.type;
            
            item.addEventListener('click', () => showTaskDetails(task));
            
            tasksList.appendChild(item);
        });
    }

    function showTaskDetails(task) {
        currentTask = task;
        switchWindow(2);
        
        const header = taskDetails.querySelector('.task-header');
        header.querySelector('.task-name').textContent = task.name;
        header.querySelector('.task-type').textContent = task.type;
        
        taskDetails.querySelector('.task-description').textContent = task.description || '';
        
        // Render check-in dates
        const datesList = taskDetails.querySelector('.dates-list');
        datesList.innerHTML = '';
        if (task.checkIn_dates) {
            task.checkIn_dates.forEach(date => {
                const dateEl = document.createElement('div');
                dateEl.className = 'date-item';
                dateEl.textContent = processDate(date);
                datesList.appendChild(dateEl);
            });
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
    document.getElementById('add-checkin-date-btn').addEventListener('click', async () => {
        if (!currentTask) return;
        
        const date = prompt('Enter check-in date (YYYY-MM-DD):');
        if (!date) return;
        
        try {
            const data = await fetchRequest('/data', { data: 'TodoTrees' });
            if (!data.TodoTrees || !data.TodoTrees[0]) return;
            
            const treeData = data.TodoTrees[0];
            const taskIndex = treeData.nodes.findIndex(n => n.id === currentTask.id);
            
            if (taskIndex === -1) return;
            
            if (!treeData.nodes[taskIndex].checkIn_dates) {
                treeData.nodes[taskIndex].checkIn_dates = [];
            }
            
            treeData.nodes[taskIndex].checkIn_dates.push(date);
            treeData.nodes[taskIndex].checkIn_dates.sort();
            
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

    // Add new assignment
    document.getElementById('add-assignment-btn').addEventListener('click', async () => {
        // This would typically open a modal or form
        alert('Assignment creation would be implemented here');
    });

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

    // Initialize
    loadData();
}); 