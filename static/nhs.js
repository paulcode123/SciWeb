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

// Global variable to store current member being viewed
let currentMemberOSIS = null;

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
    startLoading();
    try {
        console.log("Refreshing member tables...");
        const data = await fetchRequest('/data', { data: 'Opportunities, NHSMembers' });
        const opportunities = data.Opportunities || [];
        const memberData = data.NHSMembers?.find(m => m.OSIS === getCurrentUserId());
        
        console.log("Fetched opportunities:", opportunities.length);
        
        // Process upcoming opportunities
        if (opportunities && opportunities.length > 0) {
            const upcomingOpps = opportunities.filter(opp => opp.status === 'upcoming');
            console.log("Upcoming opportunities:", upcomingOpps.length);
            
            // Find the opportunities container or table
            const tableSection = document.querySelector('.opportunities-section');
            if (tableSection) {
                // Remove existing table and create a card container
                const existingTable = tableSection.querySelector('.opportunities-table');
                const existingContainer = tableSection.querySelector('.opportunities-container');
                
                if (existingContainer) {
                    existingContainer.innerHTML = ''; // Clear if container exists
                } else if (existingTable) {
                    // Create card container to replace table
                    const opportunitiesContainer = document.createElement('div');
                    opportunitiesContainer.className = 'opportunities-container';
                    tableSection.appendChild(opportunitiesContainer);
                    
                    // Hide the table but keep it in DOM for reference
                    existingTable.style.display = 'none';
                }
                
                const opportunitiesContainer = tableSection.querySelector('.opportunities-container');
                
                if (upcomingOpps.length === 0) {
                    opportunitiesContainer.innerHTML = '<div class="no-opportunities">No upcoming opportunities available</div>';
                } else {
                    opportunitiesContainer.innerHTML = ''; // Clear any existing content
                    upcomingOpps.forEach(opp => {
                        const opportunityCard = document.createElement('div');
                        opportunityCard.innerHTML = displayOpportunityForMember(opp);
                        opportunitiesContainer.appendChild(opportunityCard.firstElementChild);
                    });
                }
            }
        }
        
        // Process completed credits if member data exists
        if (memberData && memberData.credits) {
            // Update credit progress bars
            const tutoringCredits = memberData.credits.filter(c => c.category === 'Tutoring' && c.status === 'attended').reduce((sum, c) => sum + c.credits, 0);
            const serviceCredits = memberData.credits.filter(c => c.category === 'Service' && c.status === 'attended').reduce((sum, c) => sum + c.credits, 0);
            const projectCredits = memberData.credits.filter(c => c.category === 'Project' && c.status === 'attended').reduce((sum, c) => sum + c.credits, 0);
            
            // Update credit display
            const tutoringElement = document.getElementById('tutoring-credits');
            const serviceElement = document.getElementById('service-credits');
            const projectElement = document.getElementById('project-credits');
            
            if (tutoringElement) tutoringElement.textContent = tutoringCredits;
            if (serviceElement) serviceElement.textContent = serviceCredits;
            if (projectElement) projectElement.textContent = projectCredits;
            
            // Update progress bars
            updateProgressBar('tutoring-progress', tutoringCredits, 10);
            updateProgressBar('service-progress', serviceCredits, 10);
            updateProgressBar('project-progress', projectCredits, 2);

        // Update completed credits table
        const completedCreditsBody = document.getElementById('completed-credits-body');
            if (completedCreditsBody) {
                completedCreditsBody.innerHTML = '';
                
                // Sort credits by date (newest first)
                const sortedCredits = [...memberData.credits].sort((a, b) => {
                    const oppA = opportunities.find(o => o.id === a.id);
                    const oppB = opportunities.find(o => o.id === b.id);
                    if (!oppA || !oppB) return 0;
                    return new Date(oppB.date) - new Date(oppA.date);
                });
                
                sortedCredits.forEach(credit => {
                    const opportunity = opportunities.find(o => o.id === credit.id);
                    if (!opportunity) return;
                    
                    const row = document.createElement('tr');
                    row.className = `status-${credit.status}`;
                    row.innerHTML = `
                        <td>${new Date(opportunity.date).toLocaleDateString()}</td>
                        <td>${opportunity.category}</td>
                        <td>${opportunity.name}</td>
                <td>${credit.credits}</td>
                        <td><span class="status-badge ${credit.status}">${credit.status.replace('_', ' ')}</span></td>
                    `;
                    completedCreditsBody.appendChild(row);
                });
                
                if (completedCreditsBody.children.length === 0) {
                    completedCreditsBody.innerHTML = '<tr><td colspan="5">No credits history available</td></tr>';
                }
            }
        }
        
    } catch (error) {
        console.error('Error updating member tables:', error);
        showError('Failed to update member tables');
    } finally {
        endLoading();
    }
}

function displayOpportunityForMember(opportunity) {
    // Ensure we have valid data to work with
    if (!opportunity) {
        console.error("Invalid opportunity data");
        return `<div class="opportunity-card">Error loading opportunity</div>`;
    }
    
    // Safely parse timeslots
    let timeslots = [];
    try {
        if (Array.isArray(opportunity.timeslots)) {
            timeslots = opportunity.timeslots;
        } else if (opportunity.date) {
            const parsedTimeslots = JSON.parse(opportunity.date || '[]');
            timeslots = Array.isArray(parsedTimeslots) ? parsedTimeslots : [];
        }
    } catch (e) {
        console.error("Error parsing timeslots:", e);
        // Create a fallback timeslot from the legacy fields
        if (opportunity.date && opportunity.start_time && opportunity.end_time) {
            timeslots = [{
                date: opportunity.date,
                start_time: opportunity.start_time,
                end_time: opportunity.end_time
            }];
        }
    }
    
    // Safely parse roles
    let roles = [];
    try {
        if (Array.isArray(opportunity.roles)) {
            roles = opportunity.roles;
        } else if (opportunity.members_needed) {
            // Try to parse as JSON if it's a string
            if (typeof opportunity.members_needed === 'string') {
                const parsedRoles = JSON.parse(opportunity.members_needed || '[]');
                roles = Array.isArray(parsedRoles) ? parsedRoles : [];
            } else if (typeof opportunity.members_needed === 'number') {
                // Legacy format with just a number - create a default role
                roles = [{
                    name: "Default Role",
                    members_needed: opportunity.members_needed,
                    credits: opportunity.credits || 1,
                    description: "Participate in this opportunity",
                    signups: []
                }];
            }
        }
    } catch (e) {
        console.error("Error parsing roles for opportunity " + opportunity.id + ":", e);
        // Create a fallback role from the legacy fields
        roles = [{
            name: "Default Role",
            members_needed: opportunity.members_needed || 1,
            credits: opportunity.credits || 1,
            description: "Participate in this opportunity",
            signups: []
        }];
    }
    
    console.log(`Opportunity ${opportunity.id} - ${opportunity.name}: Processed roles:`, roles);
    
    // Find if user is signed up for any role
    const userOSIS = getCurrentUserId();
    let userSignup = null;
    let userRole = null;
    
    // Check for signup in roles
    if (Array.isArray(roles)) {
        for (const role of roles) {
            if (role && role.signups) {
                for (const signup of role.signups) {
                    if (signup && String(signup.OSIS) === String(userOSIS)) {
                        userSignup = signup;
                        userRole = role;
                        break;
                    }
                }
            }
            if (userRole) break;
        }
    }

    // Legacy support - check signupOSIS array
    const isSignedUp = userRole !== null || 
                      (opportunity.signupOSIS && opportunity.signupOSIS.some(osis => String(osis) === String(userOSIS)));

    // Check if deadline has passed
    const deadlinePassed = opportunity.signup_deadline ? new Date(opportunity.signup_deadline) < new Date() : false;

    console.log(`Opportunity ${opportunity.id} - ${opportunity.name}: User ${userOSIS} signed up: ${isSignedUp}`);
    console.log(`SignupOSIS:`, opportunity.signupOSIS);
    if (isSignedUp) {
        console.log(`Role: ${userRole ? userRole.name : 'Unknown'}`);
    }

    return `
        <div class="opportunity-card" data-id="${opportunity.id}">
            <div class="opportunity-header">
                <div>
                    <h3 class="opportunity-title">${opportunity.name}</h3>
                    <span class="opportunity-category">${opportunity.category}</span>
                </div>
            </div>
            
            <p class="opportunity-description">${opportunity.description || 'No description available.'}</p>
            
            <div class="opportunity-details">
                <div class="detail-group">
                    <h4>Time Slots</h4>
                    <ul class="timeslot-list">
                        ${Array.isArray(timeslots) && timeslots.length > 0 ? timeslots.map((slot, index) => `
                            <li class="timeslot-item">
                                <span>${new Date(slot.date).toLocaleDateString()}</span>
                                <span>${slot.start_time}-${slot.end_time}</span>
                                ${userSignup && userSignup.timeslot === index ? 
                                    '<span class="your-timeslot">(Your Time Slot)</span>' : ''}
                            </li>
                        `).join('') : `<li class="timeslot-item">No specific time slots available</li>`}
                    </ul>
                </div>

                <div class="detail-group">
                    <h4>Available Roles</h4>
                    <ul class="role-list">
                        ${Array.isArray(roles) && roles.length > 0 ? roles.map(role => {
                            if (!role) return ''; // Skip invalid roles
                            
                            const signedUpCount = role.signups ? role.signups.length : 0;
                            const isFull = signedUpCount >= role.members_needed;
                            const isUserRole = userRole && userRole.name === role.name;
                            
                            return `
                                <li class="role-item ${isFull ? 'fully-booked' : ''} ${isUserRole ? 'your-role' : ''}">
                                    <div class="role-header">
                                        <span class="role-name">${role.name}</span>
                                        <span class="role-spots">
                                            ${signedUpCount}/${role.members_needed} spots
                                            ${isUserRole ? ' (Your Role)' : ''}
                                        </span>
                                    </div>
                                    <p class="role-description">${role.description || 'No description available.'}</p>
                                    <div class="role-status ${isFull ? 'full' : signedUpCount >= role.members_needed * 0.7 ? 'limited' : 'available'}">
                                        ${isFull ? 'Full' : `${role.members_needed - signedUpCount} spots left`}
                                        • ${role.credits} credits
                                    </div>
                                </li>
                            `;
                        }).join('') : `<li class="role-item">No specific roles available</li>`}
                    </ul>
                </div>

                <div class="detail-group">
                    <h4>Registration Details</h4>
                    <p><strong>Location:</strong> ${opportunity.location || 'Not specified'}</p>
                    <p><strong>Signup Deadline:</strong> ${opportunity.signup_deadline ? new Date(opportunity.signup_deadline).toLocaleDateString() : 'Not specified'}</p>
                    ${deadlinePassed ? '<p class="deadline-passed">Registration deadline has passed</p>' : ''}
                </div>
            </div>

            <div class="opportunity-actions">
                ${opportunity.status === 'upcoming' ? 
                    isSignedUp ? `
                        <div class="signup-status">
                            <button class="signed-up-btn" disabled>
                                <i class="fas fa-check"></i> 
                                Signed Up${userRole ? ` as ${userRole.name}` : ''}
                            </button>
                            ${!deadlinePassed ? `
                                <button class="cancel-signup-btn" onclick="cancelSignup('${opportunity.id}')">
                                    <i class="fas fa-times"></i> Cancel Signup
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <button class="signup-btn" onclick="openSignupModal('${opportunity.id}')">
                            <i class="fas fa-user-plus"></i> Sign Up
                        </button>
                    `
                : ''}
            </div>
        </div>
    `;
}

async function cancelSignup(opportunityId) {
    if (!confirm('Are you sure you want to cancel your signup for this opportunity?')) {
        return;
    }
    
        startLoading();
    try {
        // Get the current opportunity data
        const data = await fetchRequest('/data', { data: 'Opportunities' });
        const opportunity = data.Opportunities.find(opp => opp.id === opportunityId);
        
        if (!opportunity) {
            showError('Opportunity not found');
            return;
        }
        
        // Check if deadline has passed
        if (new Date(opportunity.signup_deadline) < new Date()) {
            showError('Cannot cancel signup after the registration deadline has passed');
            return;
        }
        
        const userOSIS = getCurrentUserId();
        let updatedRoles = [];
        let roleFound = false;
        
        // Process roles array
        if (Array.isArray(opportunity.roles)) {
            updatedRoles = opportunity.roles.map(role => {
                if (role.signups) {
                    const userSignupIndex = role.signups.findIndex(signup => 
                        String(signup.OSIS) === String(userOSIS)
                    );
                    
                    if (userSignupIndex !== -1) {
                        roleFound = true;
                        // Remove user from this role's signups
                        const updatedSignups = [...role.signups];
                        updatedSignups.splice(userSignupIndex, 1);
                        return { ...role, signups: updatedSignups };
                    }
                }
                return role;
            });
        } else if (opportunity.members_needed) {
            // Handle legacy format - parse JSON string
            try {
                updatedRoles = JSON.parse(opportunity.members_needed).map(role => {
                    if (role.signups) {
                        const userSignupIndex = role.signups.findIndex(signup => 
                            String(signup.OSIS) === String(userOSIS)
                        );
                        
                        if (userSignupIndex !== -1) {
                            roleFound = true;
                            // Remove user from this role's signups
                            const updatedSignups = [...role.signups];
                            updatedSignups.splice(userSignupIndex, 1);
                            return { ...role, signups: updatedSignups };
                        }
                    }
                    return role;
                });
            } catch (e) {
                console.error('Error parsing members_needed:', e);
            }
        }
        
        // Update legacy signupOSIS array
        let updatedSignupOSIS = opportunity.signupOSIS || [];
        const userIndex = updatedSignupOSIS.findIndex(osis => String(osis) === String(userOSIS));
        
        if (userIndex !== -1) {
            updatedSignupOSIS = [...updatedSignupOSIS];
            updatedSignupOSIS.splice(userIndex, 1);
        }
        
        if (!roleFound && userIndex === -1) {
            showError('You are not signed up for this opportunity');
            return;
        }

        // Save updated opportunity
        await fetchRequest('/update_data', {
            sheet: 'Opportunities',
            data: {
                roles: updatedRoles,
                signupOSIS: updatedSignupOSIS
            },
            row_name: 'id',
            row_value: opportunityId
        });

        showSuccess('Your signup has been canceled successfully');
        
        // Refresh the display
        await updateMemberTables();
    } catch (error) {
        console.error('Error canceling signup:', error);
        showError('Failed to cancel signup');
    } finally {
        endLoading();
    }
}

function openSignupModal(opportunityId) {
    startLoading();
    fetchRequest('/data', {
        data: 'Opportunities'
    }).then(opportunities => {
        const opportunity = opportunities.Opportunities.find(opp => opp.id === opportunityId);
        if (!opportunity) {
            showError('Opportunity not found');
            return;
        }

        const timeslots = Array.isArray(opportunity.timeslots) ? opportunity.timeslots : JSON.parse(opportunity.date || '[]');
        const roles = Array.isArray(opportunity.roles) ? opportunity.roles : JSON.parse(opportunity.members_needed || '[]');

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Sign Up for ${opportunity.name}</h3>
                
                <form id="signup-form" onsubmit="submitSignup(event, '${opportunityId}')">
                    ${timeslots.length > 0 ? `
                        <div class="form-group">
                            <label>Select Time Slot:</label>
                            <select name="timeslot" required>
                                ${timeslots.map((slot, index) => `
                                    <option value="${index}">
                                        ${new Date(slot.date).toLocaleDateString()} ${slot.start_time}-${slot.end_time}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Select Role:</label>
                        <select name="role" required>
                            ${roles.map((role, index) => {
                                const signedUpCount = role.signups ? role.signups.length : 0;
                                const isFull = signedUpCount >= role.members_needed;
                                return `
                                    <option value="${index}" ${isFull ? 'disabled' : ''}>
                                        ${role.name} (${signedUpCount}/${role.members_needed} spots) - ${role.credits} credits
                                        ${isFull ? ' (FULL)' : ''}
                                    </option>
                                `;
                            }).join('')}
                        </select>
                    </div>

                    <div class="selected-role-info"></div>
                    
                    <button type="submit" class="submit-btn">Sign Up</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Add role description update on selection change
        const roleSelect = modal.querySelector('select[name="role"]');
        const roleInfoDiv = modal.querySelector('.selected-role-info');
        
        if (roleSelect && roleInfoDiv) {
            roleSelect.addEventListener('change', () => {
                const selectedRole = roles[roleSelect.value];
                if (selectedRole) {
                    roleInfoDiv.innerHTML = `
                        <div class="role-description">
                            <h4>Role Details:</h4>
                            <p>${selectedRole.description || 'No description available.'}</p>
                            <p><strong>Credits:</strong> ${selectedRole.credits}</p>
                        </div>
                    `;
                }
            });
            // Trigger initial description
            roleSelect.dispatchEvent(new Event('change'));
        }

        // Close button functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.remove();
        };

        // Click outside to close
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        };

        endLoading();
    }).catch(error => {
        showError('Error loading opportunity details');
        endLoading();
    });
}

async function submitSignup(event, opportunityId) {
    event.preventDefault();
    startLoading();

    try {
        const form = event.target;
        const timeslotSelect = form.querySelector('select[name="timeslot"]');
        const roleSelect = form.querySelector('select[name="role"]');
        
        const selectedTimeslotIndex = timeslotSelect ? parseInt(timeslotSelect.value) : 0;
        const selectedRoleIndex = parseInt(roleSelect.value);

        const opportunities = await fetchRequest('/data', { data: 'Opportunities' });
        const opportunity = opportunities.Opportunities.find(opp => opp.id === opportunityId);
        
        if (!opportunity) {
            showError('Opportunity not found');
            return;
        }

        const timeslots = Array.isArray(opportunity.timeslots) ? opportunity.timeslots : JSON.parse(opportunity.date || '[]');
        const roles = Array.isArray(opportunity.roles) ? opportunity.roles : JSON.parse(opportunity.members_needed || '[]');
        
        const selectedRole = roles[selectedRoleIndex];
        const selectedTimeslot = timeslots[selectedTimeslotIndex];

        if (!selectedRole) {
            showError('Selected role not found');
            return;
        }

        // Check if role is full
        const signedUpCount = selectedRole.signups ? selectedRole.signups.length : 0;
        if (signedUpCount >= selectedRole.members_needed) {
            showError('This role is already full');
            return;
        }

        // Check if user is already signed up for this role
        const userOSIS = await getCurrentUserId();
        if (selectedRole.signups && selectedRole.signups.some(signup => String(signup.OSIS) === String(userOSIS))) {
            showError('You are already signed up for this role');
            return;
        }

        // Add the signup
        const signup = {
            OSIS: userOSIS,
            status: 'signed_up',
            timestamp: new Date().toISOString(),
            timeslot: selectedTimeslotIndex
        };

        // Update both new and legacy signup structures
        if (!selectedRole.signups) selectedRole.signups = [];
        selectedRole.signups.push(signup);

        // Legacy support
        if (!opportunity.signupOSIS) opportunity.signupOSIS = [];
        if (!opportunity.signupOSIS.includes(userOSIS)) {
            opportunity.signupOSIS.push(userOSIS);
        }

        // Save the updated opportunity using the correct route and format
        await fetchRequest('/update_data', {
            sheet: 'Opportunities',
            data: {
                roles: roles,
                signupOSIS: opportunity.signupOSIS
            },
            row_name: 'id',
            row_value: opportunityId
        });

        showSuccess('Successfully signed up for the opportunity!');
        
        // Close the modal and refresh the display
        const modal = form.closest('.modal');
        if (modal) modal.remove();
        
        // Immediately update this specific opportunity card
        const opportunityCard = document.querySelector(`.opportunity-card[data-id="${opportunityId}"]`);
        if (opportunityCard) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = displayOpportunityForMember(opportunity);
            opportunityCard.replaceWith(tempDiv.firstElementChild);
        }
        
        // Then do a full refresh to update everything else
        await updateMemberTables();
    } catch (error) {
        showError('Error signing up for opportunity');
        console.error('Signup error:', error);
    } finally {
        endLoading();
    }
}

// Function to generate a 6-digit ID
function generateId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Opportunity Form Functions
function addTimeSlot() {
    const container = document.getElementById('timeslots-container');
    const template = `
        <div class="timeslot-entry">
            <div class="form-row">
                <div class="form-group">
                    <label>Date:</label>
                    <input type="date" class="timeslot-date" required>
                </div>
                <div class="form-group">
                    <label>Start Time:</label>
                    <input type="time" class="timeslot-start" required>
                </div>
                <div class="form-group">
                    <label>End Time:</label>
                    <input type="time" class="timeslot-end" required>
                </div>
                <button type="button" onclick="removeTimeSlot(this)" class="remove-btn"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', template);
}

function removeTimeSlot(button) {
    button.closest('.timeslot-entry').remove();
}

function addRole() {
    const container = document.getElementById('roles-container');
    const template = `
        <div class="role-entry">
            <div class="form-row">
                <div class="form-group">
                    <label>Role Name:</label>
                    <input type="text" class="role-name" placeholder="e.g., Tutor, Helper" required>
                </div>
                <div class="form-group">
                    <label>Members Needed:</label>
                    <input type="number" class="role-members" min="1" required>
                </div>
                <div class="form-group">
                    <label>Credits:</label>
                    <input type="number" class="role-credits" min="0.5" step="0.5" required>
                </div>
                <button type="button" onclick="removeRole(this)" class="remove-btn"><i class="fas fa-trash"></i></button>
            </div>
            <div class="form-group">
                <label>Role Description:</label>
                <textarea class="role-description" rows="2" placeholder="Describe the responsibilities for this role"></textarea>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', template);
}

function removeRole(button) {
    button.closest('.role-entry').remove();
}

// Modified opportunity creation function
async function createOpportunity(event) {
    event.preventDefault();
    startLoading();

    try {
        const form = event.target;
        
        // Collect timeslots
        const timeslots = [];
        form.querySelectorAll('.timeslot-entry').forEach(entry => {
            timeslots.push({
                date: entry.querySelector('.timeslot-date').value,
                start_time: entry.querySelector('.timeslot-start').value,
                end_time: entry.querySelector('.timeslot-end').value
            });
        });

        // Collect roles
        const roles = [];
        form.querySelectorAll('.role-entry').forEach(entry => {
            roles.push({
                name: entry.querySelector('.role-name').value,
                description: entry.querySelector('.role-description').value,
                members_needed: parseInt(entry.querySelector('.role-members').value),
                credits: parseFloat(entry.querySelector('.role-credits').value),
                signups: []
            });
        });

        // Calculate legacy fields
        const totalMembersNeeded = roles.reduce((sum, role) => sum + role.members_needed, 0);
        const totalCredits = roles.reduce((sum, role) => sum + role.credits, 0);

        const opportunityData = {
            id: generateId(),
            name: form.querySelector('#opp-name').value,
            description: form.querySelector('#opp-description').value,
            category: form.querySelector('#opp-category').value,
            location: form.querySelector('#opp-location').value,
            signup_deadline: form.querySelector('#opp-deadline').value,
            created_by: getCurrentUserId(),
            status: 'upcoming',
            // New fields
            timeslots: timeslots,
            roles: roles,
            // Legacy fields
            date: timeslots[0].date,
            start_time: timeslots[0].start_time,
            end_time: timeslots[0].end_time,
            members_needed: totalMembersNeeded,
            credits: totalCredits,
            signupOSIS: [],
            showupOSIS: []
        };

        await fetchRequest('/post_data', {
            sheet: 'Opportunities',
            data: opportunityData
        });

        showSuccess('Opportunity created successfully!');
        form.reset();
        updateAdminTables();
    } catch (error) {
        console.error('Error creating opportunity:', error);
        showError('Failed to create opportunity');
    } finally {
        endLoading();
    }
}

// Modified opportunity display function
function displayOpportunity(opportunity) {
    const timeslots = JSON.parse(opportunity.date || '[]');
    const roles = JSON.parse(opportunity.members_needed || '[]');

    return `
        <div class="opportunity-card">
            <div class="opportunity-header">
                <div>
                    <h3 class="opportunity-title">${opportunity.name}</h3>
                    <span class="opportunity-category">${opportunity.category}</span>
                </div>
            </div>
            
            <p class="opportunity-description">${opportunity.description || ''}</p>
            
            <div class="opportunity-details">
                <div class="detail-group">
                    <h4>Time Slots</h4>
                    <ul class="timeslot-list">
                        ${timeslots.map(slot => `
                            <li class="timeslot-item">
                                <span>${new Date(slot.date).toLocaleDateString()}</span>
                                <span>${slot.start_time} - ${slot.end_time}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="detail-group">
                    <h4>Roles Available</h4>
                    <ul class="role-list">
                        ${roles.map(role => `
                            <li class="role-item">
                                <div class="role-header">
                                    <span class="role-name">${role.name}</span>
                                    <span class="role-spots">${role.members_needed} spots • ${role.credits} credits</span>
                                </div>
                                ${role.description ? `<p class="role-description">${role.description}</p>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="detail-group">
                    <h4>Location</h4>
                    <p>${opportunity.location}</p>
                    <h4>Signup Deadline</h4>
                    <p>${new Date(opportunity.signup_deadline).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div class="opportunity-actions">
                ${opportunity.status === 'upcoming' ? `
                    <button class="signup-btn" onclick="signUpForOpportunity('${opportunity.id}')">
                        <i class="fas fa-user-plus"></i> Sign Up
                    </button>
                ` : ''}
                ${isAdmin ? `
                    <button class="edit-btn" onclick="editOpportunity('${opportunity.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="deleteOpportunity('${opportunity.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;
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
        const opportunity = await fetchRequest('/data', {
            sheet: 'Opportunities',
            query: { id: opportunityId }
        });

        if (!opportunity) {
            showError('Opportunity not found');
            return;
        }

        // Create show-up management UI
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Manage Show-ups for ${opportunity.name}</h3>
                <div class="roles-container">
                    ${opportunity.roles.map((role, roleIndex) => `
                        <div class="role-section">
                            <h4>${role.name} (${role.credits} credits)</h4>
                <div class="member-bubbles">
                                ${role.signups.map((signup, signupIndex) => `
                                    <div class="member-bubble">
                                        <input type="checkbox" 
                                            data-role-index="${roleIndex}"
                                            data-signup-index="${signupIndex}"
                                            ${signup.status === 'attended' ? 'checked' : ''}>
                                        <span>${signup.OSIS}</span>
                        </div>
                    `).join('')}
                </div>
                    </div>
                    `).join('')}
                </div>
                <button onclick="submitShowUps('${opportunityId}')" class="submit-btn">Save Attendance</button>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error managing show-ups:', error);
        showError('Failed to load show-up management');
    } finally {
        endLoading();
    }
}

// Function to submit show-ups
async function submitShowUps(opportunityId) {
    startLoading();
    try {
        const opportunity = await fetchRequest('/data', {
            sheet: 'Opportunities',
            query: { id: opportunityId }
        });

        // Update role-specific attendance
        const updatedRoles = opportunity.roles.map((role, roleIndex) => {
            role.signups = role.signups.map((signup, signupIndex) => {
                const checkbox = document.querySelector(`[data-role-index="${roleIndex}"][data-signup-index="${signupIndex}"]`);
                signup.status = checkbox.checked ? 'attended' : 'no_show';
                return signup;
            });
            return role;
        });

        // Update legacy showupOSIS
        const showupOSIS = updatedRoles.flatMap(role => 
            role.signups
                .filter(signup => signup.status === 'attended')
                .map(signup => signup.OSIS)
        );

        await fetchRequest('/update_data', {
            sheet: 'Opportunities',
            data: {
                roles: updatedRoles,
                showupOSIS: showupOSIS
            },
            row_name: 'id',
            row_value: opportunityId
        });

        showSuccess('Attendance updated successfully!');
            updateAdminTables();
        document.querySelector('.modal').remove();
    } catch (error) {
        console.error('Error submitting show-ups:', error);
        showError('Failed to update attendance');
    } finally {
        endLoading();
    }
}

// Function to search members
async function searchMembers() {
    startLoading();
    try {
        const searchInput = document.getElementById('member-search').value.toLowerCase();
        
        // Get all NHS members
        const membersData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });

        // Find member by OSIS or name
        const member = membersData.FULLNHSMembers.find(m => 
            m.OSIS.toString() === searchInput ||
            (m.first_name + ' ' + m.last_name).toLowerCase().includes(searchInput)
        );

        if (!member) {
            showError('Member not found');
            document.getElementById('member-details').style.display = 'none';
            return;
        }

        // Store current member OSIS
        currentMemberOSIS = member.OSIS;

        // Display member details
        displayMemberDetails(member);
        
    } catch (error) {
        console.error('Error searching members:', error);
        showError('Failed to search members');
    } finally {
        endLoading();
    }
}

// Function to display member details
async function displayMemberDetails(member) {
    try {
        // Update basic info
        document.getElementById('member-name').textContent = `${member.first_name} ${member.last_name}`;
        document.getElementById('member-osis').textContent = member.OSIS;
        document.getElementById('member-email').textContent = member.email;

        // Calculate and display credits
        const credits = {
            tutoring: 0,
            service: 0,
            project: 0
        };
        const completedCount = {
            tutoring: 0,
            service: 0,
            project: 0
        };

        // Get opportunities data for names
        const opportunitiesData = await fetchRequest('/data', {
            data: 'Opportunities'
        });
        const opportunitiesMap = {};
        opportunitiesData.Opportunities.forEach(opp => {
            opportunitiesMap[opp.id] = opp;
        });

        // Process credits and opportunities
        member.credits = member.credits || [];
        member.credits.forEach(credit => {
            if (credit.status === 'attended') {
                credits[credit.category] += credit.credits;
                completedCount[credit.category]++;
            }
        });

        // Update credit displays and progress bars
        document.getElementById('member-tutoring-credits').textContent = credits.tutoring;
        document.getElementById('member-service-credits').textContent = credits.service;
        document.getElementById('member-project-credits').textContent = credits.project;

        updateProgressBar('member-tutoring-progress', credits.tutoring, 10, completedCount.tutoring, 5);
        updateProgressBar('member-service-progress', credits.service, 10, completedCount.service, 5);
        updateProgressBar('member-project-progress', credits.project, 2, completedCount.project, 1);

        // Display probations
        const probationsList = document.getElementById('probations-list');
        probationsList.innerHTML = (member.probations || []).map((prob, index) => `
            <div class="probation-item">
                <span class="reason">${prob.reason}</span>
                <div class="actions">
                    <button onclick="editProbation(${index})" class="action-btn">Edit</button>
                    <button onclick="deleteProbation(${index})" class="action-btn delete-btn">Delete</button>
                </div>
            </div>
        `).join('');

        // Display opportunities
        const opportunitiesBody = document.getElementById('member-opportunities-body');
        opportunitiesBody.innerHTML = member.credits.map(credit => {
            const opportunity = opportunitiesMap[credit.id];
            if (!opportunity) return '';
            
            return `
                <tr>
                    <td>${new Date(opportunity.date).toLocaleDateString()}</td>
                    <td>${opportunity.name}</td>
                    <td>${opportunity.category}</td>
                    <td>${credit.credits}</td>
                    <td>
                        <select onchange="updateCreditStatus('${credit.id}', this.value)">
                            <option value="signed_up" ${credit.status === 'signed_up' ? 'selected' : ''}>Signed Up</option>
                            <option value="attended" ${credit.status === 'attended' ? 'selected' : ''}>Attended</option>
                            <option value="no_show" ${credit.status === 'no_show' ? 'selected' : ''}>No Show</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="editCredit('${credit.id}')" class="action-btn">Edit</button>
                        <button onclick="deleteCredit('${credit.id}')" class="action-btn delete-btn">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Show the details section
        document.getElementById('member-details').style.display = 'block';

    } catch (error) {
        console.error('Error displaying member details:', error);
        showError('Failed to display member details');
    }
}

// Function to add a probation
async function addProbation() {
    const reason = prompt('Enter probation reason:');
    if (!reason) return;

    startLoading();
    try {
        // Get current member data
        const memberData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
        
        if (!member) {
            throw new Error('Member not found');
        }

        // Add new probation
        const probations = member.probations || [];
        probations.push({ reason });

        // Update member data
        await fetchRequest('/update_data', {
            data: {
                sheet: 'NHSMembers',
                data: { probations },
                row_name: 'OSIS',
                row_value: currentMemberOSIS
            }
        });

        // Refresh display
        displayMemberDetails(member);
        showSuccess('Probation added successfully');

    } catch (error) {
        console.error('Error adding probation:', error);
        showError('Failed to add probation');
    } finally {
        endLoading();
    }
}

// Function to edit a probation
async function editProbation(index) {
    const memberData = await fetchRequest('/data', {
        data: 'FULLNHSMembers'
    });
    const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
    
    if (!member || !member.probations || !member.probations[index]) {
        showError('Probation not found');
        return;
    }

    const newReason = prompt('Edit probation reason:', member.probations[index].reason);
    if (!newReason) return;

    startLoading();
    try {
        member.probations[index].reason = newReason;

        await fetchRequest('/update_data', {
            data: {
                sheet: 'NHSMembers',
                data: { probations: member.probations },
                row_name: 'OSIS',
                row_value: currentMemberOSIS
            }
        });

        displayMemberDetails(member);
        showSuccess('Probation updated successfully');

    } catch (error) {
        console.error('Error updating probation:', error);
        showError('Failed to update probation');
    } finally {
        endLoading();
    }
}

// Function to delete a probation
async function deleteProbation(index) {
    if (!confirm('Are you sure you want to delete this probation?')) return;

    startLoading();
    try {
        const memberData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
        
        if (!member || !member.probations) {
            throw new Error('Member or probations not found');
        }

        member.probations.splice(index, 1);

        await fetchRequest('/update_data', {
            data: {
                sheet: 'NHSMembers',
                data: { probations: member.probations },
                row_name: 'OSIS',
                row_value: currentMemberOSIS
            }
        });

        displayMemberDetails(member);
        showSuccess('Probation deleted successfully');

    } catch (error) {
        console.error('Error deleting probation:', error);
        showError('Failed to delete probation');
    } finally {
        endLoading();
    }
}

// Function to update credit status
async function updateCreditStatus(opportunityId, newStatus) {
    startLoading();
    try {
        const memberData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
        
        if (!member || !member.credits) {
            throw new Error('Member or credits not found');
        }

        // Find and update the credit
        const creditIndex = member.credits.findIndex(c => c.id === opportunityId);
        if (creditIndex === -1) {
            throw new Error('Credit not found');
        }

        member.credits[creditIndex].status = newStatus;

        // Update member data
        await fetchRequest('/update_data', {
            data: {
                sheet: 'NHSMembers',
                data: { credits: member.credits },
                row_name: 'OSIS',
                row_value: currentMemberOSIS
            }
        });

        // If status changed to attended/no_show, update the opportunity's showupOSIS
        if (newStatus === 'attended' || newStatus === 'no_show') {
            const opportunityData = await fetchRequest('/data', {
                data: 'Opportunities'
            });
            const opportunity = opportunityData.Opportunities.find(opp => opp.id === opportunityId);
            
            if (opportunity) {
                let showupOSIS = opportunity.showupOSIS || [];
                if (newStatus === 'attended' && !showupOSIS.includes(currentMemberOSIS)) {
                    showupOSIS.push(currentMemberOSIS);
                } else if (newStatus === 'no_show') {
                    showupOSIS = showupOSIS.filter(osis => osis !== currentMemberOSIS);
                }

                await fetchRequest('/update_data', {
                    data: {
                        sheet: 'Opportunities',
                        data: { showupOSIS },
                        row_name: 'id',
                        row_value: opportunityId
                    }
                });
            }
        }

        displayMemberDetails(member);
        showSuccess('Credit status updated successfully');

    } catch (error) {
        console.error('Error updating credit status:', error);
        showError('Failed to update credit status');
    } finally {
        endLoading();
    }
}

// Function to edit a credit
async function editCredit(opportunityId) {
    startLoading();
    try {
        const memberData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
        
        if (!member || !member.credits) {
            throw new Error('Member or credits not found');
        }

        const credit = member.credits.find(c => c.id === opportunityId);
        if (!credit) {
            throw new Error('Credit not found');
        }

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Credit</h2>
                <div class="edit-credit-modal">
                    <div>
                        <label>Credits:</label>
                        <input type="number" id="edit-credit-amount" value="${credit.credits}" step="0.5">
                    </div>
                    <div>
                        <label>Category:</label>
                        <select id="edit-credit-category">
                            <option value="tutoring" ${credit.category === 'tutoring' ? 'selected' : ''}>Tutoring</option>
                            <option value="service" ${credit.category === 'service' ? 'selected' : ''}>Service</option>
                            <option value="project" ${credit.category === 'project' ? 'selected' : ''}>Project</option>
                        </select>
                    </div>
                    <div>
                        <label>Status:</label>
                        <select id="edit-credit-status">
                            <option value="signed_up" ${credit.status === 'signed_up' ? 'selected' : ''}>Signed Up</option>
                            <option value="attended" ${credit.status === 'attended' ? 'selected' : ''}>Attended</option>
                            <option value="no_show" ${credit.status === 'no_show' ? 'selected' : ''}>No Show</option>
                        </select>
                    </div>
                    <button onclick="saveCredit('${opportunityId}')" class="action-btn">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Add close button functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => modal.remove();
        window.onclick = (event) => {
            if (event.target === modal) modal.remove();
        };

    } catch (error) {
        console.error('Error editing credit:', error);
        showError('Failed to edit credit');
    } finally {
        endLoading();
    }
}

// Function to save credit changes
async function saveCredit(opportunityId) {
    startLoading();
    try {
        const memberData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
        
        if (!member || !member.credits) {
            throw new Error('Member or credits not found');
        }

        const creditIndex = member.credits.findIndex(c => c.id === opportunityId);
        if (creditIndex === -1) {
            throw new Error('Credit not found');
        }

        // Get values from modal
        const newCredits = parseFloat(document.getElementById('edit-credit-amount').value);
        const newCategory = document.getElementById('edit-credit-category').value;
        const newStatus = document.getElementById('edit-credit-status').value;

        // Update credit
        member.credits[creditIndex] = {
            ...member.credits[creditIndex],
            credits: newCredits,
            category: newCategory,
            status: newStatus
        };

        // Update member data
        await fetchRequest('/update_data', {
            data: {
                sheet: 'NHSMembers',
                data: { credits: member.credits },
                row_name: 'OSIS',
                row_value: currentMemberOSIS
            }
        });

        // Remove modal
        document.querySelector('.modal').remove();

        // Refresh display
        displayMemberDetails(member);
        showSuccess('Credit updated successfully');

    } catch (error) {
        console.error('Error saving credit:', error);
        showError('Failed to save credit');
    } finally {
        endLoading();
    }
}

// Function to delete a credit
async function deleteCredit(opportunityId) {
    if (!confirm('Are you sure you want to delete this credit?')) return;

    startLoading();
    try {
        const memberData = await fetchRequest('/data', {
            data: 'FULLNHSMembers'
        });
        const member = memberData.FULLNHSMembers.find(m => m.OSIS === currentMemberOSIS);
        
        if (!member || !member.credits) {
            throw new Error('Member or credits not found');
        }

        // Remove credit
        member.credits = member.credits.filter(c => c.id !== opportunityId);

        // Update member data
        await fetchRequest('/update_data', {
            data: {
                sheet: 'NHSMembers',
                data: { credits: member.credits },
                row_name: 'OSIS',
                row_value: currentMemberOSIS
            }
        });

        // Refresh display
        displayMemberDetails(member);
        showSuccess('Credit deleted successfully');

    } catch (error) {
        console.error('Error deleting credit:', error);
        showError('Failed to delete credit');
    } finally {
        endLoading();
    }
}

// Function to format time range
function formatTimeRange(startTime, endTime) {
    const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    // Handle case where startTime and endTime are direct time strings
    if (typeof startTime === 'string' && typeof endTime === 'string') {
        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }

    // Handle case where we have a JSON string of timeslots
    try {
        const timeslots = JSON.parse(startTime); // In this case, startTime contains the JSON string of all timeslots
        if (Array.isArray(timeslots) && timeslots.length > 0) {
            return timeslots.map(slot => 
                `${new Date(slot.date).toLocaleDateString()}: ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
            ).join(', ');
        }
    } catch (e) {
        // If parsing fails, try to format as single time range
        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }

    return 'Time not specified';
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