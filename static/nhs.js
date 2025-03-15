// Global state
let currentUser = null;
let isAdmin = false;
let verificationCode = null;
let emailTest = true; // Set to true to allow any email domain for testing
let ForceAcctType = 'member'; // Can be 'none', 'student', 'teacher', 'member', or 'admin'

// Test email lists - replace these with actual email lists
const memberEmails = emailTest ? ['pauln30@nycstudents.net'] : [
    'member1@schools.nyc.gov',
    'member2@schools.nyc.gov'
];

const adminEmails = emailTest ? ['pauln30@nycstudents.net'] : [
    'admin1@schools.nyc.gov',
    'admin2@schools.nyc.gov'
];

// Initialize the page
async function initializePage() {
    startLoading();
    try {
        // Get current user data
        const currentUserData = await getCurrentUserData();
        
        // Set initial status
        let status = 'student';  // Default to student
        
        // Override with ForceAcctType if set
        if (ForceAcctType !== 'none') {
            status = ForceAcctType;
        }
        // Otherwise use user's nhs_status if available
        else if (currentUserData && currentUserData.nhs_status) {
            status = currentUserData.nhs_status;
        }

        console.log('Initializing with status:', status);  // Debug log
        
        // Update UI
        updateStatusMessage(status);
        updateVisibleCards(status);
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to load NHS page content');
        // Still update status to student on error
        updateStatusMessage('student');
        updateVisibleCards('student');
    } finally {
        endLoading();
    }
}

function updateStatusMessage(status) {
    const statusMessage = document.getElementById('status-message');
    const statusBadge = document.getElementById('current-status-badge');
    const studentContent = document.getElementById('student-content');
    const memberContent = document.getElementById('member-content');
    const adminContent = document.getElementById('admin-content');
    
    // Override status if ForceAcctType is set
    if (ForceAcctType !== 'none') {
        status = ForceAcctType;
    }
    
    // Update status badge
    statusBadge.className = 'status-badge ' + (status || 'none');
    // Set status text - default to 'Student' if no status or blank
    statusBadge.textContent = status && status !== '' ? status.charAt(0).toUpperCase() + status.slice(1) : 'Student';
    
    // Show/hide content based on status
    studentContent.style.display = (status === 'student' || !status || status === '') ? 'block' : 'none';
    memberContent.style.display = (status === 'member') ? 'block' : 'none';
    adminContent.style.display = (status === 'admin') ? 'block' : 'none';
    
    // Update welcome message
    switch(status) {
        case 'member':
            statusMessage.innerHTML = 'Welcome back, NHS Member! You have full access to NHS features.';
            statusMessage.className = 'verified';
            updateMemberTables(); // Update member tables when status is member
            break;
        case 'admin':
            statusMessage.innerHTML = 'Welcome back, NHS Administrator! You have full administrative access.';
            statusMessage.className = 'verified';
            updateAdminTables(); // Update admin tables when status is admin
            break;
        case 'teacher':
            statusMessage.innerHTML = 'Welcome, Teacher! You can post and manage tutoring opportunities.';
            statusMessage.className = 'verified';
            break;
        case 'student':
            statusMessage.innerHTML = 'Welcome to NHS! Please verify your status to access features.';
            statusMessage.className = 'pending';
            break;
        default:
            statusMessage.innerHTML = 'Welcome to NHS! Please verify your status to access features.';
            statusMessage.className = 'pending';
    }
    
    // Update visible verification cards
    updateVisibleCards(status);
}

function updateVisibleCards(status) {
    const cards = {
        'teacher-verification': document.getElementById('teacher-verification'),
        'member-verification': document.getElementById('member-verification'),
        'admin-verification': document.getElementById('admin-verification')
    };
    
    // Show all cards for students and users without a status
    if (status === 'student' || !status || status === '') {
        // Make sure student content is visible
        const studentContent = document.getElementById('student-content');
        if (studentContent) {
            studentContent.style.display = 'block';
        }
        
        // Show all verification cards
        Object.values(cards).forEach(card => {
            if (card) card.style.display = 'block';
        });
        return;
    }
    
    // Hide all cards for other statuses
    Object.values(cards).forEach(card => {
        if (card) card.style.display = 'none';
    });
}

async function verifyStatus(type) {
    startLoading();
    
    try {
        let verificationData = {
            userId: getCurrentUserId(),
            verificationType: type
        };
        
        switch(type) {
            case 'teacher':
                document.getElementById('teacherVerificationModal').style.display = 'block';
                break;
            case 'member':
                document.getElementById('memberVerificationModal').style.display = 'block';
                break;
            case 'admin':
                document.getElementById('adminVerificationModal').style.display = 'block';
                break;
            case 'applicant':
                window.location.href = '/nhs/apply';
                break;
        }
    } catch (error) {
        console.error('Error during verification:', error);
        showError('Verification process failed. Please try again.');
    } finally {
        endLoading();
    }
}

// Verification functions
async function verifyEmail(type) {
    const emailInput = document.getElementById(`${type}Email`);
    const emailError = document.getElementById(`${type}Error`);
    const email = emailInput.value.trim();

    // Reset error message
    emailError.style.display = 'none';

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
        return;
    }

    // Get user's data to check email
    const userData = await getCurrentUserData();
    if (!userData || !userData.email) {
        emailError.textContent = 'Could not verify your account. Please try again later.';
        emailError.style.display = 'block';
        return;
    }

    // Check if entered email matches user's email
    if (email.toLowerCase() !== userData.email.toLowerCase()) {
        emailError.textContent = 'Email does not match your account email';
        emailError.style.display = 'block';
        return;
    }

    // Check if email is in the appropriate list or has correct domain
    let isValidEmail = false;
    let errorMessage = '';

    switch(type) {
        case 'teacher':
            isValidEmail = emailTest || email.endsWith('@schools.nyc.gov');
            errorMessage = 'Please enter a valid @schools.nyc.gov email address';
            break;
        case 'member':
            isValidEmail = emailTest || memberEmails.includes(email);
            errorMessage = 'This email is not registered as an NHS member';
            break;
        case 'admin':
            isValidEmail = emailTest || adminEmails.includes(email);
            errorMessage = 'This email is not registered as an NHS administrator';
            break;
    }

    if (!isValidEmail) {
        emailError.textContent = errorMessage;
        emailError.style.display = 'block';
        return;
    }

    startLoading();
    try {
        // Generate a random 6-digit verification code
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Send verification code via email
        const emailMessage = `Your SciWeb NHS ${type} verification code is: ${verificationCode}. This code will expire in 10 minutes.`;
        
        await fetchRequest('/send_email', {
            email: email,
            message: emailMessage
        });

        // Show verification code section
        document.getElementById(`${type}EmailSection`).style.display = 'none';
        document.getElementById(`${type}CodeSection`).style.display = 'block';
        
        // Set code expiration
        setTimeout(() => {
            verificationCode = null;
        }, 600000); // 10 minutes
        
    } catch (error) {
        console.error('Error sending verification code:', error);
        emailError.textContent = 'Failed to send verification code. Please try again.';
        emailError.style.display = 'block';
    } finally {
        endLoading();
    }
}

async function verifyCodeForType(type) {
    const codeInput = document.getElementById(`${type}VerificationCode`);
    const codeError = document.getElementById(`${type}CodeError`);
    const enteredCode = codeInput.value.trim();

    // Reset error message
    codeError.style.display = 'none';

    // Validate verification code
    if (!verificationCode) {
        codeError.textContent = 'Verification code has expired. Please request a new code.';
        codeError.style.display = 'block';
        return;
    }

    if (enteredCode !== verificationCode) {
        codeError.textContent = 'Invalid verification code. Please try again.';
        codeError.style.display = 'block';
        return;
    }

    startLoading();
    try {
        const currentUserId = getCurrentUserId();
        const userData = await getCurrentUserData();

        // Update user's NHS status
        await fetchRequest('/update_data', {
            sheet: 'Users',
            data: { nhs_status: type },
            row_name: 'osis',
            row_value: currentUserId
        });

        // If the user is verifying as a member, add them to the NHSMembers sheet
        if (type === 'member') {
            await fetchRequest('/post_data', {
                sheet: 'NHSMembers',
                data: {
                    OSIS: currentUserId,
                    first_name: first_name,  // From user_data.js
                    last_name: last_name,    // From user_data.js
                    email: userData.email,    // From getCurrentUserData
                    probations: [],
                    credits: []
                }
            });
        }

        // Close modal and show success message
        document.getElementById(`${type}VerificationModal`).style.display = 'none';
        showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} verification successful!`);
        
        // Reset verification code
        verificationCode = null;
        
        // Update page content
        await initializePage();
        
    } catch (error) {
        console.error('Error updating status:', error);
        codeError.textContent = 'Failed to verify status. Please try again.';
        codeError.style.display = 'block';
    } finally {
        endLoading();
    }
}

// Modal close functionality
document.addEventListener('DOMContentLoaded', function() {
    ['teacher', 'member', 'admin'].forEach(type => {
        const modal = document.getElementById(`${type}VerificationModal`);
        const closeBtn = modal.querySelector('.close');

        closeBtn.onclick = function() {
            modal.style.display = 'none';
            // Reset modal state
            document.getElementById(`${type}EmailSection`).style.display = 'block';
            document.getElementById(`${type}CodeSection`).style.display = 'none';
            document.getElementById(`${type}Email`).value = '';
            document.getElementById(`${type}VerificationCode`).value = '';
            document.getElementById(`${type}Error`).style.display = 'none';
            document.getElementById(`${type}CodeError`).style.display = 'none';
            verificationCode = null;
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                closeBtn.onclick();
            }
        }
    });

    initializePage();
});

// Application Section
async function setupApplicationSection(applications) {
    const container = document.getElementById('application-section');
    const status = document.getElementById('application-status');
    const formContainer = document.getElementById('application-form-container');
    
    const existingApplication = applications.find(app => app.userId === getCurrentUserId());
    
    if (existingApplication) {
        status.innerHTML = `
            <div class="application-status ${existingApplication.status.toLowerCase()}">
                <h3>Application Status: ${existingApplication.status}</h3>
                <p>Submitted: ${new Date(existingApplication.submissionDate).toLocaleDateString()}</p>
            </div>
        `;
    } else {
        formContainer.innerHTML = `
            <form id="nhs-application-form">
                <div class="form-group">
                    <label>Why do you want to join NHS?</label>
                    <textarea required name="motivation"></textarea>
                </div>
                <div class="form-group">
                    <label>List your leadership experiences:</label>
                    <textarea required name="leadership"></textarea>
                </div>
                <div class="form-group">
                    <label>Describe your community service activities:</label>
                    <textarea required name="service"></textarea>
                </div>
                <button type="submit">Submit Application</button>
            </form>
        `;
        
        document.getElementById('nhs-application-form').addEventListener('submit', submitApplication);
    }
}

// Admin Dashboard
function setupAdminDashboard(data) {
    const content = document.getElementById('admin-content');
    const tabs = document.querySelectorAll('.admin-tabs .tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tab.dataset.tab === 'applications') {
                showApplicationsPanel(data.NHSApplications);
            } else {
                showTutoringManagementPanel(data.NHSTutoring);
            }
        });
    });
    
    // Show applications panel by default
    showApplicationsPanel(data.NHSApplications);
}

// Tutoring Section
function setupTutoringSection(tutoring) {
    const content = document.getElementById('tutoring-content');
    const tabs = document.querySelectorAll('.tutoring-tabs .tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tab.dataset.tab === 'available') {
                showAvailableTutoring(tutoring);
            } else {
                showMyTutoringSessions(tutoring);
            }
        });
    });
    
    // Show available sessions by default
    showAvailableTutoring(tutoring);
}

// Request Tutoring Section
function setupRequestTutoringSection() {
    const form = document.getElementById('tutoring-request-form-content');
    form.innerHTML = `
        <form id="tutoring-request-form">
            <div class="form-group">
                <label>Subject</label>
                <select required name="subject">
                    <option value="">Select a subject...</option>
                    <option value="math">Mathematics</option>
                    <option value="science">Science</option>
                    <option value="english">English</option>
                    <option value="history">History</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Preferred Date/Time</label>
                <input type="datetime-local" required name="preferredTime">
            </div>
            <div class="form-group">
                <label>Additional Notes</label>
                <textarea name="notes"></textarea>
            </div>
            <button type="submit">Submit Request</button>
        </form>
    `;
    
    document.getElementById('tutoring-request-form').addEventListener('submit', submitTutoringRequest);
}

// Event Handlers
async function submitApplication(event) {
    event.preventDefault();
    startLoading();
    
    const formData = new FormData(event.target);
    const applicationData = {
        userId: getCurrentUserId(),
        motivation: formData.get('motivation'),
        leadership: formData.get('leadership'),
        service: formData.get('service'),
        status: 'Pending',
        submissionDate: new Date().toISOString()
    };
    
    try {
        await fetchRequest('/post_data', {
            sheet: 'NHSApplications',
            data: applicationData
        });
        
        location.reload();
    } catch (error) {
        console.error('Error submitting application:', error);
        showError('Failed to submit application');
    } finally {
        endLoading();
    }
}

async function submitTutoringRequest(event) {
    event.preventDefault();
    startLoading();
    
    const formData = new FormData(event.target);
    const requestData = {
        userId: getCurrentUserId(),
        subject: formData.get('subject'),
        preferredTime: formData.get('preferredTime'),
        notes: formData.get('notes'),
        mode: document.getElementById('tutoring-mode').value,
        status: 'Pending'
    };
    
    try {
        await fetchRequest('/post_data', {
            sheet: 'NHSTutoring',
            data: requestData
        });
        
        event.target.reset();
        showSuccess('Tutoring request submitted successfully');
    } catch (error) {
        console.error('Error submitting tutoring request:', error);
        showError('Failed to submit tutoring request');
    } finally {
        endLoading();
    }
}

// Helper Functions
async function getCurrentUserData() {
    try {
        const data = await fetchRequest('/data', {
            "data": "Name"
        });
        return data['Name'];
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

function getCurrentUserId() {
    // This should be implemented based on your authentication system
    if (typeof osis !== 'undefined' && osis !== 888) {
        return osis;
    }
    return null;
}

function showError(message) {
    // Implement error notification
    alert(message);
}

function showSuccess(message) {
    // Implement success notification
    alert(message);
}

function startLoading() {
    document.body.classList.add('loading');
}

function endLoading() {
    document.body.classList.remove('loading');
}

// Function to update progress bars
function updateProgressBar(elementId, currentCredits, requiredCredits, completedCount, requiredCount) {
    const progressBar = document.getElementById(elementId);
    const creditPercentage = Math.min((currentCredits / requiredCredits) * 100, 100);
    const completionPercentage = Math.min((completedCount / requiredCount) * 100, 100);
    
    // Create a gradient that shows both credit progress (green) and completion progress (blue)
    progressBar.style.background = `linear-gradient(to right, 
        #4CAF50 ${creditPercentage}%, 
        rgba(255, 255, 255, 0.1) ${creditPercentage}%),
        linear-gradient(to right,
        rgba(33, 150, 243, 0.3) ${completionPercentage}%,
        rgba(255, 255, 255, 0.1) ${completionPercentage}%)
    `;
}

// Function to update member tables
async function updateMemberTables() {
    console.log('Updating member tables');
    try {
        // Fetch member data
        const memberData = await fetchRequest('/data', {
            data: 'NHSMembers'
        });

        // Calculate credits from member data
        const credits = {
            tutoring: 0,
            service: 0,
            project: 0
        };

        // Calculate completed credits from member data
        const completedCredits = {
            tutoring: 0,
            service: 0,
            project: 0
        };

        // Fetch all opportunities to get their details
        const opportunitiesData = await fetchRequest('/data', {
            "data": "Opportunities"
        });
        const opportunitiesMap = {};
        (opportunitiesData.Opportunities || []).forEach(opp => {
            opportunitiesMap[opp.id] = opp;
        });

        let completedOpportunities = [];
        if (memberData && memberData.NHSMembers && memberData.NHSMembers[0] && memberData.NHSMembers[0].credits) {
            memberData.NHSMembers[0].credits.forEach(credit => {
                // Add to total credits if attended
                if (credit.status === 'attended') {
                    credits[credit.category] += credit.credits;
                    completedCredits[credit.category] += 1; // Count number of completed opportunities
                }
                
                // Add to completed opportunities array with opportunity details
                const opportunity = opportunitiesMap[credit.id];
                if (opportunity && credit.status === 'attended') {
                    completedOpportunities.push({
                        date: opportunity.date,
                        category: opportunity.category,
                        name: opportunity.name,
                        credits: credit.credits,
                        status: credit.status
                    });
                }
            });
        }

        // Update credits display - simplified to just show the number
        document.getElementById('tutoring-credits').textContent = credits.tutoring;
        document.getElementById('service-credits').textContent = credits.service;
        document.getElementById('project-credits').textContent = credits.project;

        // Update progress bars with both credit progress and completion progress
        updateProgressBar('tutoring-progress', credits.tutoring, 10, completedCredits.tutoring, 5);
        updateProgressBar('service-progress', credits.service, 10, completedCredits.service, 5);
        updateProgressBar('project-progress', credits.project, 2, completedCredits.project, 1);

        // Update completed credits table
        const completedCreditsBody = document.getElementById('completed-credits-body');
        completedOpportunities.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
        completedCreditsBody.innerHTML = completedOpportunities.map(credit => `
            <tr class="status-attended">
                <td>${new Date(credit.date).toLocaleDateString()}</td>
                <td>${credit.category}</td>
                <td>${credit.name}</td>
                <td>${credit.credits}</td>
                <td><span class="status-badge attended">Attended</span></td>
            </tr>
        `).join('');

        // Fetch and display opportunities
        const opportunities = opportunitiesData.Opportunities || [];
        const currentUserId = getCurrentUserId();
        console.log('Current user ID:', currentUserId);
        
        // Populate opportunities table
        const tbody = document.getElementById('opportunities-body');
        tbody.innerHTML = opportunities.map(opp => {
            // Initialize arrays if they don't exist
            const signupOSIS = opp.signupOSIS || [];
            const showupOSIS = opp.showupOSIS || [];
            
            const userSignedUp = signupOSIS.includes(currentUserId);
            const userAttended = showupOSIS.includes(currentUserId);
            let signUpButton;
            
            if (userAttended) {
                signUpButton = '<span class="status-badge attended">Attended</span>';
            } else if (userSignedUp) {
                signUpButton = '<span class="status-badge signed-up">Signed Up</span>';
            } else if (opp.status === 'upcoming' && signupOSIS.length < opp.members_needed) {
                signUpButton = `<button onclick="signUpForOpportunity('${opp.id}')" class="action-btn">Sign Up</button>`;
            } else {
                signUpButton = '<span class="status-badge full">Full</span>';
            }

            return `
                <tr>
                    <td>${opp.category}</td>
                    <td>${opp.name}</td>
                    <td>${new Date(opp.date).toLocaleDateString()}<br>${formatTimeRange(opp.start_time, opp.end_time)}</td>
                    <td>${opp.credits}</td>
                    <td>${signUpButton}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error updating member tables:', error);
        showError('Failed to load member data');
    }
}

// Function to handle opportunity sign-up
async function signUpForOpportunity(opportunityId) {
    try {
        const currentUserId = getCurrentUserId();
        startLoading();
        
        // Get the opportunity data
        const opportunityData = await fetchRequest('/data', {
            sheet: 'Opportunities',
            row_name: 'id',
            row_value: opportunityId
        });
        
        if (!opportunityData || !opportunityData.Opportunities || opportunityData.Opportunities.length === 0) {
            throw new Error('Opportunity not found');
        }

        const opportunity = opportunityData.Opportunities[0];
        
        // Check if already signed up
        if (opportunity.signupOSIS && opportunity.signupOSIS.includes(currentUserId)) {
            showError('You are already signed up for this opportunity');
            return;
        }

        // Check if opportunity is full
        if (opportunity.signupOSIS && opportunity.signupOSIS.length >= opportunity.members_needed) {
            showError('This opportunity is full');
            return;
        }

        // Initialize arrays if they don't exist
        const signupOSIS = opportunity.signupOSIS || [];
        signupOSIS.push(currentUserId);

        // Update the opportunity
        await fetchRequest('/update_data', {
            sheet: 'Opportunities',
            data: { signupOSIS: signupOSIS },
            row_name: 'id',
            row_value: opportunityId
        });

        // Get member's current data
        const memberData = await fetchRequest('/data', {
            sheet: 'NHSMembers',
            row_name: 'OSIS',
            row_value: currentUserId
        });

        if (!memberData || !memberData.NHSMembers || memberData.NHSMembers.length === 0) {
            throw new Error('Member data not found');
        }

        const member = memberData.NHSMembers[0];
        const credits = member.credits || [];

        // Add the new opportunity to member's credits
        credits.push({
            category: opportunity.category.toLowerCase(),
            id: opportunityId,
            credits: opportunity.credits,
            status: 'signed_up'
        });

        // Update member's credits
        await fetchRequest('/update_data', {
            sheet: 'NHSMembers',
            data: { credits: credits },
            row_name: 'OSIS',
            row_value: currentUserId
        });

        showSuccess('Successfully signed up for opportunity');
        
        // Refresh the tables to show updated data
        if (document.getElementById('member-content').style.display === 'block') {
            await updateMemberTables();
        }
        if (document.getElementById('admin-content').style.display === 'block') {
            await updateAdminTables();
        }
    } catch (error) {
        console.error('Error signing up for opportunity:', error);
        showError('Failed to sign up for opportunity: ' + error.message);
    } finally {
        endLoading();
    }
}

// Function to generate a 6-digit ID
function generateId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to handle opportunity creation
async function createOpportunity(event) {
    event.preventDefault();
    startLoading();

    try {
        const formData = new FormData(event.target);
        const startTime = formData.get('start_time');
        const endTime = formData.get('end_time');

        // Validate that end time is after start time
        if (endTime <= startTime) {
            showError('End time must be after start time');
            return;
        }

        const opportunityData = {
            id: generateId(),
            name: formData.get('name'),
            date: formData.get('date'),
            start_time: startTime,
            end_time: endTime,
            category: formData.get('category'),
            credits: parseFloat(formData.get('credits')),
            members_needed: parseInt(formData.get('members_needed')),
            signupOSIS: [],  // Initialize empty array for signups
            showupOSIS: [],  // Initialize empty array for showups
            location: formData.get('location'),
            signup_deadline: formData.get('signup_deadline'),
            created_by: getCurrentUserId(),
            status: 'upcoming'
        };

        await fetchRequest('/post_data', {
            sheet: 'Opportunities',
            data: opportunityData
        });

        showSuccess('Opportunity created successfully!');
        event.target.reset();
        updateAdminTables();
    } catch (error) {
        console.error('Error creating opportunity:', error);
        showError('Failed to create opportunity');
    } finally {
        endLoading();
    }
}

// Function to format time range
function formatTimeRange(startTime, endTime) {
    const formatTime = (time) => {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

// Function to update admin tables
async function updateAdminTables() {
    try {
        // Fetch opportunities data
        const data = await fetchRequest('/data', {
            "data": "Opportunities"
        });

        const opportunities = data.Opportunities || [];
        
        // Populate opportunities table
        const tbody = document.getElementById('admin-opportunities-body');
        tbody.innerHTML = opportunities.map(opp => `
            <tr>
                <td>${opp.name}</td>
                <td>${new Date(opp.date).toLocaleDateString()}<br>${formatTimeRange(opp.start_time, opp.end_time)}</td>
                <td>${opp.category}</td>
                <td>${opp.credits}</td>
                <td>${opp.signupOSIS.length}/${opp.members_needed}<br>
                    <small>(${opp.showupOSIS ? opp.showupOSIS.length : 0} attended)</small></td>
                <td>${opp.status}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editOpportunity('${opp.id}')">Edit</button>
                    <button class="action-btn show-ups-btn" onclick="manageShowUps('${opp.id}')">Add Show-ups</button>
                    <button class="action-btn delete-btn" onclick="deleteOpportunity('${opp.id}')">Delete</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error updating admin tables:', error);
        showError('Failed to load opportunities');
    }
}

// Function to edit an opportunity
async function editOpportunity(id) {
    // To be implemented
    console.log('Edit opportunity:', id);
}

// Function to delete an opportunity
async function deleteOpportunity(id) {
    if (!confirm('Are you sure you want to delete this opportunity?')) {
        return;
    }

    startLoading();
    try {
        await fetchRequest('/delete_data', {
            data: 'Opportunities'
        });

        showSuccess('Opportunity deleted successfully!');
        updateAdminTables();
    } catch (error) {
        console.error('Error deleting opportunity:', error);
        showError('Failed to delete opportunity');
    } finally {
        endLoading();
    }
}

// Function to manage show-ups
async function manageShowUps(opportunityId) {
    startLoading();
    try {
        // Get opportunity data
        const opportunityData = await fetchRequest('/data', {
            data: 'Opportunities'
        });

        if (!opportunityData || !opportunityData.Opportunities || opportunityData.Opportunities.length === 0) {
            throw new Error('Opportunity not found');
        }

        const opportunity = opportunityData.Opportunities.find(opp => opp.id === opportunityId);
        if (!opportunity) {
            throw new Error('Opportunity not found');
        }

        const signupOSIS = opportunity.signupOSIS || [];
        const showupOSIS = opportunity.showupOSIS || [];

        // Get all NHS members data using FULLNHSMembers
        const FULLNHSMembers = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        // Get member data for all signed up users
        const memberData = FULLNHSMembers.FULLNHSMembers.filter(member => signupOSIS.includes(member.OSIS));

        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'show-ups-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Manage Show-ups</h2>
                <p>Select members who attended "${opportunity.name}"</p>
                <div class="member-bubbles">
                    ${memberData.map(member => `
                        <div class="member-bubble" onclick="this.querySelector('input[type=checkbox]').click()">
                            <input type="checkbox" value="${member.OSIS}" 
                                ${showupOSIS.includes(member.OSIS) ? 'checked' : ''}
                                onclick="event.stopPropagation()">
                            <span>${member.first_name} ${member.last_name}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">Processing: <span class="progress-percentage">0</span>%</div>
                </div>
                <button onclick="submitShowUps('${opportunityId}')" class="submit-btn">Submit Attendance</button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Add close button functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.remove();
        };

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        };

    } catch (error) {
        console.error('Error managing show-ups:', error);
        showError('Failed to load show-ups data');
    } finally {
        endLoading();
    }
}

// Function to submit show-ups
async function submitShowUps(opportunityId) {
    const modal = document.getElementById('show-ups-modal');
    const progressContainer = modal.querySelector('.progress-container');
    const progressFill = modal.querySelector('.progress-fill');
    const progressText = modal.querySelector('.progress-percentage');
    const submitBtn = modal.querySelector('.submit-btn');

    submitBtn.disabled = true;
    progressContainer.style.display = 'block';

    try {
        // Get all checked members
        const checkedMembers = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        const allMembers = Array.from(modal.querySelectorAll('input[type="checkbox"]')).map(cb => cb.value);

        // Get opportunity data
        const opportunityData = await fetchRequest('/data', {
            data: 'Opportunities'
        });
        
        const opportunity = opportunityData.Opportunities.find(opp => opp.id === opportunityId);
        if (!opportunity) {
            throw new Error('Opportunity not found');
        }

        // Update progress bar - 10% for starting
        updateProgress(10);

        // Update opportunity's showupOSIS
        await fetchRequest('/update_data', {
            sheet: 'Opportunities',
            data: { showupOSIS: checkedMembers },
            row_name: 'id',
            row_value: opportunityId
        });

        // Update progress bar - 30% for opportunity update
        updateProgress(30);

        // Get all NHS members data
        const FULLNHSMembers = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });

        // Create a map of OSIS to member data for quick lookup
        const memberMap = {};
        FULLNHSMembers.FULLNHSMembers.forEach(member => {
            memberMap[member.OSIS] = member;
        });

        // Calculate progress increment per member
        const progressPerMember = 60 / allMembers.length;
        let currentProgress = 30;

        // Update each member's credits
        for (let i = 0; i < allMembers.length; i++) {
            const osis = allMembers[i];
            const attended = checkedMembers.includes(osis);
            const member = memberMap[osis];

            if (member) {
                const credits = member.credits || [];

                // Find and update the credit entry for this opportunity
                const creditIndex = credits.findIndex(c => c.id === opportunityId);
                if (creditIndex !== -1) {
                    credits[creditIndex].status = attended ? 'attended' : 'no_show';
                }

                // Update member's credits
                await fetchRequest('/update_data', {
                    sheet: 'NHSMembers',
                    data: { credits: credits },
                    row_name: 'OSIS',
                    row_value: parseInt(osis)
                });
            }

            // Update progress
            currentProgress += progressPerMember;
            updateProgress(Math.min(90, currentProgress));
        }

        // Update progress bar - 100% for completion
        updateProgress(100);

        // Close modal and refresh tables
        setTimeout(() => {
            modal.remove();
            updateAdminTables();
            showSuccess('Attendance updated successfully');
        }, 500);

    } catch (error) {
        console.error('Error submitting show-ups:', error);
        showError('Failed to update attendance');
        submitBtn.disabled = false;
    }

    function updateProgress(percentage) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = Math.round(percentage);
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // ... existing event listeners ...

    // Add form submit handler for opportunity creation
    const createOpportunityForm = document.getElementById('create-opportunity-form');
    if (createOpportunityForm) {
        createOpportunityForm.addEventListener('submit', createOpportunity);
    }

    initializePage();
}); 