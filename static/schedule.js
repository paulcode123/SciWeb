document.addEventListener('DOMContentLoaded', function() {
    let schedule = {};

    // Load initial data
    loadData();

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

    function handleClassChange(event) {
        const select = event.target;
        const period = select.dataset.period;
        const day = select.dataset.day;
        
        // Update the schedule object
        if (!schedule.classes) {
            schedule.classes = {};
        }
        if (!schedule.classes[day]) {
            schedule.classes[day] = {};
        }
        
        schedule.classes[day][period] = select.value;
    }

    function loadExistingSchedule() {
        if (!schedule.classes) return;

        Object.entries(schedule.classes).forEach(([day, periods]) => {
            Object.entries(periods).forEach(([period, className]) => {
                const select = document.querySelector(`.class-select[data-period="${period}"][data-day="${day}"]`);
                if (select) {
                    select.value = className;
                }
            });
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

            alert('Schedule saved successfully!');
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule. Please try again.');
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