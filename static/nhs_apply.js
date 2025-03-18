// Credit requirements data
const requirements = {
    junior: {
        freshman: {
            service: 13,
            leadershipCitizenship: 45,  // Combined Leadership + Citizenship requirement
            gpa: 93
        },
        sophomore: {
            service: 8,
            leadershipCitizenship: 30,  // Combined Leadership + Citizenship requirement
            gpa: 93
        }
    },
    senior: {
        freshman: {
            service: 15,
            leadershipCitizenship: 60,  // Combined Leadership + Citizenship requirement
            gpa: 93
        },
        sophomore: {
            service: 10,
            leadershipCitizenship: 45,  // Combined Leadership + Citizenship requirement
            gpa: 93
        }
    }
};

// Activity codes data
const activityCodes = {
    service: {
        'S1 - School Tutoring': { credits: 'hours', requiresVerification: false, additionalField: { name: 'Subject', type: 'text', placeholder: 'e.g. Math, Physics' } },
        'S2 - Out of School Tutoring': { credits: 'hours', requiresVerification: true, additionalField: { name: 'Organization', type: 'text', placeholder: 'e.g. Kumon, Private' } },
        'S3 - Club Service': { credits: 'hours', requiresVerification: false, additionalField: { name: 'Club', type: 'text', placeholder: 'e.g. Key Club' } },
        'S4 - School Service': { credits: 'hours', requiresVerification: false, additionalField: { name: 'Event', type: 'text', placeholder: 'e.g. Open House' } },
        'S5 - Community Service': { credits: 'hours', requiresVerification: true, additionalField: { name: 'Organization', type: 'text', placeholder: 'e.g. Food Bank, Library' } }
    },
    leadership: {
        'L1 - Team Officer': { credits: 8, additionalField: { name: 'Team', type: 'text', placeholder: 'e.g. Robotics Team' } },
        'L2 - Club Officer': { credits: 8, additionalField: { name: 'Club', type: 'text', placeholder: 'e.g. Math Club' } },
        'L3 - Team Captain': { credits: 8, additionalField: { name: 'Team', type: 'text', placeholder: 'e.g. Debate Team' } },
        'L4 - Student Government': { credits: 8, additionalField: { name: 'Position', type: 'text', placeholder: 'e.g. Class President' } },
        'L5 - Event Leadership': { credits: 'hours', additionalField: { name: 'Event', type: 'text', placeholder: 'e.g. Science Fair' } }
    },
    citizenship: {
        'C1 - Sports Team': { credits: 8, additionalField: { name: 'Team', type: 'text', placeholder: 'e.g. Varsity Basketball' } },
        'C2 - School Club': { credits: 8, additionalField: { name: 'Club', type: 'text', placeholder: 'e.g. Chess Club' } },
        'C3 - Competition Team': { credits: 8, additionalField: { name: 'Team', type: 'text', placeholder: 'e.g. Math Team' } },
        'C4 - Performance Group': { credits: 8, additionalField: { name: 'Group', type: 'text', placeholder: 'e.g. Orchestra' } },
        'C5 - Outside Organization': { credits: 8, requiresVerification: true, additionalField: { name: 'Organization', type: 'text', placeholder: 'e.g. Boy Scouts' } }
    }
};

// State management
let currentCredits = {
    service: 0,
    leadership: 0,
    citizenship: 0
};

let addedCredits = [];

// Add these at the top of the file
let applicationId = null;
let lastSaveTimeout = null;
let isFirstSave = true;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    updateRequirements();
    attachEventListeners();
    
    // Load existing progress
    loadProgress();
    
    // Add change listeners to all form inputs
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', debounceAutoSave);
    });
});

function attachEventListeners() {
    document.getElementById('nhs-application-form').addEventListener('submit', handleSubmit);
    document.getElementById('grade').addEventListener('change', updateRequirements);
    document.getElementById('entryGrade').addEventListener('change', updateRequirements);
    document.getElementById('creditType').addEventListener('change', updateActivityCodes);
    document.getElementById('activityCode').addEventListener('change', updateActivityDetails);
    document.getElementsByName('meetsGpa').forEach(radio => {
        radio.addEventListener('change', updateSubmitButton);
    });
}

function updateRequirements() {
    const currentGrade = document.getElementById('grade').value;
    const entryGrade = document.getElementById('entryGrade').value;
    if (!currentGrade || !entryGrade) return;

    const reqs = currentGrade === '11' ? requirements.junior : requirements.senior;
    
    // Update GPA requirement display
    document.getElementById('requiredGpa').textContent = reqs.freshman.gpa;
    
    // Calculate total required credits based on entry grade
    const serviceRequired = entryGrade === '9' ? 
        reqs.freshman.service + reqs.sophomore.service : 
        reqs.sophomore.service;
    
    // Use the single leadershipCitizenship value based on entry grade
    const leadershipCitizenshipRequired = entryGrade === '9' ? 
        reqs.freshman.leadershipCitizenship : 
        reqs.sophomore.leadershipCitizenship;

    const requirementsTable = document.getElementById('requirements-table');
    requirementsTable.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Credit Category</th>
                    <th>Credits Required</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Scholarship</td>
                    <td>${reqs.freshman.gpa} GPA Required</td>
                </tr>
                <tr>
                    <td>Service Credits</td>
                    <td>${serviceRequired}</td>
                </tr>
                <tr>
                    <td>Leadership + Citizenship Credits</td>
                    <td>${leadershipCitizenshipRequired}</td>
                </tr>
            </tbody>
        </table>
    `;

    updateProgress();
}

function updateActivityCodes() {
    const creditType = document.getElementById('creditType').value;
    const activitySelect = document.getElementById('activityCode');
    activitySelect.innerHTML = '<option value="">Select Activity</option>';

    if (!creditType) return;

    const activities = activityCodes[creditType];
    Object.entries(activities).forEach(([code, activity]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${code.split(' - ')[1]}`;
        activitySelect.appendChild(option);
    });
}

function updateActivityDetails() {
    const creditType = document.getElementById('creditType').value;
    const activityCode = document.getElementById('activityCode').value;
    const activityDetails = document.getElementById('activity-details');
    
    if (!creditType || !activityCode) {
        activityDetails.innerHTML = '';
        return;
    }

    const activity = activityCodes[creditType][activityCode];
    const needsVerification = activity.requiresVerification || false;
    const additionalField = activity.additionalField;

    activityDetails.innerHTML = `
        <div class="form-grid">
            ${additionalField ? `
            <div class="form-group">
                <label for="additionalField">${additionalField.name}*</label>
                <input type="text" id="additionalField" required
                    placeholder="${additionalField.placeholder}">
            </div>` : ''}
            <div class="form-group">
                <label for="startDate">Start Date*</label>
                <input type="date" id="startDate" required>
            </div>
            <div class="form-group">
                <label for="endDate">End Date*</label>
                <input type="date" id="endDate" required>
            </div>
            ${activity.credits === 'hours' ? `
            <div class="form-group">
                <label for="timeValue">Number of Hours*</label>
                <input type="number" id="timeValue" min="0" step="0.5" required>
            </div>` : ''}
            <div class="form-group">
                <label for="advisor">Advisor Name*</label>
                <input type="text" id="advisor" required>
            </div>
            <div class="form-group">
                <label for="advisorEmail">Advisor Email*</label>
                <input type="email" id="advisorEmail" required>
            </div>
            ${needsVerification ? `
            <div class="form-group">
                <label for="verification-file">Verification Letter*</label>
                <input type="file" id="verification-file" accept=".pdf,.doc,.docx" required>
                <div class="help-text">Please upload a signed verification letter</div>
            </div>` : ''}
        </div>
    `;
}

function addCredit() {
    const creditType = document.getElementById('creditType').value;
    const activityCode = document.getElementById('activityCode').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const advisor = document.getElementById('advisor').value;
    const advisorEmail = document.getElementById('advisorEmail').value;
    const additionalFieldValue = document.getElementById('additionalField')?.value;
    
    const activity = activityCodes[creditType][activityCode];
    let credits = activity.credits;
    
    if (credits === 'hours') {
        const timeValue = parseFloat(document.getElementById('timeValue').value);
        credits = timeValue;
    }

    const newCredit = {
        id: Date.now(),
        type: creditType,
        code: activityCode,
        name: activityCode.split(' - ')[1],
        credits: credits,
        startDate: startDate,
        endDate: endDate,
        timeValue: activity.credits === 'hours' ? document.getElementById('timeValue').value : null,
        advisor: advisor,
        advisorEmail: advisorEmail,
        additionalDetail: additionalFieldValue
    };

    addedCredits.push(newCredit);
    currentCredits[creditType] += credits;

    updateCreditsList();
    updateProgress();
    
    // Reset form
    document.querySelectorAll('#activity-details input').forEach(input => input.value = '');
    validateCreditForm();

    debounceAutoSave(); // Add this at the end
}

function calculateCredits(creditRule, timeValue) {
    if (typeof creditRule === 'number') return creditRule;
    
    const [_, credits, period] = creditRule.match(/(\d+)\/(\w+)/);
    const creditsPerUnit = parseInt(credits);
    
    // Simply multiply credits by the time value
    return creditsPerUnit * parseInt(timeValue);
}

function getMissingFields(credit) {
    const activity = activityCodes[credit.type][credit.code];
    const missing = [];

    // Check required fields
    if (!credit.startDate) missing.push('Start Date');
    if (!credit.endDate) missing.push('End Date');
    if (!credit.advisor) missing.push('Advisor Name');
    if (!credit.advisorEmail) missing.push('Advisor Email');
    if (!credit.additionalDetail) missing.push(activity.additionalField.name);
    
    // Check hours if required
    if (activity.credits === 'hours' && !credit.timeValue) {
        missing.push('Number of Hours');
    }

    // Check verification if required
    if (activity.requiresVerification && !credit.verificationFile) {
        missing.push('Verification Letter');
    }

    return missing;
}

function updateCreditsList() {
    const creditsList = document.getElementById('credits-list');
    creditsList.innerHTML = addedCredits.map(credit => {
        const activity = activityCodes[credit.type][credit.code];
        const missingFields = getMissingFields(credit);
        const isComplete = missingFields.length === 0;
        
        const timeLabel = activity.credits === 'hours' 
            ? `<div>Hours: ${credit.timeValue || '—'}</div>`
            : '';
            
        const completionIcon = isComplete 
            ? '<span class="completion-icon complete" title="All information complete">✓</span>'
            : `<span class="completion-icon incomplete" title="Missing: ${missingFields.join(', ')}">⚠</span>`;

        return `
            <div class="credit-item">
                <div class="credit-info">
                    <div class="credit-header">
                        <strong>${credit.code} - ${credit.additionalDetail || '(No name provided)'}</strong>
                        ${completionIcon}
                    </div>
                    <div>Type: ${credit.type}</div>
                    <div>Credits: ${credit.credits}</div>
                    <div>Dates: ${credit.startDate || '—'} to ${credit.endDate || '—'}</div>
                    ${timeLabel}
                    <div>Advisor: ${credit.advisor || '—'}</div>
                </div>
                <div class="credit-actions">
                    <button onclick="editCredit(${credit.id})" class="edit-btn">Edit</button>
                    <button onclick="removeCredit(${credit.id})" class="remove-btn">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

function editCredit(id) {
    const creditToEdit = addedCredits.find(credit => credit.id === id);
    if (!creditToEdit) return;

    // Remove the credit from totals temporarily
    currentCredits[creditToEdit.type] -= creditToEdit.credits;
    addedCredits = addedCredits.filter(credit => credit.id !== id);

    // Populate the form with existing values
    document.getElementById('creditType').value = creditToEdit.type;
    updateActivityCodes(); // Update activity codes dropdown
    
    document.getElementById('activityCode').value = creditToEdit.code;
    updateActivityDetails(); // Update activity details
    
    document.getElementById('startDate').value = creditToEdit.startDate;
    document.getElementById('endDate').value = creditToEdit.endDate;
    document.getElementById('timeValue').value = creditToEdit.timeValue;
    document.getElementById('advisor').value = creditToEdit.advisor;
    document.getElementById('advisorEmail').value = creditToEdit.advisorEmail;

    // Update UI
    updateCreditsList();
    updateProgress();
    validateCreditForm();

    // Scroll to the form
    document.getElementById('add-credit-section').scrollIntoView({ behavior: 'smooth' });

    debounceAutoSave(); // Add this at the end
}

function removeCredit(id) {
    const creditToRemove = addedCredits.find(credit => credit.id === id);
    if (creditToRemove) {
        // Remove the credit from the total
        currentCredits[creditToRemove.type] -= creditToRemove.credits;
    }
    
    // Remove from the list
    addedCredits = addedCredits.filter(credit => credit.id !== id);
    
    // Update the UI
    updateCreditsList();
    updateProgress();

    debounceAutoSave(); // Add this at the end
}

function updateProgress() {
    const currentGrade = document.getElementById('grade').value;
    const entryGrade = document.getElementById('entryGrade').value;
    if (!currentGrade || !entryGrade) return;

    const reqs = currentGrade === '11' ? requirements.junior : requirements.senior;
    
    // Calculate totals from addedCredits to ensure accuracy
    currentCredits = {
        service: 0,
        leadership: 0,
        citizenship: 0
    };

    addedCredits.forEach(credit => {
        currentCredits[credit.type] += credit.credits;
    });

    // Update service progress
    const serviceRequired = entryGrade === '9' ? 
        reqs.freshman.service + reqs.sophomore.service : 
        reqs.sophomore.service;
    const servicePercentage = Math.min((currentCredits.service / serviceRequired) * 100, 100);
    
    const serviceProgress = document.getElementById('service-progress');
    const serviceCount = document.getElementById('service-count');
    
    if (serviceProgress) {
        serviceProgress.style.width = `${servicePercentage}%`;
        if (servicePercentage >= 100) {
            serviceProgress.classList.add('complete');
        } else {
            serviceProgress.classList.remove('complete');
        }
    }
    
    if (serviceCount) {
        serviceCount.textContent = `${currentCredits.service}/${serviceRequired}`;
    }

    // Update combined leadership + citizenship progress
    const leadershipCitizenshipRequired = entryGrade === '9' ? 
        reqs.freshman.leadershipCitizenship : 
        reqs.sophomore.leadershipCitizenship;
    const combinedCredits = currentCredits.leadership + currentCredits.citizenship;
    const leadershipPercentage = Math.min((combinedCredits / leadershipCitizenshipRequired) * 100, 100);
    
    const leadershipProgress = document.getElementById('leadership-citizenship-progress');
    const leadershipCount = document.getElementById('leadership-citizenship-count');
    
    if (leadershipProgress) {
        leadershipProgress.style.width = `${leadershipPercentage}%`;
        if (leadershipPercentage >= 100) {
            leadershipProgress.classList.add('complete');
        } else {
            leadershipProgress.classList.remove('complete');
        }
    }
    
    if (leadershipCount) {
        leadershipCount.textContent = `${combinedCredits}/${leadershipCitizenshipRequired}`;
    }

    updateSubmitButton();
}

function updateSubmitButton() {
    const currentGrade = document.getElementById('grade').value;
    const entryGrade = document.getElementById('entryGrade').value;
    const meetsGpa = document.querySelector('input[name="meetsGpa"]:checked')?.value === 'yes';
    
    if (!currentGrade || !entryGrade) return;

    const reqs = currentGrade === '11' ? requirements.junior : requirements.senior;
    
    // Calculate required credits based on entry grade
    const serviceRequired = entryGrade === '9' ? 
        reqs.freshman.service + reqs.sophomore.service : 
        reqs.sophomore.service;
    const leadershipCitizenshipRequired = entryGrade === '9' ? 
        reqs.freshman.leadershipCitizenship : 
        reqs.sophomore.leadershipCitizenship;
    const combinedCredits = currentCredits.leadership + currentCredits.citizenship;

    const meetsRequirements = 
        meetsGpa &&
        currentCredits.service >= serviceRequired &&
        combinedCredits >= leadershipCitizenshipRequired;

    const submitBtn = document.getElementById('submit-application');
    submitBtn.disabled = !meetsRequirements;

    const status = document.getElementById('requirements-status');
    status.innerHTML = `
        <div class="requirements-list">
            <div class="requirement ${meetsGpa ? 'met' : 'unmet'}">
                GPA Requirement: ${meetsGpa ? 'Met' : 'Not Met'}
            </div>
            <div class="requirement ${currentCredits.service >= serviceRequired ? 'met' : 'unmet'}">
                Service Credits: ${currentCredits.service} / ${serviceRequired}
            </div>
            <div class="requirement ${combinedCredits >= leadershipCitizenshipRequired ? 'met' : 'unmet'}">
                Leadership + Citizenship Credits: ${combinedCredits} / ${leadershipCitizenshipRequired}
            </div>
        </div>
    `;
}

function validateCreditForm() {
    const creditType = document.getElementById('creditType')?.value || '';
    const activityCode = document.getElementById('activityCode')?.value || '';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const advisor = document.getElementById('advisor')?.value || '';
    const advisorEmail = document.getElementById('advisorEmail')?.value || '';
    const verificationFile = document.getElementById('verification-file');
    const timeValue = document.getElementById('timeValue')?.value || '';
    const completionIcon = document.getElementById('completion-icon');

    // If no activity is selected, just show incomplete state
    if (!creditType || !activityCode) {
        if (completionIcon) {
            completionIcon.innerHTML = '○';
            completionIcon.className = 'completion-icon incomplete';
        }
        return true;
    }

    const activity = activityCodes[creditType][activityCode];
    const needsVerification = activity?.requiresVerification || false;
    const hasVerification = verificationFile?.files?.length > 0;

    // Check if all required fields are filled
    const isComplete = creditType && activityCode && startDate && endDate && 
        advisor && advisorEmail && 
        // Only check timeValue if the activity uses hours
        (activity?.credits !== 'hours' || timeValue);

    if (completionIcon) {
        if (isComplete && (!needsVerification || hasVerification)) {
            completionIcon.innerHTML = '✓';
            completionIcon.className = 'completion-icon complete';
        } else {
            completionIcon.innerHTML = '○';
            completionIcon.className = 'completion-icon incomplete';
        }
    }

    return true;
}

function resetCreditForm() {
    document.getElementById('creditType').value = '';
    document.getElementById('activityCode').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('timeValue').value = '';
    document.getElementById('advisor').value = '';
    document.getElementById('advisorEmail').value = '';
    document.getElementById('activity-details').innerHTML = '';
    document.getElementById('verification-upload').style.display = 'none';
}

async function handleSubmit(event) {
    event.preventDefault();
    startLoading();

    try {
        const formData = new FormData(event.target);
        const applicationData = {
            personalInfo: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                grade: formData.get('grade'),
                homeroom: formData.get('homeroom'),
                gpa: formData.get('gpa')
            },
            credits: addedCredits,
            totals: currentCredits,
            submissionDate: new Date().toISOString()
        };

        await fetchRequest('/post_data', {
            sheet: 'NHSApplications',
            data: applicationData
        });

        showSuccess('Application submitted successfully!');
        setTimeout(() => window.location.href = '/nhs', 2000);
    } catch (error) {
        console.error('Error submitting application:', error);
        showError('Failed to submit application. Please try again.');
    } finally {
        endLoading();
    }
}

function startLoading() {
    document.body.classList.add('loading');
}

function endLoading() {
    document.body.classList.remove('loading');
}

function showSuccess(message) {
    alert(message); // Replace with better notification system
}

function showError(message) {
    alert(message); // Replace with better notification system
}

// Add auto-save functionality
function debounceAutoSave() {
    if (lastSaveTimeout) {
        clearTimeout(lastSaveTimeout);
    }
    lastSaveTimeout = setTimeout(saveProgress, 3000); // Auto-save after 3 seconds of no changes
}

async function saveProgress() {
    const saveBtn = document.getElementById('save-progress-btn');
    const saveIndicator = document.getElementById('save-indicator');
    const lastSavedSpan = document.getElementById('last-saved');

    saveBtn.classList.add('saving');
    saveIndicator.classList.add('visible');
    startLoading();

    const grade = document.getElementById('grade').value;
    const entryGrade = document.getElementById('entryGrade').value;
    const meetsGpa = document.querySelector('input[name="meetsGpa"]:checked')?.value === 'yes';
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const homeroom = document.getElementById('homeroom').value;

    const applicationData = {
        id: applicationId,
        OSIS: osis, // Will be filled by backend
        status: 'draft',
        grade: parseInt(grade) || null,
        entry_grade: parseInt(entryGrade) || null,
        meets_gpa: meetsGpa,
        credits: addedCredits,
        total_credits: currentCredits,
        first_name: firstName,
        last_name: lastName,
        email: email,
        homeroom: homeroom,
        last_saved: new Date().toISOString()
    };

    try {
        let result;
        if (isFirstSave) {
            // First save of the session - use post_data
            result = await fetchRequest('/post_data', {
                sheet: 'NHSApplications',
                data: applicationData
            });
        } else {
            // Subsequent saves - use update_data
            result = await fetchRequest('/update_data', {
                sheet: 'NHSApplications',
                data: applicationData,
                row_name: 'id',
                row_value: applicationId
            });
        }

        // Check for message: "success" in the response
        if (result && result.message === "success") {
            if (isFirstSave) {
                applicationId = result.id || applicationId; // Fallback to existing ID if none returned
                isFirstSave = false;
            }

            // Update last saved time
            const now = new Date();
            lastSavedSpan.textContent = `Last saved at ${now.toLocaleTimeString()}`;
            
            // Show success state
            saveBtn.classList.remove('saving');
            saveBtn.classList.add('saved');
            setTimeout(() => saveBtn.classList.remove('saved'), 1000);
        } else {
            throw new Error('Failed to save progress: Unexpected response format');
        }
    } catch (error) {
        console.error('Error saving progress:', error);
        showError('Failed to save progress. Please try again.');
        saveBtn.classList.remove('saving');
    } finally {
        saveIndicator.classList.remove('visible');
        endLoading();
    }
}

async function loadProgress() {
    try {
        startLoading();
        const data = await fetchRequest('/data', {
            data: 'NHSApplications'
        });

        if (!data || !data.NHSApplications) {
            isFirstSave = true;
            return; // No saved progress
        }

        // Find the user's draft application
        const userApplication = data.NHSApplications.find(app => app.status === 'draft');
        if (!userApplication) {
            isFirstSave = true;
            return;
        }

        // Found existing application - next save will be an update
        isFirstSave = false;
        applicationId = userApplication.id;

        // Restore form values
        if (userApplication.grade) document.getElementById('grade').value = userApplication.grade;
        if (userApplication.entry_grade) document.getElementById('entryGrade').value = userApplication.entry_grade;
        if (userApplication.meets_gpa !== undefined) {
            const gpaRadio = document.querySelector(`input[name="meetsGpa"][value="${userApplication.meets_gpa ? 'yes' : 'no'}"]`);
            if (gpaRadio) gpaRadio.checked = true;
        }
        if (userApplication.first_name) document.getElementById('firstName').value = userApplication.first_name;
        if (userApplication.last_name) document.getElementById('lastName').value = userApplication.last_name;
        if (userApplication.email) document.getElementById('email').value = userApplication.email;
        if (userApplication.homeroom) document.getElementById('homeroom').value = userApplication.homeroom;

        // Restore credits
        addedCredits = userApplication.credits || [];
        currentCredits = userApplication.total_credits || { service: 0, leadership: 0, citizenship: 0 };

        // Update UI
        updateActivityCodes();
        updateCreditsList();
        updateProgress();
        validateCreditForm();

        // Update last saved time
        const lastSaved = new Date(userApplication.last_saved);
        document.getElementById('last-saved').textContent = `Last saved at ${lastSaved.toLocaleTimeString()}`;
    } catch (error) {
        console.error('Error loading progress:', error);
        // Don't show an alert here as it's not critical
    } finally {
        endLoading();
    }
} 