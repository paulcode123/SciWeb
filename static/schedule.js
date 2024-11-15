document.addEventListener('DOMContentLoaded', function() {
    let calendar;
    let assignments = [];
    let aspirations = [];

    // Initialize the calendar
    initializeCalendar();
    loadItems();

    async function loadItems() {
        const data = await fetchRequest('/data', { data: "Classes, Assignments, Aspirations" });
        assignments = data.Assignments;
        aspirations = data.Aspirations;

        displayAssignments(assignments);
        displayAspirations(aspirations);
        createStudyBlocks(assignments);
    }

    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            slotMinTime: '08:00:00',
            slotMaxTime: '22:00:00',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,timeGridDay'
            },
            editable: true,
            droppable: true,
            eventClick: function(info) {
                if (confirm(`Delete "${info.event.title}"?`)) {
                    info.event.remove();
                }
            },
            drop: function(info) {
                // Handle the drop event
                const draggedEl = info.draggedEl;
                const itemData = JSON.parse(draggedEl.dataset.item);
                
                // Create the event
                calendar.addEvent({
                    title: itemData.title,
                    start: info.date,
                    end: new Date(info.date.getTime() + (itemData.duration || 1) * 3600000),
                    backgroundColor: getEventColor(itemData.type),
                    extendedProps: itemData
                });
            },
            eventAdd: function(info) {
                saveEventToDatabase(info.event);
            },
            eventChange: function(info) {
                updateEventToDatabase(info.event);
            },
            eventRemove: function(info) {
                deleteEventFromDatabase(info.event);
            }
        });
        
        // Load saved events when calendar initializes
        loadSavedEvents();
        calendar.render();
    }

    async function saveEventToDatabase(event) {
        const eventData = {
            OSIS: parseInt(osis),
            id: event.id,
            title: event.title,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
            type: event.extendedProps.type,
            backgroundColor: event.backgroundColor,
            // Include any other custom properties you need
            originalData: event.extendedProps.data
        };

        
        fetchRequest('/post_data', { data: eventData, sheet: 'Calendar' });
    }

    function deleteEventFromDatabase(event) {
        
        fetchRequest('/delete_data', { row_value: event.id, row_name: 'id', sheet: 'Calendar' });
    }

    function updateEventToDatabase(event) {
        const eventData = {
            OSIS: parseInt(osis),
            id: event.id,
            title: event.title,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
            type: event.extendedProps.type,
            backgroundColor: event.backgroundColor,
            // Include any other custom properties you need
            originalData: event.extendedProps.data
        };
        fetchRequest('/update_data', { row_value: event.id, row_name: 'id', data: eventData, sheet: 'Calendar' });
    }

    async function loadSavedEvents() {
        try {
            const data = await fetchRequest('/data', { data: 'Calendar' });
            const events = data.Calendar;
            
            events.forEach(event => {
                calendar.addEvent({
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    backgroundColor: event.backgroundColor,
                    extendedProps: {
                        type: event.type,
                        data: event.originalData
                    }
                });
            });
        } catch (error) {
            console.error('Failed to load events:', error);
        }
    }

    // Modified createDraggableItem function
    function createDraggableItem(item) {
        const element = document.createElement('div');
        element.className = 'draggable-item fc-event';
        element.draggable = true;
        element.innerHTML = `
            <div class="item-title">${item.title}</div>
            <div class="item-due">Due: ${item.dueDate}</div>
        `;
        
        // Store item data
        element.dataset.item = JSON.stringify({
            title: item.title,
            type: item.type,
            duration: item.duration || 1,
            data: item.data
        });

        // Initialize as FullCalendar external event
        new FullCalendar.Draggable(element, {
            revert: true,
            helper: 'clone'
        });

        return element;
    }

    // Utility function to get event colors
    function getEventColor(type) {
        const colors = {
            assignment: 'var(--assignment-color)',
            study: 'var(--study-color)',
            aspiration: 'var(--aspiration-color)',
            custom: 'var(--task-color)'
        };
        return colors[type] || colors.custom;
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
                assignment.category.toLowerCase().includes('assess') || 
                assignment.category.toLowerCase().includes('exam') || 
                assignment.category.toLowerCase().includes('project') || 
                assignment.category.toLowerCase().includes('quiz'))) {
                const element = createDraggableItem({
                    type: 'study',
                    title: `Study: ${assignment.name}`,
                    dueDate: assignment.due_date,
                    data: assignment
                });
                container.appendChild(element);
            }
        });
    }
}); 