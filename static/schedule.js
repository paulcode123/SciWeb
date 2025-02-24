document.addEventListener('DOMContentLoaded', function() {
    let schedule = {};

    // Load initial data
    loadData();

    // Initialize split toggles
    initializeSplitToggles();

    async function loadData() {
        try {
            // Get existing schedule if available
            const data = await fetchRequest('/data', { data: 'Schedule' });
            if (data.Schedule && data.Schedule.length > 0) {
                schedule = data.Schedule[0];
                loadExistingSchedule();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function initializeSplitToggles() {
        document.querySelectorAll('.split-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const periodRow = this.closest('.period-row');
                const splitSlots = periodRow.querySelector('.split-slots');
                const mainSelect = periodRow.querySelector('.main-select');
                
                splitSlots.classList.toggle('hidden', !this.checked);
                mainSelect.disabled = this.checked;

                if (this.checked) {
                    // When splitting, copy the main class to all split slots
                    const selectedClass = mainSelect.value;
                    periodRow.querySelectorAll('.split-select').forEach(select => {
                        select.value = selectedClass;
                    });

                    // Add animation class to split slots
                    splitSlots.classList.add('fade-in');
                    setTimeout(() => splitSlots.classList.remove('fade-in'), 300);
                } else {
                    // When combining, use the first non-empty split class for main
                    const splitSelects = periodRow.querySelectorAll('.split-select');
                    const firstClass = Array.from(splitSelects).find(select => select.value)?.value || '';
                    mainSelect.value = firstClass;
                }

                updateScheduleData(periodRow);
            });
        });
    }

    function handleClassChange(event) {
        const select = event.target;
        const periodRow = select.closest('.period-row');
        
        if (select.classList.contains('main-select')) {
            // If changing main select, update all split selects if they're not split
            const splitCheckbox = periodRow.querySelector('.split-checkbox');
            if (!splitCheckbox.checked) {
                periodRow.querySelectorAll('.split-select').forEach(splitSelect => {
                    splitSelect.value = select.value;
                });
            }
        }

        updateScheduleData(periodRow);
    }

    function updateScheduleData(periodRow) {
        const period = periodRow.dataset.period;
        const mainSelect = periodRow.querySelector('.main-select');
        const splitCheckbox = periodRow.querySelector('.split-checkbox');
        
        if (!schedule.classes) {
            schedule.classes = {};
        }

        if (!splitCheckbox.checked) {
            // Use main select value for all days
            const className = mainSelect.value;
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                if (!schedule.classes[day]) {
                    schedule.classes[day] = {};
                }
                schedule.classes[day][period] = className;
            });
        } else {
            // Use individual split select values
            periodRow.querySelectorAll('.split-select').forEach(select => {
                const day = select.dataset.day;
                if (!schedule.classes[day]) {
                    schedule.classes[day] = {};
                }
                schedule.classes[day][period] = select.value;
            });
        }
    }

    function loadExistingSchedule() {
        if (!schedule.classes) return;

        document.querySelectorAll('.period-row').forEach(periodRow => {
            const period = periodRow.dataset.period;
            const mainSelect = periodRow.querySelector('.main-select');
            const splitCheckbox = periodRow.querySelector('.split-checkbox');
            const splitSlots = periodRow.querySelector('.split-slots');
            const splitSelects = periodRow.querySelectorAll('.split-select');
            
            // Check if period has split schedule
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            const classes = days.map(day => schedule.classes[day]?.[period]);
            const uniqueClasses = new Set(classes.filter(Boolean));

            if (uniqueClasses.size <= 1) {
                // All days have same class or no class
                mainSelect.value = classes[0] || '';
                splitSlots.classList.add('hidden');
                splitCheckbox.checked = false;
                splitSelects.forEach(select => {
                    select.value = classes[0] || '';
                });
            } else {
                // Days have different classes
                splitCheckbox.checked = true;
                splitSlots.classList.remove('hidden');
                mainSelect.disabled = true;
                
                // Set individual day values
                splitSelects.forEach(select => {
                    const day = select.dataset.day;
                    select.value = schedule.classes[day]?.[period] || '';
                });
            }
        });
    }

    // Add change event listeners to all select elements
    document.querySelectorAll('.class-select').forEach(select => {
        select.addEventListener('change', handleClassChange);
    });

    // Save schedule button handler
    document.getElementById('saveSchedule').addEventListener('click', async function() {
        try {
            const privacySetting = document.getElementById('schedulePrivacy').value;
            
            // Prepare schedule data
            const scheduleData = {
                ...schedule,
                privacy: privacySetting,
                lastUpdated: new Date().toISOString()
            };

            // Save to database
            await fetchRequest('/post_data', {
                sheet: 'Schedule',
                data: scheduleData
            });

            showNotification('Schedule saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving schedule:', error);
            showNotification('Failed to save schedule. Please try again.', 'error');
        }
    });

    // Load friend schedules if public/friends only
    async function loadFriendSchedules() {
        try {
            const friendSchedules = await fetchRequest('/data', { data: 'Schedule' });
            const friendSchedulesContainer = document.getElementById('friendSchedules');
            friendSchedulesContainer.innerHTML = '';

            friendSchedules.forEach(schedule => {
                if (schedule.privacy === 'public' || 
                    (schedule.privacy === 'friends' /* && check if friend */)) {
                    const scheduleElement = createFriendScheduleElement(schedule);
                    friendSchedulesContainer.appendChild(scheduleElement);
                }
            });
        } catch (error) {
            console.error('Error loading friend schedules:', error);
        }
    }

    function createFriendScheduleElement(schedule) {
        const div = document.createElement('div');
        div.className = 'friend-schedule';
        // Add friend schedule visualization here
        return div;
    }

    // Initial load of friend schedules
    loadFriendSchedules();
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 