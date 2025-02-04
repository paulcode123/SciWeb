document.addEventListener('DOMContentLoaded', function() {
    initializeTutoring();
});

let userRole = 'student'; // Will be set based on NHS membership status
let availabilityData = {};
let activeRequests = [];

function initializeTutoring() {
    // Initialize event listeners
    document.getElementById('tutoring-request-form').addEventListener('submit', handleTutoringRequest);
    document.getElementById('toggle-availability').addEventListener('click', toggleAvailabilityCalendar);
    document.getElementById('view-requests').addEventListener('click', loadTutoringRequests);
    document.getElementById('save-availability').addEventListener('click', saveAvailability);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // Set minimum date for request form
    const dateInput = document.getElementById('preferred-date');
    dateInput.min = new Date().toISOString().split('T')[0];
    
    // Load initial data
    loadUserRole();
    if (userRole === 'tutor') {
        loadTutorDashboard();
    }
}

async function loadUserRole() {
    try {
        const userData = await fetchRequest('/data', { data: 'Users' });
        // Check if user is NHS member/tutor
        if (userData && userData.Users) {
            const currentUser = userData.Users.find(user => user.osis === osis);
            if (currentUser && currentUser.nhs_member) {
                userRole = 'tutor';
                document.querySelector('.tutor-section').style.display = 'block';
            } else {
                document.querySelector('.tutor-section').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading user role:', error);
    }
}

async function handleTutoringRequest(event) {
    event.preventDefault();
    
    const requestData = {
        subject: document.getElementById('subject').value,
        topic: document.getElementById('topic').value,
        date: document.getElementById('preferred-date').value,
        time: document.getElementById('preferred-time').value,
        duration: document.getElementById('duration').value,
        description: document.getElementById('description').value,
        status: 'pending',
        studentOSIS: osis,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Save request to database
        await fetchRequest('/post_data', {
            sheet: 'TutoringRequests',
            data: requestData
        });
        
        // Find available tutors
        const availableTutors = await findAvailableTutors(requestData);
        
        // Send notifications to available tutors
        if (availableTutors.length > 0) {
            await notifyTutors(availableTutors, requestData);
            showNotification('Request submitted successfully! Tutors will be notified.');
        } else {
            showNotification('Request submitted, but no tutors are available at this time. Please try a different time slot.');
        }
        
        // Clear form
        event.target.reset();
        
    } catch (error) {
        console.error('Error submitting tutoring request:', error);
        showNotification('Error submitting request. Please try again.');
    }
}

async function findAvailableTutors(requestData) {
    try {
        const tutorData = await fetchRequest('/data', { data: 'TutorAvailability' });
        const requestDateTime = new Date(`${requestData.date}T${requestData.time}`);
        const requestDay = requestDateTime.getDay();
        
        return tutorData.TutorAvailability.filter(tutor => {
            if (!tutor.availability || !tutor.availability[requestDay]) return false;
            
            const timeSlots = tutor.availability[requestDay];
            return timeSlots.some(slot => {
                const [start, end] = slot.split('-');
                const slotStart = new Date(`${requestData.date}T${start}`);
                const slotEnd = new Date(`${requestData.date}T${end}`);
                return requestDateTime >= slotStart && requestDateTime <= slotEnd;
            });
        });
    } catch (error) {
        console.error('Error finding available tutors:', error);
        return [];
    }
}

async function notifyTutors(tutors, requestData) {
    const notificationData = {
        title: 'New Tutoring Request',
        body: `Subject: ${requestData.subject} - ${requestData.topic}`,
        url: '/Tutoring',
        OSIS: tutors.map(tutor => tutor.OSIS)
    };
    
    try {
        await fetchRequest('/send_notification', notificationData);
    } catch (error) {
        console.error('Error notifying tutors:', error);
    }
}

function toggleAvailabilityCalendar() {
    const calendar = document.getElementById('availability-calendar');
    const isHidden = calendar.style.display === 'none';
    
    if (isHidden) {
        calendar.style.display = 'block';
        loadWeeklySchedule();
    } else {
        calendar.style.display = 'none';
    }
}

function loadWeeklySchedule() {
    const weeklySchedule = document.querySelector('.weekly-schedule');
    weeklySchedule.innerHTML = '';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = generateTimeSlots();
    
    days.forEach((day, index) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dayColumn.appendChild(dayHeader);
        
        timeSlots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = slot;
            timeSlot.dataset.day = index;
            timeSlot.dataset.time = slot;
            
            if (availabilityData[index] && availabilityData[index].includes(slot)) {
                timeSlot.classList.add('selected');
            }
            
            timeSlot.addEventListener('click', () => toggleTimeSlot(timeSlot));
            dayColumn.appendChild(timeSlot);
        });
        
        weeklySchedule.appendChild(dayColumn);
    });
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
}

function toggleTimeSlot(slot) {
    slot.classList.toggle('selected');
    const day = parseInt(slot.dataset.day);
    const time = slot.dataset.time;
    
    if (!availabilityData[day]) {
        availabilityData[day] = [];
    }
    
    const index = availabilityData[day].indexOf(time);
    if (index === -1) {
        availabilityData[day].push(time);
    } else {
        availabilityData[day].splice(index, 1);
    }
}

async function saveAvailability() {
    try {
        await fetchRequest('/post_data', {
            sheet: 'TutorAvailability',
            data: {
                OSIS: osis,
                availability: availabilityData
            }
        });
        showNotification('Availability saved successfully!');
    } catch (error) {
        console.error('Error saving availability:', error);
        showNotification('Error saving availability. Please try again.');
    }
}

async function loadTutoringRequests() {
    try {
        const data = await fetchRequest('/data', { data: 'TutoringRequests' });
        const requestsGrid = document.querySelector('.requests-grid');
        requestsGrid.innerHTML = '';
        
        activeRequests = data.TutoringRequests.filter(request => request.status === 'pending');
        
        activeRequests.forEach(request => {
            const card = createRequestCard(request);
            requestsGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading tutoring requests:', error);
    }
}

function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'request-card';
    
    const date = new Date(request.date + 'T' + request.time);
    
    card.innerHTML = `
        <h4>${request.subject}</h4>
        <div class="request-info">
            <p><strong>Topic:</strong> ${request.topic}</p>
            <p><strong>Date:</strong> ${date.toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString()}</p>
            <p><strong>Duration:</strong> ${request.duration} minutes</p>
        </div>
        <div class="request-actions">
            <button class="primary-btn" onclick="acceptRequest('${request.id}')">Accept</button>
            <button class="secondary-btn" onclick="declineRequest('${request.id}')">Decline</button>
        </div>
    `;
    
    return card;
}

async function acceptRequest(requestId) {
    try {
        const request = activeRequests.find(r => r.id === requestId);
        if (!request) return;
        
        await fetchRequest('/post_data', {
            sheet: 'TutoringRequests',
            data: {
                ...request,
                status: 'accepted',
                tutorOSIS: osis
            }
        });
        
        // Notify student
        await fetchRequest('/send_notification', {
            title: 'Tutoring Request Accepted',
            body: `Your tutoring request for ${request.subject} has been accepted!`,
            url: '/Tutoring',
            OSIS: [request.studentOSIS]
        });
        
        showNotification('Request accepted successfully!');
        loadTutoringRequests();
    } catch (error) {
        console.error('Error accepting request:', error);
        showNotification('Error accepting request. Please try again.');
    }
}

async function declineRequest(requestId) {
    try {
        const request = activeRequests.find(r => r.id === requestId);
        if (!request) return;
        
        await fetchRequest('/post_data', {
            sheet: 'TutoringRequests',
            data: {
                ...request,
                status: 'declined',
                tutorOSIS: osis
            }
        });
        
        showNotification('Request declined.');
        loadTutoringRequests();
    } catch (error) {
        console.error('Error declining request:', error);
        showNotification('Error declining request. Please try again.');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
} 