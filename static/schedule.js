document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let draggedItem = null;
    let assignments = [];
    let aspirations = [];

    // Initialize the calendar
    initializeCalendar();
    loadItems();

    // Event listeners for week navigation
    document.getElementById('prev-week').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => navigateWeek(1));

    // Load assignments, aspirations, and study blocks
    async function loadItems() {
        // Fetch assignments
        const data = await fetchRequest('/data', { data: "Classes, Assignments, Aspirations" });
        assignments = data.Assignments;
        aspirations = data.Aspirations;

        displayAssignments(assignments);
        displayAspirations(aspirations);

        // Create study blocks from assignments
        createStudyBlocks(assignments);
    }

    function displayAssignments(assignments) {
        const container = document.getElementById('assignments-list');
        container.innerHTML = '';

        assignments.forEach(assignment => {
            const element = createDraggableItem({
                type: 'assignment',
                title: assignment.name,
                dueDate: assignment.due,
                data: assignment
            });
            container.appendChild(element);
        });
    }

    function displayAspirations(aspirations) {
        const container = document.getElementById('aspirations-list');
        container.innerHTML = '';

        aspirations.forEach(aspiration => {
            aspiration.steps.forEach(step => {
                const element = createDraggableItem({
                    type: 'aspiration',
                    title: step.text,
                    dueDate: step.time,
                    data: { ...aspiration, step }
                });
                container.appendChild(element);
            });
        });
    }

    function createStudyBlocks(assignments) {
        const container = document.getElementById('study-blocks');
        container.innerHTML = '';

        assignments.forEach(assignment => {
            if (assignment.category && 
                (assignment.category.toLowerCase().includes('test') || 
                assignment.category.toLowerCase().includes('assess'))) {
                const element = createDraggableItem({
                    type: 'study',
                    title: `Study: ${assignment.name}`,
                    dueDate: assignment.due,
                    data: assignment
                });
                container.appendChild(element);
            }
        });
    }

    function createDraggableItem(item) {
        const element = document.createElement('div');
        element.className = 'draggable-item';
        element.draggable = true;
        element.innerHTML = `
            <div class="item-title">${item.title}</div>
            <div class="item-due">Due: ${item.dueDate}</div>
        `;

        element.addEventListener('dragstart', (e) => {
            draggedItem = item;
            e.dataTransfer.setData('text/plain', '');
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });

        return element;
    }

    function initializeCalendar() {
        // Add drag and drop listeners to all time slots
        const timeSlots = document.querySelectorAll('.time-slot');
        
        timeSlots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => handleDrop(e, slot));
        });

        updateWeekDisplay();
    }

    function handleDrop(e, slot) {
        e.preventDefault();
        slot.classList.remove('drag-over');

        if (!draggedItem) return;

        const taskElement = document.createElement('div');
        taskElement.className = `scheduled-task ${draggedItem.type}`;
        
        // Calculate height based on duration (default 1 hour)
        const duration = draggedItem.duration || 1;
        taskElement.style.height = `${duration * 60}px`;
        
        taskElement.innerHTML = `
            <div class="task-title">${draggedItem.title}</div>
            <div class="task-time">${slot.dataset.hour}:00</div>
        `;

        // Add hover info for assignments
        if (draggedItem.type === 'assignment') {
            const hoverInfo = document.createElement('div');
            hoverInfo.className = 'task-hover-info';
            hoverInfo.innerHTML = `
                <div>Avg Time: ${calculateAverage(draggedItem.data.time_spent)} hrs</div>
                <div>Difficulty: ${calculateAverage(draggedItem.data.difficulty)}/5</div>
                <div>Completion: ${calculateCompletion(draggedItem.data.completed)}%</div>
            `;
            taskElement.appendChild(hoverInfo);
        }

        slot.appendChild(taskElement);
        draggedItem = null;
    }

    // Utility functions
    function calculateAverage(data) {
        if (!data || typeof data !== 'object') return 0;
        const values = Object.values(data);
        return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    }

    function calculateCompletion(data) {
        if (!data || typeof data !== 'object') return 0;
        const values = Object.values(data);
        return ((values.filter(v => v).length / values.length) * 100).toFixed(0);
    }

    function navigateWeek(direction) {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
        updateWeekDisplay();
    }

    function updateWeekDisplay() {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        document.getElementById('current-week').textContent = 
            `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    }
}); 