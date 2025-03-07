// Class Data Manager Definition
const ClassDataManager = {
    // Fetch all classes
    async fetchAllClasses() {
        try {
            const data = await fetchRequest('/data', { data: 'Classes' });
            return data.Classes || [];
        } catch (error) {
            console.error('Error fetching classes:', error);
            throw error;
        }
    },

    // Fetch user's classes
    async fetchUserClasses(userOsis) {
        try {
            const classes = await this.fetchAllClasses();
            return classes.filter(cls => cls.OSIS.toString().includes(userOsis));
        } catch (error) {
            console.error('Error fetching user classes:', error);
            throw error;
        }
    },

    // Get unique subjects from classes
    getUniqueSubjects(classes) {
        const subjectMap = {
            'Math': 'mathematics',
            'Physics': 'physics',
            'Chemistry': 'chemistry',
            'Biology': 'biology',
            'Computer Science': 'computer-science'
        };

        const subjects = new Set();
        classes.forEach(cls => {
            const className = cls.name.toLowerCase();
            for (const [subject, value] of Object.entries(subjectMap)) {
                if (className.includes(subject.toLowerCase())) {
                    subjects.add({ name: subject, value: value });
                }
            }
        });
        return Array.from(subjects);
    },

    // Get class categories
    getClassCategories(classData) {
        try {
            if (!classData.categories) return [];
            const categories = typeof classData.categories === 'string' 
                ? JSON.parse(classData.categories) 
                : classData.categories;
            return categories.filter((_, index) => index % 2 === 0); // Filter out weights
        } catch (error) {
            console.error('Error parsing categories:', error);
            return [];
        }
    }
};

// Role Selection Handling
function selectRole(role) {
    const roleSelection = document.getElementById('role-selection');
    const tutoringContainer = document.getElementById('tutoring-container');
    const studentSection = document.getElementById('student-section');
    const tutorSection = document.getElementById('tutor-section');

    // Fade out role selection
    roleSelection.style.opacity = '0';
    roleSelection.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        roleSelection.style.display = 'none';
        tutoringContainer.style.display = 'block';
        
        // Show appropriate section based on role
        if (role === 'student') {
            studentSection.style.display = 'block';
            tutorSection.style.display = 'none';
        } else {
            studentSection.style.display = 'none';
            tutorSection.style.display = 'block';
            // Initialize tutor section if needed
            if (typeof initializeTutorSection === 'function') {
                initializeTutorSection();
            }
        }
        
        // Fade in the container
        setTimeout(() => {
            tutoringContainer.style.opacity = '1';
            tutoringContainer.style.transform = 'translateY(0)';
        }, 50);
    }, 300);
}

// Add transition styles dynamically
document.addEventListener('DOMContentLoaded', function() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .role-selection {
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .tutoring-container {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
    `;
    document.head.appendChild(styleSheet);
    
    initializeTutoring();
});

let userRole = 'student';
let availabilityData = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
};
let selectedSubjects = new Set();
let activeRequests = [];
let tutorStats = {
    completedSessions: 0,
    upcomingSessions: 0,
    averageRating: 0,
    totalHours: 0
};

async function initializeTutoring() {
    // Initialize event listeners - only if elements exist
    const requestForm = document.getElementById('tutoring-request-form');
    if (requestForm) {
        requestForm.addEventListener('submit', handleTutoringRequest);
    }

    // Remove these event listeners as they don't have corresponding elements
    // document.getElementById('toggle-availability').addEventListener('click', toggleAvailabilityCalendar);
    // document.getElementById('view-requests').addEventListener('click', loadTutoringRequests);
    // document.getElementById('save-availability').addEventListener('click', saveAvailability);
    // document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // Set minimum date for request form if it exists
    const dateInput = document.getElementById('preferred-date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }
    
    // Load initial data
    await Promise.all([
        loadUserRole(),
        loadClassData()
    ]);

    if (userRole === 'tutor') {
        const tutorSection = document.getElementById('tutorSection');
        if (tutorSection) {
            tutorSection.style.display = 'block';
            initializeTutorSection();
        }
    }

    // Initialize subject-specific topics
    initializeSubjectTopics();
}

function initializeTutorSection() {
    const tutorSection = document.getElementById('tutorSection');
    if (tutorSection) {
        tutorSection.style.display = 'block';
        initializeTimeSlots();
        initializeDayButtons();
        loadSavedAvailability();
        
        // Add event listeners for availability actions
        document.getElementById('saveAvailability').addEventListener('click', saveAvailability);
        document.getElementById('clearAvailability').addEventListener('click', clearAvailability);
    }
}

function initializeTimeSlots() {
    const timeSlotsContainer = document.querySelector('.time-slots');
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of ['00', '30']) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            const time = `${hour.toString().padStart(2, '0')}:${minute}`;
            timeSlot.textContent = time;
            timeSlot.dataset.time = time;
            
            timeSlot.addEventListener('click', () => toggleTimeSlot(timeSlot));
            timeSlotsContainer.appendChild(timeSlot);
        }
    }
}

function initializeDayButtons() {
    document.querySelectorAll('.day-btn').forEach(button => {
        button.addEventListener('click', () => toggleDayButton(button));
    });
}

function toggleDayButton(button) {
    button.classList.toggle('selected');
    updateAvailabilityDisplay();
}

function toggleTimeSlot(slot) {
    slot.classList.toggle('selected');
    updateAvailabilityDisplay();
}

function updateAvailabilityDisplay() {
    const selectedDay = document.querySelector('.day-btn.selected');
    if (!selectedDay) return;

    const day = selectedDay.dataset.day;
    availabilityData[day] = Array.from(document.querySelectorAll('.time-slot.selected'))
        .map(slot => slot.dataset.time)
        .sort();

    displayCurrentSchedule();
}

function displayCurrentSchedule() {
    const scheduleGrid = document.querySelector('.schedule-grid');
    scheduleGrid.innerHTML = '';

    Object.entries(availabilityData).forEach(([day, times]) => {
        if (times.length > 0) {
            const dayElement = document.createElement('div');
            dayElement.className = 'schedule-day';
            dayElement.innerHTML = `
                <h4><i class="fas fa-calendar-day"></i> ${capitalizeFirstLetter(day)}</h4>
                <div class="schedule-times">
                    ${times.map(time => `
                        <div class="schedule-time">
                            <i class="fas fa-clock"></i> ${time}
                        </div>
                    `).join('')}
                </div>
            `;
            scheduleGrid.appendChild(dayElement);
        }
    });
}

async function loadSavedAvailability() {
    try {
        const response = await fetchRequest('/data', { data: 'TutorAvailability' });
        const tutorAvailability = response.TutorAvailability.find(a => a.OSIS === osis);
        
        if (tutorAvailability) {
            availabilityData = tutorAvailability.availability;
            displayCurrentSchedule();
            
            // Restore selected subjects
            if (tutorAvailability.subjects) {
                selectedSubjects = new Set(tutorAvailability.subjects);
                updateSubjectCheckboxes();
            }
        }
    } catch (error) {
        console.error('Error loading saved availability:', error);
        showNotification('Error loading saved availability', 'error');
    }
}

async function saveAvailability() {
    try {
        const availabilityToSave = {
            OSIS: osis,
            availability: availabilityData,
            subjects: Array.from(selectedSubjects),
            lastUpdated: new Date().toISOString()
        };

        await fetchRequest('/post_data', {
            sheet: 'TutorAvailability',
            data: availabilityToSave
        });

        showNotification('Availability saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving availability:', error);
        showNotification('Error saving availability', 'error');
    }
}

function clearAvailability() {
    availabilityData = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: []
    };
    selectedSubjects.clear();
    
    // Clear visual selections
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    document.querySelectorAll('.subject-checkbox input').forEach(checkbox => checkbox.checked = false);
    
    displayCurrentSchedule();
    showNotification('Availability cleared', 'info');
}

function updateSubjectCheckboxes() {
    document.querySelectorAll('.subject-checkbox input').forEach(checkbox => {
        checkbox.checked = selectedSubjects.has(checkbox.value);
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
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
                const tutorSection = document.querySelector('.tutor-section');
                if (tutorSection) {
                    tutorSection.style.display = 'block';
                    loadTutorStats();
                }
            } else {
                const tutorSection = document.querySelector('.tutor-section');
                if (tutorSection) {
                    tutorSection.style.display = 'none';
                }
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

    // Get form data
    const formData = {
        id: generateRequestId(),
        student_osis: osis, // Global variable from user session
        subject: document.getElementById('subject').value,
        topic: document.getElementById('topic').value,
        preferred_date: document.getElementById('preferred-date').value,
        preferred_time: document.getElementById('preferred-time').value,
        duration: parseInt(document.getElementById('duration').value),
        description: document.getElementById('description').value,
        status: 'pending',
        tutor_osis: null,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
    };

    // Validate request timing
    if (!isValidRequestTiming(formData)) {
        showNotification('Please select a future date and time within school hours (8 AM - 6 PM)', 'error');
        return;
    }

    try {
        // Post the tutoring request to the database
        const response = await fetchRequest('/post_data', {
            sheet: 'TutoringRequests',
            data: formData
        });

        if (response.error) {
            throw new Error(response.error);
        }

        // Find available tutors for the subject
        const availableTutors = await findAvailableTutors(formData);
        
        // Notify available tutors
        if (availableTutors.length > 0) {
            await notifyTutors(availableTutors, formData);
        }

        // Show success message
        showNotification('Tutoring request submitted successfully!', 'success');
        
        // Reset form
        event.target.reset();
        
        // Update any UI elements showing pending requests
        await loadTutoringRequests();

    } catch (error) {
        console.error('Error submitting tutoring request:', error);
        showNotification('Error submitting tutoring request. Please try again.', 'error');
    }
}

function generateRequestId() {
    // Generate a random 5-digit number
    return Math.floor(10000 + Math.random() * 90000).toString();
}

function isValidRequestTiming({ preferred_date, preferred_time }) {
    const requestDateTime = new Date(`${preferred_date}T${preferred_time}`);
    const now = new Date();
    
    // Check if date is in the future
    if (requestDateTime <= now) {
        return false;
    }

    // Check if time is within school hours (8 AM - 6 PM)
    const hour = requestDateTime.getHours();
    if (hour < 8 || hour >= 18) {
        return false;
    }

    return true;
}

async function findAvailableTutors(requestData) {
    try {
        // Fetch all tutor availability records
        const response = await fetchRequest('/data', { data: 'TutorAvailability' });
        if (!response.TutorAvailability) return [];

        const dayOfWeek = new Date(requestData.preferred_date)
            .toLocaleDateString('en-US', { weekday: 'lowercase' });
        const requestTime = requestData.preferred_time;

        // Filter tutors who are:
        // 1. Active
        // 2. Can tutor the subject
        // 3. Available at the requested time
        return response.TutorAvailability.filter(tutor => {
            if (!tutor.active) return false;
            if (!tutor.subjects.includes(requestData.subject)) return false;
            
            // Check if tutor is available at the requested time
            const daySchedule = tutor.schedule[dayOfWeek] || [];
            return daySchedule.some(timeSlot => {
                const [start, end] = timeSlot.split('-');
                return requestTime >= start && requestTime <= end;
            });
        });
    } catch (error) {
        console.error('Error finding available tutors:', error);
        return [];
    }
}

async function notifyTutors(tutors, requestData) {
    try {
        // Send notifications to all available tutors
        const notifications = tutors.map(tutor => 
            fetchRequest('/send_notification', {
                OSIS: tutor.osis,
                title: 'New Tutoring Request',
                body: `New request for ${requestData.subject}: ${requestData.topic}`,
                url: '/Tutoring'
            })
        );

        await Promise.all(notifications);
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
        const subjectSelect = document.getElementById('subject');
        const subjectCheckboxes = document.querySelector('.subject-checkboxes');
        
        // Clear existing options and checkboxes
        while (subjectSelect.options.length > 1) {
            subjectSelect.remove(1);
        }
        if (subjectCheckboxes) {
            subjectCheckboxes.innerHTML = '';
        }

        // Group classes by subject
        const subjectGroups = {};
        userClasses.forEach(cls => {
            const className = cls.name.toLowerCase();
            if (className.includes('math')) {
                if (!subjectGroups.mathematics) subjectGroups.mathematics = [];
                subjectGroups.mathematics.push(cls);
            } else if (className.includes('physics')) {
                if (!subjectGroups.physics) subjectGroups.physics = [];
                subjectGroups.physics.push(cls);
            } else if (className.includes('chemistry')) {
                if (!subjectGroups.chemistry) subjectGroups.chemistry = [];
                subjectGroups.chemistry.push(cls);
            } else if (className.includes('biology')) {
                if (!subjectGroups.biology) subjectGroups.biology = [];
                subjectGroups.biology.push(cls);
            } else if (className.includes('computer')) {
                if (!subjectGroups['computer-science']) subjectGroups['computer-science'] = [];
                subjectGroups['computer-science'].push(cls);
            }
        });

        // Create option groups and checkboxes for each subject
        Object.entries(subjectGroups).forEach(([subject, classes]) => {
            // Create option group for request form
            const optgroup = document.createElement('optgroup');
            optgroup.label = subject.charAt(0).toUpperCase() + subject.slice(1).replace('-', ' ');
            
            classes.forEach(cls => {
                // Add option to request form
                const option = document.createElement('option');
                option.value = `${subject}:${cls.id}`;
                option.textContent = cls.name;
                optgroup.appendChild(option);

                // Add checkbox to tutor availability section
                if (subjectCheckboxes) {
                    const checkbox = document.createElement('label');
                    checkbox.className = 'subject-checkbox';
                    checkbox.innerHTML = `
                        <input type="checkbox" value="${cls.id}">
                        <span>${cls.name}</span>
                    `;
                    checkbox.querySelector('input').addEventListener('change', (e) => {
                        if (e.target.checked) {
                            selectedSubjects.add(cls.id);
                        } else {
                            selectedSubjects.delete(cls.id);
                        }
                    });
                    subjectCheckboxes.appendChild(checkbox);
                }
            });

            subjectSelect.appendChild(optgroup);
        });

        // Update topic suggestions based on selected class
        subjectSelect.addEventListener('change', (e) => {
            const [subject, classId] = e.target.value.split(':');
            const selectedClass = userClasses.find(cls => cls.id === classId);
            updateTopicSuggestions(subject, selectedClass);
        });

    } catch (error) {
        console.error('Error loading class data:', error);
        showNotification('Error loading classes. Please try again.', 'error');
    }
}

function updateTopicSuggestions(subject, classData) {
    const topicInput = document.getElementById('topic');
    const topicsBySubject = {
        mathematics: ['Algebra', 'Geometry', 'Calculus - Derivatives', 'Calculus - Integrals', 'Statistics', 'Trigonometry'],
        physics: ['Mechanics', 'Electricity & Magnetism', 'Waves & Optics', 'Thermodynamics', 'Modern Physics'],
        chemistry: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry'],
        biology: ['Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Physiology'],
        'computer-science': ['Programming Basics', 'Data Structures', 'Algorithms', 'Web Development', 'Database Design']
    };

    // Create or update datalist
    let datalist = document.getElementById('topic-suggestions');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'topic-suggestions';
        document.body.appendChild(datalist);
    }
    datalist.innerHTML = '';

    // Add subject-specific topics
    const topics = topicsBySubject[subject] || [];
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = `${classData.name} - ${topic}`;
        datalist.appendChild(option);
    });

    // Add class categories if available
    if (classData.categories) {
        const categories = ClassDataManager.getClassCategories(classData);
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = `${classData.name} - ${category}`;
            datalist.appendChild(option);
        });
    }

    topicInput.setAttribute('list', 'topic-suggestions');
} 