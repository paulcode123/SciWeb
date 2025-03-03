document.addEventListener('DOMContentLoaded', function() {
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

    const timelineView = document.getElementById('timelineView');
    const groupedView = document.getElementById('groupedView');
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const viewTreeBtn = document.getElementById('viewTreeBtn');
    const taskTemplate = document.getElementById('taskItemTemplate');
    
    let currentView = 'timeline';
    let tasks = [];

    // Initialize
    loadTasks().then(() => {
        // After loading tasks, check for saved state
        const savedState = sessionStorage.getItem('todoList_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Only restore if state is less than 5 minutes old
            if (Date.now() - state.timestamp < 300000) {
                // Switch to the saved view if different from current
                if (state.view !== currentView) {
                    currentView = state.view;
                    timelineView.classList.toggle('active', currentView === 'timeline');
                    groupedView.classList.toggle('active', currentView === 'grouped');
                    toggleViewBtn.querySelector('.material-icons').textContent = 
                        currentView === 'timeline' ? 'view_agenda' : 'timeline';
                }
                
                // Render the view and restore scroll position
                renderCurrentView();
                
                // Restore scroll position after a short delay to ensure content is rendered
                setTimeout(() => {
                    const scrollContainer = currentView === 'timeline' ? 
                        timelineView.querySelector('.timeline-container') : 
                        groupedView.querySelector('.grouped-container');
                    scrollContainer.scrollTop = state.scrollTop;
                }, 100);
            }
            
            // Clear the saved state
            sessionStorage.removeItem('todoList_state');
        }
    });

    // Event Listeners
    toggleViewBtn.addEventListener('click', toggleView);
    viewTreeBtn.addEventListener('click', () => {
        window.location.href = '/TodoTree';
    });

    async function loadTasks() {
        startLoading();
        try {
            const data = await fetchRequest('/data', { data: 'TodoTrees' });
            if (!data.TodoTrees || !data.TodoTrees[0]) {
                endLoading();
                return;
            }

            // Extract tasks from the tree
            tasks = data.TodoTrees[0].nodes
                .filter(node => node.type === 'Task' || node.type === 'Goal')
                .map(node => ({
                    ...node,
                    deadline: node.deadline ? new Date(node.deadline) : null,
                    targetDate: node.targetDate ? new Date(node.targetDate) : null
                }));

            // Sort tasks by date
            tasks.sort((a, b) => {
                const dateA = a.deadline || a.targetDate || new Date('9999-12-31');
                const dateB = b.deadline || b.targetDate || new Date('9999-12-31');
                return dateA - dateB;
            });

            // Render current view
            renderCurrentView();
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
        endLoading();
    }

    function renderCurrentView() {
        if (currentView === 'timeline') {
            renderTimelineView();
        } else {
            renderGroupedView();
        }
    }

    function renderTimelineView() {
        const container = timelineView.querySelector('.timeline-container');
        container.innerHTML = '';

        let currentDate = null;
        
        tasks.forEach(task => {
            const taskDate = task.deadline || task.targetDate;
            
            if (taskDate) {
                const dateStr = taskDate.toDateString();
                if (dateStr !== currentDate) {
                    currentDate = dateStr;
                    const dateMarker = document.createElement('div');
                    dateMarker.className = 'timeline-date';
                    dateMarker.textContent = formatDate(taskDate);
                    container.appendChild(dateMarker);
                }
            }
            
            container.appendChild(createTaskElement(task));
        });

        // Add tasks without dates at the end
        const tasksWithoutDates = tasks.filter(task => !task.deadline && !task.targetDate);
        if (tasksWithoutDates.length > 0) {
            const dateMarker = document.createElement('div');
            dateMarker.className = 'timeline-date';
            dateMarker.textContent = 'No Date Set';
            container.appendChild(dateMarker);
            
            tasksWithoutDates.forEach(task => {
                container.appendChild(createTaskElement(task));
            });
        }
    }

    function renderGroupedView() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Clear all groups
        document.querySelectorAll('.group-items').forEach(group => {
            group.innerHTML = '';
        });
        
        tasks.forEach(task => {
            const taskDate = task.deadline || task.targetDate;
            const taskElement = createTaskElement(task);
            
            if (!taskDate) {
                document.querySelector('.group.no-date .group-items').appendChild(taskElement);
            } else {
                const taskDateTime = new Date(taskDate);
                taskDateTime.setHours(0, 0, 0, 0);
                
                if (taskDateTime < now) {
                    document.querySelector('.group.overdue .group-items').appendChild(taskElement);
                } else if (taskDateTime.getTime() === now.getTime()) {
                    document.querySelector('.group.today .group-items').appendChild(taskElement);
                } else if (taskDateTime.getTime() === tomorrow.getTime()) {
                    document.querySelector('.group.tomorrow .group-items').appendChild(taskElement);
                } else {
                    document.querySelector('.group.upcoming .group-items').appendChild(taskElement);
                }
            }
        });

        // Hide empty groups
        document.querySelectorAll('.group').forEach(group => {
            const hasItems = group.querySelector('.group-items').children.length > 0;
            group.style.display = hasItems ? 'block' : 'none';
        });
    }

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

    async function completeTask(taskElement) {
        const taskId = taskElement.dataset.id;
        
        // Immediately start the completion animation
        taskElement.classList.add('completing');
        
        // Show the saving toast
        showSavingToast();
        
        try {
            // Get current tree data
            const data = await fetchRequest('/data', { data: 'TodoTrees' });
            if (!data.TodoTrees || !data.TodoTrees[0]) {
                hideSavingToast();
                return;
            }

            const treeData = data.TodoTrees[0];
            
            // Remove the node from the nodes array
            treeData.nodes = treeData.nodes.filter(node => node.id !== taskId);
            
            // Remove any edges connected to this node
            treeData.edges = treeData.edges.filter(edge => 
                edge.from !== taskId && edge.to !== taskId
            );

            // Update the tree in the database
            await fetchRequest('/update_data', {
                sheet: 'TodoTrees',
                data: treeData,
                row_name: 'id',
                row_value: treeData.id
            });

            // Remove the task element after animation
            setTimeout(() => {
                taskElement.remove();
                
                // Check if the group is now empty and hide it if needed
                document.querySelectorAll('.group').forEach(group => {
                    const hasItems = group.querySelector('.group-items').children.length > 0;
                    group.style.display = hasItems ? 'block' : 'none';
                });
            }, 500);

            console.log('Task completed and removed successfully');
        } catch (error) {
            console.error('Error completing task:', error);
        } finally {
            // Hide the saving toast
            hideSavingToast();
        }
    }

    function createTaskElement(task) {
        const clone = taskTemplate.content.cloneNode(true);
        const taskElement = clone.querySelector('.task-item');
        
        taskElement.dataset.id = task.id;
        taskElement.dataset.type = task.type;
        
        // Set task icon based on type
        const icon = taskElement.querySelector('.task-icon .material-icons');
        icon.textContent = task.type === 'Task' ? 'assignment' : 
                          task.type === 'Goal' ? 'track_changes' : 'stars';
        
        // Set task content
        taskElement.querySelector('.task-name').textContent = task.name;
        taskElement.querySelector('.task-description').textContent = task.description || '';
        
        // Set date and type in meta section
        const taskDate = task.deadline || task.targetDate;
        taskElement.querySelector('.task-date').textContent = taskDate ? formatDate(taskDate) : 'No date set';
        taskElement.querySelector('.task-type').textContent = task.type;
        
        // Add click handler for complete button
        taskElement.querySelector('.complete-task-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to mark this task as complete? This will remove it from your todo tree.')) {
                completeTask(taskElement);
            }
        });
        
        // Add click handler for view in tree button
        taskElement.querySelector('.view-in-tree-btn').addEventListener('click', () => {
            // Store current view and scroll position in sessionStorage
            const scrollContainer = currentView === 'timeline' ? 
                timelineView.querySelector('.timeline-container') : 
                groupedView.querySelector('.grouped-container');
            
            sessionStorage.setItem('todoList_state', JSON.stringify({
                view: currentView,
                scrollTop: scrollContainer.scrollTop,
                timestamp: Date.now() // Add timestamp to ensure state is fresh
            }));
            
            window.location.href = `/TodoTree#${task.id}`;
        });
        
        return taskElement;
    }

    function toggleView() {
        currentView = currentView === 'timeline' ? 'grouped' : 'timeline';
        
        // Update button icon
        toggleViewBtn.querySelector('.material-icons').textContent = 
            currentView === 'timeline' ? 'view_agenda' : 'timeline';
        
        // Toggle view sections
        timelineView.classList.toggle('active');
        groupedView.classList.toggle('active');
        
        // Render the current view
        renderCurrentView();
    }

    function formatDate(date) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const taskDate = new Date(date);
        taskDate.setHours(0, 0, 0, 0);
        
        if (taskDate.getTime() === now.getTime()) {
            return 'Today';
        } else if (taskDate.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return taskDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
}); 