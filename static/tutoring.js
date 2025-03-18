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

    // Animate out role selection
    roleSelection.style.opacity = '0';
    roleSelection.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        roleSelection.style.display = 'none';
        
        // Set up tutoring container before animation
        tutoringContainer.style.display = 'block';
        tutoringContainer.style.opacity = '0';
        tutoringContainer.style.transform = 'translateY(20px)';
        
        // Trigger animation
        requestAnimationFrame(() => {
            tutoringContainer.style.opacity = '1';
            tutoringContainer.style.transform = 'translateY(0)';
        });

        // Show appropriate section
        const showSection = role === 'student' ? studentSection : tutorSection;
        const hideSection = role === 'student' ? tutorSection : studentSection;
        
        showSection.style.display = 'block';
        hideSection.style.display = 'none';
        
        if (role === 'tutor' && typeof initializeTutorSection === 'function') {
            initializeTutorSection();
        }
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
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Set initial states
    const tutoringContainer = document.getElementById('tutoring-container');
    tutoringContainer.style.opacity = '0';
    tutoringContainer.style.transform = 'translateY(20px)';
    
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

    // Initialize class selection
    await initializeClassSelect();
    
    // Initialize subjects panel for tutors
    if (userRole === 'tutor') {
        await initializeSubjectsPanel();
    }
}

function initializeTutorSection() {
    const tutorSection = document.getElementById('tutor-section');
    if (!tutorSection) {
        console.error('Tutor section not found');
        return;
    }

    // Initialize availability section
    initializeAvailabilitySection();
    
    // Load tutor stats
    loadTutorStats();
    
    // Load active tutoring requests
    loadTutoringRequests();

    // Add event listeners for availability actions
    const saveBtn = document.getElementById('saveAvailability');
    const clearBtn = document.getElementById('clearAvailability');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAvailability);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAvailability);
    }
}

function initializeAvailabilitySection() {
    const availabilityPanel = document.querySelector('.availability-panel');
    if (!availabilityPanel) return;

    // Initialize time slots
    initializeTimeSlots();
    
    // Initialize day buttons
    initializeDayButtons();
    
    // Load saved availability
    loadSavedAvailability();
    
    // Initialize subjects panel
    initializeSubjectsPanel();
}

async function initializeSubjectsPanel() {
    const subjectCheckboxes = document.querySelector('.subject-checkboxes');
    if (!subjectCheckboxes) return;

    try {
        // Fetch user's classes
        const response = await fetchRequest('/data', { data: 'Classes' });
        const classes = response.Classes || [];
        
        // Get unique subjects from classes
        const subjects = new Set(classes.map(cls => cls.subject).filter(Boolean));
        
        // Create checkboxes for each subject
        subjects.forEach(subject => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'subject-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `subject-${subject}`;
            checkbox.value = subject;
            checkbox.checked = selectedSubjects.has(subject);
            
            const label = document.createElement('label');
            label.htmlFor = `subject-${subject}`;
            label.textContent = subject;
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedSubjects.add(subject);
                } else {
                    selectedSubjects.delete(subject);
                }
            });
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            subjectCheckboxes.appendChild(checkboxDiv);
        });
    } catch (error) {
        console.error('Error initializing subjects panel:', error);
        showNotification('Error loading subjects', 'error');
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

        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();

        const userSessions = sessions.TutoringSessions.filter(session => 
            session.tutorOSIS === userOsis
        );
        const userRatings = ratings.TutorRatings.filter(rating => 
            rating.tutorOSIS === userOsis
        );

        // Update tutor stats
        tutorStats.completedSessions = userSessions.filter(session => 
            session.status === 'completed'
        ).length;
        tutorStats.upcomingSessions = userSessions.filter(session => 
            session.status === 'scheduled'
        ).length;
        tutorStats.totalHours = calculateTotalHours(userSessions);
        tutorStats.averageRating = calculateAverageRating(userRatings);

        // Display stats
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
        // Get user's OSIS from the session
        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();
        
        // Fetch user's classes
        const userClasses = await ClassDataManager.fetchUserClasses(userOsis);
        const subjectSelect = document.getElementById('subject');
        
        if (!subjectSelect) {
            console.error('Subject select element not found');
            return;
        }

        // Clear existing options except the default one
        while (subjectSelect.options.length > 1) {
            subjectSelect.remove(1);
        }

        // Group classes by subject
        const subjectGroups = {
            'Mathematics': [],
            'Physics': [],
            'Chemistry': [],
            'Biology': [],
            'Computer Science': []
        };

        userClasses.forEach(cls => {
            const className = cls.name.toLowerCase();
            if (className.includes('math')) {
                subjectGroups['Mathematics'].push(cls);
            } else if (className.includes('physics')) {
                subjectGroups['Physics'].push(cls);
            } else if (className.includes('chemistry')) {
                subjectGroups['Chemistry'].push(cls);
            } else if (className.includes('biology')) {
                subjectGroups['Biology'].push(cls);
            } else if (className.includes('computer')) {
                subjectGroups['Computer Science'].push(cls);
            }
        });

        // Create option groups for each subject
        Object.entries(subjectGroups).forEach(([subject, classes]) => {
            if (classes.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = subject;
                
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = `${cls.name} - Period ${cls.period}`;
                    optgroup.appendChild(option);
                });
                
                subjectSelect.appendChild(optgroup);
            }
        });

        // Add event listener for subject change
        subjectSelect.addEventListener('change', (e) => {
            const selectedClass = userClasses.find(cls => cls.id === e.target.value);
            if (selectedClass) {
                updateTopicSuggestions(selectedClass);
            }
        });

    } catch (error) {
        console.error('Error loading class data:', error);
        showNotification('Error loading classes. Please try again.', 'error');
    }
}

function updateTopicSuggestions(classData) {
    const topicInput = document.getElementById('topic');
    const datalist = document.getElementById('topic-suggestions') || document.createElement('datalist');
    datalist.id = 'topic-suggestions';
    datalist.innerHTML = '';

    // Add class-specific topics
    if (classData.categories) {
        const categories = ClassDataManager.getClassCategories(classData);
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            datalist.appendChild(option);
        });
    }

    // Add general subject topics based on class name
    const className = classData.name.toLowerCase();
    let generalTopics = [];

    if (className.includes('math')) {
        generalTopics = ['Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics', 'Probability'];
    } else if (className.includes('physics')) {
        generalTopics = ['Mechanics', 'Kinematics', 'Forces', 'Energy', 'Waves', 'Electricity', 'Magnetism'];
    } else if (className.includes('chemistry')) {
        generalTopics = ['Chemical Reactions', 'Stoichiometry', 'Atomic Structure', 'Periodic Table', 'Solutions', 'Acids and Bases'];
    } else if (className.includes('biology')) {
        generalTopics = ['Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Human Body Systems', 'Molecular Biology'];
    } else if (className.includes('computer')) {
        generalTopics = ['Programming Basics', 'Data Structures', 'Algorithms', 'Web Development', 'Databases'];
    }

    generalTopics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        datalist.appendChild(option);
    });

    document.body.appendChild(datalist);
    topicInput.setAttribute('list', 'topic-suggestions');
}

// Add event listener for tutor registration
document.getElementById('submitTutorProfile')?.addEventListener('click', async () => {
    if (selectedSubjects.size === 0) {
        showNotification('Please select at least one subject you can tutor', 'error');
        return;
    }

    try {
        const tutorData = {
            osis: osis,
            subjects: Array.from(selectedSubjects),
            schedule: availabilityData,
            active: true,
            rating: 0,
            sessions_completed: 0,
            total_hours: 0,
            last_updated: new Date().toISOString()
        };

        // Save tutor profile to database
        await fetchRequest('/post_data', {
            sheet: 'TutorAvailability',
            data: tutorData
        });

        showNotification('Successfully registered as a tutor!', 'success');
        
        // Update UI to show tutor dashboard
        document.getElementById('tutor-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error registering as tutor:', error);
        showNotification('Error registering as tutor. Please try again.', 'error');
    }
});

// Improve class selection for tutoring requests
async function initializeClassSelect() {
    const subjectSelect = document.getElementById('subject');
    if (!subjectSelect) return;

    try {
        // Fetch user's classes
        const response = await fetchRequest('/data', { data: 'Classes' });
        const classes = response.Classes || [];
        
        // Get user's enrolled classes
        const userClasses = classes.filter(cls => 
            cls.OSIS && cls.OSIS.toString().includes(osis)
        );

        // Clear existing options
        subjectSelect.innerHTML = '<option value="" disabled selected>Select a class</option>';
        
        // Add options for each class
        userClasses.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.name;
            option.textContent = `${cls.name} (Period ${cls.period})`;
            subjectSelect.appendChild(option);
        });

        // Add event listener for subject change
        subjectSelect.addEventListener('change', () => {
            const selectedClass = userClasses.find(cls => cls.name === subjectSelect.value);
            if (selectedClass) {
                // Pre-fill topic with class subject
                document.getElementById('topic').value = selectedClass.subject || '';
            }
        });

    } catch (error) {
        console.error('Error initializing class select:', error);
        showNotification('Error loading classes', 'error');
    }
} 