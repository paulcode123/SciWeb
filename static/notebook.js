let currentClassId = null;
let currentUnitName = null;
let notebookData = {};

document.addEventListener('DOMContentLoaded', function() {
    loadContext();
    setupEventListeners();
});

function loadContext() {
    startLoading();
    fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'Classes, Notebooks' })
    })
    .then(response => response.json())
    .then(data => {
        notebookData = data;
        loadClasses();
        if (currentClassId && currentUnitName) {
            loadUnitWorksheets(currentClassId, currentUnitName);
        }
    });
    endLoading();
}

function loadClasses() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = ''; // Clear existing content
    
    notebookData.Classes.forEach(classItem => {
        const classElement = createClassElement(classItem);
        sidebar.appendChild(classElement);
    });
}

function createClassElement(classItem) {
    const classDiv = document.createElement('div');
    classDiv.className = 'class-item';
    classDiv.dataset.id = classItem.id;
    classDiv.innerHTML = `
        <h3>${classItem.name}</h3>
        <div class="units-container" style="display: none;">
            <button class="create-unit" title="Create Unit"><i class="fas fa-plus"></i></button>
        </div>
    `;
    
    const unitsContainer = classDiv.querySelector('.units-container');
    const units = getUniqueUnits(classItem.id);
    units.forEach(unitName => {
        const unitElement = createUnitElement(classItem.id, unitName);
        unitsContainer.appendChild(unitElement);
    });

    classDiv.querySelector('h3').addEventListener('click', () => {
        unitsContainer.style.display = unitsContainer.style.display === 'none' ? 'block' : 'none';
    });

    classDiv.querySelector('.create-unit').addEventListener('click', (e) => {
        e.stopPropagation();
        createNewUnit(classItem.id);
    });

    return classDiv;
}

function getUniqueUnits(classId) {
    return [...new Set(notebookData.Notebooks
        .filter(notebook => notebook.classID === classId)
        .map(notebook => notebook.unit))];
}

function createUnitElement(classId, unitName) {
    const unitDiv = document.createElement('div');
    unitDiv.className = 'unit-item';
    unitDiv.dataset.name = unitName;
    unitDiv.innerHTML = `
        <h4>${unitName}</h4>
        <button class="upload-worksheet" title="Upload Worksheet"><i class="fas fa-file-upload"></i></button>
    `;
    unitDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        currentClassId = classId;
        currentUnitName = unitName;
        loadUnitWorksheets(classId, unitName);
    });
    unitDiv.querySelector('.upload-worksheet').addEventListener('click', (e) => {
        e.stopPropagation();
        uploadWorksheet(classId, unitName);
    });
    return unitDiv;
}

function loadUnitWorksheets(classId, unitName) {
    currentClassId = classId;
    currentUnitName = unitName;
    const worksheets = notebookData.Notebooks.filter(notebook => 
        notebook.classID === classId && notebook.unit === unitName
    );
    
    // Remove highlight from all units
    document.querySelectorAll('.unit-item').forEach(unit => {
        unit.classList.remove('selected-unit');
    });
    
    // Add highlight to selected unit
    const selectedUnit = document.querySelector(`.unit-item[data-name="${unitName}"]`);
    if (selectedUnit) {
        selectedUnit.classList.add('selected-unit');
    }
    
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
        <h3><i class="fas fa-book-open"></i> ${worksheet.topic}</h3>
        <p><i class="far fa-clock"></i> ${worksheet.timestamp}</p>
        <div class="notes-section">
            <h4><i class="fas fa-pencil-alt"></i> Notes:</h4>
            <ul class="notes-list">
                ${worksheet.subtopics.map(subtopic => 
                    `<li>
                        <i class="fas fa-angle-right"></i>
                        <span class="note-text">${subtopic}</span>
                    </li>`
                ).join('')}
            </ul>
        </div>
        <div class="practice-section">
            <h4><i class="fas fa-tasks"></i> Practice Questions:</h4>
            <ol class="practice-list">
                ${worksheet.practice_questions.map(question => 
                    `<li>
                        <i class="fas fa-question-circle"></i>
                        <span class="question-text">${question}</span>
                    </li>`
                ).join('')}
            </ol>
        </div>
        <div class="worksheet-actions">
            <button class="view-worksheet" data-image="${worksheet.image}" title="View Worksheet">
                <i class="fas fa-eye"></i>
            </button>
            <button class="delete-worksheet" data-image="${worksheet.image}" title="Delete Worksheet">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    worksheetDiv.querySelector('.view-worksheet').addEventListener('click', (e) => {
        console.log(e.currentTarget.dataset.image);
        viewWorksheet(e.currentTarget.dataset.image, worksheetDiv);
    });
    worksheetDiv.querySelector('.delete-worksheet').addEventListener('click', (e) => {
        console.log(e.currentTarget.dataset.image);
        deleteWorksheet(e.currentTarget.dataset.image, worksheetDiv);
    });
    return worksheetDiv;
}

function deleteWorksheet(worksheetId, worksheetElement) {
    if (confirm('Are you sure you want to delete this worksheet?')) {
        startLoading();
        fetchRequest('/delete_data', {
            row_value: worksheetId,
            row_name: 'image',
            sheet: 'Notebooks'
        })
        .then(data => {
            if (data.message === 'success') {
                worksheetElement.remove();
                alert('Worksheet deleted successfully');
            } else {
                alert('Failed to delete worksheet. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error deleting worksheet. Please try again.');
        });
        endLoading();
    }
}

function createNewUnit(classId) {
    const unitName = prompt("Enter the name for the new unit:");
    if (unitName) {
        
        alert('Unit created successfully! You can now upload worksheets to this unit.');
        // create a new unit in the sudebar under the class
        const sidebar = document.getElementById('sidebar');
        const classElement = sidebar.querySelector(`[data-id="${classId}"]`);
        const unitsContainer = classElement.querySelector('.units-container');
        const unitElement = createUnitElement(classId, unitName);
        unitsContainer.appendChild(unitElement);
    }
}

function uploadWorksheet(classId, unitName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64File = e.target.result.split(',')[1];
                sendWorksheetToServer(classId, unitName, base64File, file.type);
            };
            reader.readAsDataURL(file);
        }
    }
    input.click();
}

function sendWorksheetToServer(classId, unitName, base64File, fileType) {
    startLoading();
    fetch('/process-notebook-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            classID: classId,
            unit: unitName,
            file: base64File,
            fileType: fileType
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Worksheet uploaded successfully!');
            loadContext(); // Reload the entire context
        } else {
            alert('Error uploading worksheet. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error uploading worksheet. Please try again.');
    });
    endLoading();
}

async function viewWorksheet(imageReference, worksheetDiv) {
    console.log(`Viewing worksheet with image reference: ${imageReference}`);
    
    try {
        startLoading();
        // Use fetchRequest to get the file from the server
        const data = await fetchRequest('/get-file', { file: imageReference });
        
        if (!data || !data.file) {
            throw new Error('Failed to retrieve file data');
        }

        // Create an image element
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${data.file}`;
        img.alt = 'Worksheet';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        
        
        worksheetDiv.appendChild(img);
        
    } catch (error) {
        console.error('Error fetching or displaying the worksheet:', error);
        alert('Failed to load the worksheet. Please try again.');
    }
    endLoading();
}

function setupEventListeners() {
    const toggleButton = document.getElementById('notebook-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    toggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
        
        const icon = toggleButton.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}