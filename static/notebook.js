let currentClassId = null;
let currentUnitName = null;
let notebookData = {};

document.addEventListener('DOMContentLoaded', function() {
    loadContext();
    setupEventListeners();
});

function loadContext() {
    fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'FILTERED Classes, FILTERED Notebooks' })
    })
    .then(response => response.json())
    .then(data => {
        notebookData = data;
        loadClasses();
        if (currentClassId && currentUnitName) {
            loadUnitWorksheets(currentClassId, currentUnitName);
        }
    });
}

function loadClasses() {
    const sidebar = document.getElementById('sidebar');
    const contentArea = document.getElementById('content-area');
    sidebar.innerHTML = ''; // Clear existing content
    contentArea.innerHTML = ''; // Clear existing content
    
    notebookData.Classes.forEach(classItem => {
        const classButton = createClassButton(classItem);
        sidebar.appendChild(classButton);
        
        const classSection = createClassSection(classItem);
        contentArea.appendChild(classSection);
    });
}

function createClassButton(classItem) {
    const button = document.createElement('button');
    button.className = 'class-button';
    button.textContent = classItem.name;
    button.addEventListener('click', () => {
        document.getElementById(`class-${classItem.id}`).scrollIntoView({ behavior: 'smooth' });
    });
    return button;
}

function loadUnitWorksheets(classId, unitName) {
    currentClassId = classId;
    currentUnitName = unitName;
    const worksheets = notebookData.Notebooks.filter(notebook => 
        notebook.classID === classId && notebook.unit === unitName
    );
    
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `<h2>Worksheets for ${unitName}</h2>`;
    worksheets.forEach(worksheet => {
        const worksheetElement = createWorksheetElement(worksheet);
        contentArea.appendChild(worksheetElement);
    });
}

function createWorksheetElement(worksheet) {
    const worksheetDiv = document.createElement('div');
    worksheetDiv.className = 'worksheet-item';
    worksheetDiv.innerHTML = `
        <h3>${worksheet.topic}</h3>
        <p>Uploaded: ${worksheet.timestamp}</p>
        <h4>Notes:</h4>
        <ul>${worksheet.subtopics.map(subtopic => `<li>${subtopic}</li>`).join('')}</ul>
        <h4>Practice Questions:</h4>
        <ol>${worksheet.practice_questions.map(question => `<li>${question}</li>`).join('')}</ol>
        <div class="worksheet-actions">
            <button class="view-worksheet" data-image="${worksheet.image}">View Worksheet</button>
            <button class="delete-worksheet" data-id="${worksheet.id}">Delete Worksheet</button>
        </div>
    `;
    return section;
}

// Remove or comment out the following functions as they're no longer needed:
// createClassElement, getUniqueUnits, createUnitElement, loadUnitWorksheets,
// createWorksheetElement, deleteWorksheet, createNewUnit, uploadWorksheet,
// sendWorksheetToServer, viewWorksheet

function setupEventListeners() {
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('content').classList.toggle('expanded');
    });
}