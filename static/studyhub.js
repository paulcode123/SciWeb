// Initialize the StudyHub page by fetching necessary data and setting up the UI
async function initStudyHub() {
    // Fetch all required data from multiple sheets in one request
    const data = await fetchRequest('/data', {
        data: "Classes, Assignments, Notebooks, NbS, Guides, Grades"
    });
    
    // Concurrently initialize all components of the page
    await Promise.all([
        displayUpcomingAssessments(data),
        displayPastAssessments(data),
        setupToolCards()
    ]);
}

// Filter and display assessments occurring within the next two weeks
async function displayUpcomingAssessments(data) {
    // Calculate date range for upcoming assessments (now to 2 weeks from now)
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    // Filter assignments to only show upcoming assessments
    // Includes tests, exams, quizzes, and other assessments
    const assessments = data.Assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return dueDate <= twoWeeksFromNow && 
               dueDate >= new Date() &&
               /test|exam|quiz|assessment/i.test(assignment.category);
    });

    // Clear and populate the assessments table
    const tbody = document.getElementById('assessments-body');
    tbody.innerHTML = '';
    assessments.forEach(assessment => {
        const row = createAssessmentRow(assessment, data);
        tbody.appendChild(row);
    });
}

// Create a table row for an individual assessment
function createAssessmentRow(assessment, data) {
    const row = document.createElement('tr');
    // get guides have assignment_id matching assessment.id. Get the first one, if it exists
    const guide = data.Guides.find(g => parseInt(g.assignment_id) == parseInt(assessment.id));
    const unit = guide ? guide.unit : null;
    // Count related notebooks and check for synthesis documents
    const notebookCount = data.Notebooks.filter(n => 
        parseInt(n.classID) == parseInt(assessment.class) && n.unit === unit
    ).length;
    
    const hasSynthesis = data.NbS.some(n => 
        parseInt(n.classID) == parseInt(assessment.class) && n.unit === unit
    );

    // Calculate study preparation score
    const studyScore = guide ? guide.study_score : null;
    console.log('assessment row data', assessment, data.Guides, guide, unit);
    // Create row with assessment details, study materials indicators, and action buttons
    row.innerHTML = `
        <td>${assessment.class_name} - ${unit || 'N/A'}</td>
        <td>${formatDate(assessment.due_date)}</td>
        <td class="notebook-indicator">
            ${notebookCount > 0 ? `<i class="fas fa-book"></i> ${notebookCount}` : ''}
            ${hasSynthesis ? '<i class="fas fa-check-circle"></i>' : ''}
        </td>
        <td>${studyScore || 'N/A'}</td>
        <td>
            <button class="link-btn" onclick="linkGuide('${assessment.id}')">
                <i class="fas fa-link"></i>
            </button>
        </td>
    `;

    return row;
}

// Initialize drag-and-drop functionality for tool cards
function setupToolCards() {
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        // Navigate to tool page on click
        card.addEventListener('click', () => {
            const tool = card.dataset.tool;
            window.location.href = `/${tool}`;
        });
        
        // Setup drag and drop handlers
        card.addEventListener('dragover', e => e.preventDefault());
        card.addEventListener('drop', handleToolDrop);
    });
}

// Process dropping an assessment onto a tool card
async function handleToolDrop(e) {
    e.preventDefault();
    const assessmentId = e.dataTransfer.getData('text/plain');
    const tool = e.currentTarget.dataset.tool;
    
    // Fetch fresh data to ensure accuracy
    const data = await fetchRequest('/data', {
        data: "Assignments, Notebooks, NbS"
    });
    
    // Redirect to tool page with assessment context
    const assessment = data.Assignments.find(a => a.id === assessmentId);
    if (!assessment) return;
    window.location.href = `/${tool}?classId=${assessment.classID}&unit=${assessment.unit}`;
}

// Display assessments from the past 30 days
async function displayPastAssessments(data) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Filter guides to show only those from past 30 days
    // Include completed assignments and unlinked guides
    const recentGuides = data.Guides.filter(guide => {
        const editDate = new Date(guide.last_edit);
        return editDate >= thirtyDaysAgo && 
               (!guide.assignment_id || 
                new Date(data.Assignments.find(a => a.id === guide.assignment_id)?.due_date) <= new Date());
    });

    // Populate past assessments table
    const tbody = document.getElementById('past-assessments-body');
    tbody.innerHTML = '';
    recentGuides.forEach(guide => {
        const row = createPastAssessmentRow(guide, data);
        tbody.appendChild(row);
    });
}

// Create row for a past assessment
function createPastAssessmentRow(guide, data) {
    const row = document.createElement('tr');
    
    // Find class name from class ID
    const className = data.Classes.find(c => c.id === guide.classID)?.name || 'Unknown Class';
    
    // If guide has grade, show it, otherwise show grade search
    let gradeCell;
    if (guide.grade_score && guide.grade_value) {
        const percentage = Math.round((guide.grade_score / guide.grade_value) * 100);
        gradeCell = `${percentage}% (${guide.grade_score}/${guide.grade_value})`;
    } else {
        gradeCell = `<select class="grade-select" onchange="linkGrade('${guide.id}', this.value)">
            <option value="">Select Grade</option>
            ${getRecentGradeOptions(data.Grades, className)}
        </select>`;
    }

    row.innerHTML = `
        <td>${className} - ${guide.unit || 'N/A'}</td>
        <td>${formatDate(guide.last_edit)}</td>
        <td>${gradeCell}</td>
        <td>
            ${!guide.grade_score ? `<button class="link-btn" onclick="linkGrade('${guide.id}')">
                <i class="fas fa-link"></i>
            </button>` : ''}
        </td>
    `;

    return row;
}

// Get options for grade selection
function getRecentGradeOptions(grades, className) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return grades
        .filter(grade => 
            grade.class.toLowerCase() === className.toLowerCase() &&
            new Date(grade.date) >= thirtyDaysAgo &&
            /test|exam|quiz|assessment/i.test(grade.category)
        )
        .map(grade => 
            `<option value="${grade.id}">${grade.name} - ${grade.score}/${grade.value}</option>`
        )
        .join('');
}

// Format date to MM/DD/YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}



// Link a grade to a study guide and update the display
async function linkGrade(guideId, gradeId) {
    // Fetch current grades data
    const data = await fetchRequest('/data', {
        data: "Grades"
    });
    
    // Find selected grade and update guide with grade information
    const grade = data.Grades.find(g => g.id === gradeId);
    if (!grade) return;
    
    await fetchRequest('/update_data', {
        sheet: "Guides",
        row_name: "id",
        row_value: guideId,
        data: {
            grade_score: grade.score,
            grade_value: grade.value
        }
    });
    
    // Refresh the page display
    initStudyHub();
}

// Link a study guide to an assessment or create new one if none exists
async function linkGuide(assessmentId) {
    // Fetch current data
    const data = await fetchRequest('/data', {
        data: "Assignments, Guides"
    });
    
    const assessment = data.Assignments.find(a => a.id == assessmentId);
    if (!assessment) return;
    
    // Find available unlinked guides for this class
    const availableGuides = data.Guides.filter(g => 
        parseInt(g.classId) == parseInt(assessment.class) && 
        !g.assignment_id
    );
    
    // If no guides exist, show alert
    if (availableGuides.length === 0) {
        alert('No available guides found for this class. Please create a new guide.');
        return;
    }

    // Get the guide to link (either from dropdown or single guide)
    const guideToLink = await new Promise(resolve => {
        if (availableGuides.length > 1) {
            // Create dropdown for multiple guides
            const dropdown = document.createElement('select');
            dropdown.innerHTML = '<option value="">Select a guide...</option>';
            availableGuides.forEach(guide => {
                dropdown.appendChild(new Option(guide.name, guide.id));
            });

            // Create a modal or dialog for the dropdown
            const dialog = document.createElement('div');
            dialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,0.5);z-index:1000;';
            dialog.innerHTML = '<h3>Select Guide to Link</h3>';
            dialog.appendChild(dropdown);

            // Add confirm button
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm';
            confirmBtn.style.marginTop = '10px';
            dialog.appendChild(confirmBtn);

            // Add event listeners
            confirmBtn.addEventListener('click', () => {
                if (!dropdown.value) {
                    alert('Please select a guide');
                    return;
                }
                const selected = availableGuides.find(g => g.id === dropdown.value);
                document.body.removeChild(dialog);
                resolve(selected);
            });

            document.body.appendChild(dialog);
        } else {
            // If only one guide, use it directly
            resolve(availableGuides[0]);
        }
    });

    if (!guideToLink) return;
    
    // Update the guide with the assessment ID
    await fetchRequest('/update_data', {
        sheet: "Guides",
        row_name: "id",
        row_value: guideToLink.id,
        data: {
            assignment_id: assessmentId
        }
    });
    
    // Refresh the display
    initStudyHub();
}

// Initialize the page when loaded
window.addEventListener('load', initStudyHub); 