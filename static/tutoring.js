document.addEventListener('DOMContentLoaded', function() {
    initializeTutoring();
});

let userRole = 'student';
let availabilityData = {};
let activeRequests = [];
let tutorStats = {
    completedSessions: 0,
    upcomingSessions: 0,
    averageRating: 0,
    totalHours: 0
};

async function initializeTutoring() {
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
    await Promise.all([
        loadUserRole(),
        loadClassData()
    ]);

    if (userRole === 'tutor') {
        loadTutorDashboard();
        initializeStatsRefresh();
    }

    // Initialize subject-specific topics
    initializeSubjectTopics();
}

function initializeSubjectTopics() {
    const subjectSelect = document.getElementById('subject');
    const topicInput = document.getElementById('topic');
    
    const topicsBySubject = {
        math: ['Algebra', 'Geometry', 'Calculus - Derivatives', 'Calculus - Integrals', 'Statistics', 'Trigonometry'],
        physics: ['Mechanics', 'Electricity & Magnetism', 'Waves & Optics', 'Thermodynamics', 'Modern Physics'],
        chemistry: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry'],
        biology: ['Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Physiology'],
        'computer-science': ['Programming Basics', 'Data Structures', 'Algorithms', 'Web Development', 'Database Design']
    };

    subjectSelect.addEventListener('change', () => {
        const topics = topicsBySubject[subjectSelect.value] || [];
        const datalist = document.createElement('datalist');
        datalist.id = 'topic-suggestions';
        
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            datalist.appendChild(option);
        });

        // Remove existing datalist if any
        const existingDatalist = document.getElementById('topic-suggestions');
        if (existingDatalist) {
            existingDatalist.remove();
        }

        document.body.appendChild(datalist);
        topicInput.setAttribute('list', 'topic-suggestions');
    });
}

async function loadUserRole() {
    try {
        const userData = await fetchRequest('/data', { data: 'Users' });
        if (userData && userData.Users) {
            const currentUser = userData.Users.find(user => user.osis === osis);
            if (currentUser && currentUser.nhs_member) {
                userRole = 'tutor';
                document.querySelector('.tutor-section').style.display = 'block';
                loadTutorStats();
            } else {
                document.querySelector('.tutor-section').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading user role:', error);
        showNotification('Error loading user data', 'error');
    }
}

async function loadTutorStats() {
    try {
        const [sessions, ratings] = await Promise.all([
            fetchRequest('/data', { data: 'TutoringSessions' }),
            fetchRequest('/data', { data: 'TutorRatings' })
        ]);

        const userSessions = sessions.TutoringSessions.filter(session => session.tutorOSIS === osis);
        const userRatings = ratings.TutorRatings.filter(rating => rating.tutorOSIS === osis);

        tutorStats.completedSessions = userSessions.filter(session => session.status === 'completed').length;
        tutorStats.upcomingSessions = userSessions.filter(session => session.status === 'scheduled').length;
        tutorStats.totalHours = calculateTotalHours(userSessions);
        tutorStats.averageRating = calculateAverageRating(userRatings);

        updateStatsDisplay();
    } catch (error) {
        console.error('Error loading tutor stats:', error);
        showNotification('Error loading tutor statistics', 'error');
    }
}

function calculateTotalHours(sessions) {
    return sessions.reduce((total, session) => {
        if (session.status === 'completed') {
            return total + (parseInt(session.duration) / 60);
        }
        return total;
    }, 0);
}

function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((total, rating) => total + rating.score, 0);
    return (sum / ratings.length).toFixed(1);
}

function updateStatsDisplay() {
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    
    const stats = [
        { label: 'Completed Sessions', value: tutorStats.completedSessions, icon: 'check-circle' },
        { label: 'Upcoming Sessions', value: tutorStats.upcomingSessions, icon: 'calendar' },
        { label: 'Total Hours', value: tutorStats.totalHours.toFixed(1), icon: 'clock' },
        { label: 'Average Rating', value: tutorStats.averageRating, icon: 'star' }
    ];

    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-value"><i class="fas fa-${stat.icon}"></i> ${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
        statsGrid.appendChild(card);
    });

    // Insert stats grid after tutor controls
    const tutorControls = document.querySelector('.tutor-controls');
    tutorControls.parentNode.insertBefore(statsGrid, tutorControls.nextSibling);
}

function initializeStatsRefresh() {
    // Refresh stats every 5 minutes
    setInterval(loadTutorStats, 300000);
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
        timestamp: new Date().toISOString(),
        id: generateRequestId()
    };
    
    try {
        // Validate request timing
        if (!isValidRequestTiming(requestData)) {
            showNotification('Please select a future date and time', 'warning');
            return;
        }

        // Save request to database
        await fetchRequest('/post_data', {
            sheet: 'TutoringRequests',
            data: requestData
        });
        
        // Find available tutors
        const availableTutors = await findAvailableTutors(requestData);
        
        if (availableTutors.length > 0) {
            await notifyTutors(availableTutors, requestData);
            showNotification('Request submitted successfully! Tutors will be notified.', 'success');
        } else {
            showNotification('Request submitted, but no tutors are currently available. Please try a different time slot.', 'warning');
        }
        
        event.target.reset();
        
    } catch (error) {
        console.error('Error submitting tutoring request:', error);
        showNotification('Error submitting request. Please try again.', 'error');
    }
}

function isValidRequestTiming(requestData) {
    const requestDateTime = new Date(`${requestData.date}T${requestData.time}`);
    const now = new Date();
    return requestDateTime > now;
}

function generateRequestId() {
    return 'req_' + Math.random().toString(36).substr(2, 9);
}

async function findAvailableTutors(requestData) {
    try {
        const [tutorData, subjects] = await Promise.all([
            fetchRequest('/data', { data: 'TutorAvailability' }),
            fetchRequest('/data', { data: 'TutorSubjects' })
        ]);

        const requestDateTime = new Date(`${requestData.date}T${requestData.time}`);
        const requestDay = requestDateTime.getDay();
        
        return tutorData.TutorAvailability.filter(tutor => {
            // Check subject expertise
            const tutorSubjects = subjects.TutorSubjects.find(s => s.OSIS === tutor.OSIS);
            if (!tutorSubjects || !tutorSubjects.subjects.includes(requestData.subject)) {
                return false;
            }

            // Check availability
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
        body: `Subject: ${requestData.subject} - ${requestData.topic}\nDate: ${new Date(requestData.date).toLocaleDateString()}`,
        url: '/Tutoring',
        OSIS: tutors.map(tutor => tutor.OSIS)
    };
    
    try {
        await fetchRequest('/send_notification', notificationData);
    } catch (error) {
        console.error('Error notifying tutors:', error);
        showNotification('Error notifying tutors', 'error');
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
        dayHeader.innerHTML = `<i class="fas fa-calendar-day"></i> ${day}`;
        dayColumn.appendChild(dayHeader);
        
        timeSlots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.innerHTML = `<i class="fas fa-clock"></i> ${slot}`;
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
        availabilityData[day].sort();
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
                availability: availabilityData,
                lastUpdated: new Date().toISOString()
            }
        });
        showNotification('Availability saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving availability:', error);
        showNotification('Error saving availability. Please try again.', 'error');
    }
}

async function loadTutoringRequests() {
    try {
        const data = await fetchRequest('/data', { data: 'TutoringRequests' });
        const requestsGrid = document.querySelector('.requests-grid');
        requestsGrid.innerHTML = '';
        
        activeRequests = data.TutoringRequests.filter(request => 
            request.status === 'pending' && isValidRequest(request));
        
        if (activeRequests.length === 0) {
            requestsGrid.innerHTML = `
                <div class="no-requests">
                    <i class="fas fa-inbox"></i>
                    <p>No pending requests at this time</p>
                </div>
            `;
            return;
        }

        activeRequests.forEach(request => {
            const card = createRequestCard(request);
            requestsGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading tutoring requests:', error);
        showNotification('Error loading requests', 'error');
    }
}

function isValidRequest(request) {
    const requestDateTime = new Date(`${request.date}T${request.time}`);
    return requestDateTime > new Date();
}

function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'request-card';
    
    const date = new Date(`${request.date}T${request.time}`);
    
    card.innerHTML = `
        <h4><i class="fas fa-book"></i> ${request.subject}</h4>
        <div class="request-info">
            <p><i class="fas fa-tag"></i> ${request.topic}</p>
            <p><i class="fas fa-calendar"></i> ${date.toLocaleDateString()}</p>
            <p><i class="fas fa-clock"></i> ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p><i class="fas fa-hourglass-half"></i> ${request.duration} minutes</p>
            <p><i class="fas fa-align-left"></i> ${request.description}</p>
        </div>
        <div class="request-actions">
            <button class="primary-btn" onclick="acceptRequest('${request.id}')">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="secondary-btn" onclick="declineRequest('${request.id}')">
                <i class="fas fa-times"></i> Decline
            </button>
        </div>
        <span class="status-badge status-${request.status}">
            <i class="fas fa-circle"></i> ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
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
                tutorOSIS: osis,
                acceptedAt: new Date().toISOString()
            }
        });
        
        // Create a tutoring session
        await fetchRequest('/post_data', {
            sheet: 'TutoringSessions',
            data: {
                requestId: request.id,
                tutorOSIS: osis,
                studentOSIS: request.studentOSIS,
                subject: request.subject,
                topic: request.topic,
                date: request.date,
                time: request.time,
                duration: request.duration,
                status: 'scheduled'
            }
        });
        
        // Notify student
        await fetchRequest('/send_notification', {
            title: 'Tutoring Request Accepted',
            body: `Your tutoring request for ${request.subject} has been accepted! Date: ${new Date(request.date).toLocaleDateString()}`,
            url: '/Tutoring',
            OSIS: [request.studentOSIS]
        });
        
        showNotification('Request accepted successfully!', 'success');
        loadTutoringRequests();
        loadTutorStats();
    } catch (error) {
        console.error('Error accepting request:', error);
        showNotification('Error accepting request. Please try again.', 'error');
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
                tutorOSIS: osis,
                declinedAt: new Date().toISOString()
            }
        });
        
        showNotification('Request declined', 'info');
        loadTutoringRequests();
    } catch (error) {
        console.error('Error declining request:', error);
        showNotification('Error declining request. Please try again.', 'error');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

async function loadClassData() {
    try {
        const userClasses = await ClassDataManager.fetchUserClasses(osis);
        const subjects = ClassDataManager.getUniqueSubjects(userClasses);
        const subjectSelect = document.getElementById('subject');
        ClassDataManager.populateSubjectSelect(subjectSelect, subjects);
    } catch (error) {
        console.error('Error loading class data:', error);
        showNotification('Error loading classes. Please try again.', 'error');
    }
} 