let currentClassId = null;
let currentUnitName = null;
let notebookData = {};

document.addEventListener('DOMContentLoaded', function() {
    loadContext();
    setupEventListeners();
    
    // Initialize MathJax
    window.MathJax = {
        tex: {
            inlineMath: [['\\(', '\\)']],
            displayMath: [['\\[', '\\]']],
            processEscapes: true
        },
        options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    document.head.appendChild(script);
});

async function loadContext() {
    startLoading();
    
    // Wait for login to complete if needed
    if (!window.loginComplete) {
        await new Promise(resolve => {
            const checkLogin = setInterval(() => {
                if (window.loginComplete) {
                    clearInterval(checkLogin);
                    resolve();
                }
            }, 100);
        });
    }
    
    fetchRequest('/data', { data: 'Classes, Notebooks, Name' })
    .then(data => {
        notebookData = data;
        loadClasses();
        
        // Check for upload parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('class');
        const encodedUnit = urlParams.get('unit');
        
        if (classId && encodedUnit) {
            currentClassId = classId;
            // Replace underscores with spaces
            currentUnitName = encodedUnit.replace(/_/g, ' ');
            loadUnitWorksheets(classId, currentUnitName);
            // Trigger upload dialog
            uploadWorksheet(classId, currentUnitName);
        } else if (currentClassId && currentUnitName) {
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
    contentArea.innerHTML = `
        <h2>Worksheets for ${unitName}</h2>
        <button id="synthesize-unit" class="synthesize-button">
            <i class="fas fa-robot"></i> Synthesize Unit for StudyBot
        </button>
    `;
    
    // Add event listener for synthesis
    document.getElementById('synthesize-unit').addEventListener('click', () => {
        synthesizeUnit(classId, unitName);
    });
    
    worksheets.forEach(worksheet => {
        const worksheetElement = createWorksheetElement(worksheet);
        contentArea.appendChild(worksheetElement);
    });
}

async function synthesizeUnit(classId, unitName) {
    try {
        startLoading();
        
        // Get notebooks for this unit
        const unitNotebooks = notebookData.Notebooks.filter(
            notebook => notebook.classID === classId && notebook.unit === unitName
        );
        
        const response = await fetch('/synthesize_unit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notebook: unitNotebooks,
                classID: classId,
                unit: unitName
            })
        });
        
        const data = await response.json();
        
        if (data.message === 'success') {
            alert('Unit successfully synthesized for StudyBot!');
            // clear NbS sheet from local storage
            localStorage.removeItem('NbS');
        } else {
            throw new Error('Synthesis failed');
        }
        
    } catch (error) {
        console.error('Error synthesizing unit:', error);
        alert('Failed to synthesize unit. Please try again.');
    }
    endLoading();
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
            <button class="add-note"><i class="fas fa-plus"></i> Add Note</button>
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
            <button class="add-question"><i class="fas fa-plus"></i> Add Question</button>
        </div>
        <div class="worksheet-actions">
            <button class="view-worksheet" data-image="${worksheet.image}" title="View Worksheet">
                <i class="fas fa-eye"></i>
            </button>
            <button class="ask-question" data-image="${worksheet.image}" title="Ask Question">
                <i class="fas fa-question"></i>
            </button>
            <button class="delete-worksheet" data-image="${worksheet.image}" title="Delete Worksheet">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="question-answer-section" style="display: none;">
            <div class="question-input">
                <textarea placeholder="Ask a question about this worksheet..."></textarea>
                <button class="submit-question">Ask</button>
            </div>
            <div class="answer-display"></div>
        </div>
    `;

    // Add event listeners for the new buttons
    worksheetDiv.querySelector('.add-note').addEventListener('click', () => {
        addNoteToWorksheet(worksheet.image, worksheetDiv);
    });

    worksheetDiv.querySelector('.add-question').addEventListener('click', () => {
        addQuestionToWorksheet(worksheet.image, worksheetDiv);
    });

    worksheetDiv.querySelector('.view-worksheet').addEventListener('click', (e) => {
        console.log(e.currentTarget.dataset.image);
        viewWorksheet(e.currentTarget.dataset.image, worksheetDiv);
    });
    worksheetDiv.querySelector('.delete-worksheet').addEventListener('click', (e) => {
        console.log(e.currentTarget.dataset.image);
        deleteWorksheet(e.currentTarget.dataset.image, worksheetDiv);
    });

    // Add event listener for the ask question button
    worksheetDiv.querySelector('.ask-question').addEventListener('click', () => {
        const qaSection = worksheetDiv.querySelector('.question-answer-section');
        qaSection.style.display = qaSection.style.display === 'none' ? 'block' : 'none';
    });

    worksheetDiv.querySelector('.submit-question').addEventListener('click', async () => {
        const question = worksheetDiv.querySelector('textarea').value.trim();
        if (question) {
            await askWorksheetQuestion(worksheet.image, question, worksheetDiv);
        }
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
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // On mobile, directly open camera
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera';
        input.onchange = e => handleFileSelect(e, classId, unitName);
        input.click();
    } else {
        // On desktop, show QR code dialog
        showUploadDialog(classId, unitName);
    }
}

function showUploadDialog(classId, unitName) {
    const dialog = document.createElement('div');
    dialog.className = 'upload-dialog';
    
    // Create login parameter with encrypted credentials
    const loginParam = btoa(`${notebookData.Name.first_name}:${notebookData.Name.password}`);
    // Replace spaces with underscores in unit name
    const encodedUnit = unitName.replace(/ /g, '_');
    const uploadUrl = `${window.location.origin}/Notebook?class=${classId}&unit=${encodedUnit}&login=${loginParam}`;
    console.log(uploadUrl);
    dialog.innerHTML = `
        <div class="upload-options">
            <h3>Upload Worksheet</h3>
            <div class="qr-section">
                <div id="qrcode"></div>
                <p>Scan with your phone to upload a photo</p>
            </div>
            <div class="divider">OR</div>
            <div class="pc-upload">
                <button class="upload-pc-btn">Upload from Computer</button>
            </div>
            <button class="close-dialog">×</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Generate QR code
    new QRCode(dialog.querySelector('#qrcode'), uploadUrl);
    
    // Add event listeners
    dialog.querySelector('.upload-pc-btn').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf';
        input.onchange = e => handleFileSelect(e, classId, unitName);
        input.click();
    };
    
    dialog.querySelector('.close-dialog').onclick = () => {
        dialog.remove();
    };
}

function handleFileSelect(e, classId, unitName) {
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

async function addNoteToWorksheet(worksheetId, worksheetDiv) {
    const note = prompt("Enter your note:");
    if (note) {
        worksheet = notebookData.Notebooks.find(worksheet => worksheet.image === worksheetId);
        worksheet.subtopics.push(note);
        startLoading();
        await fetchRequest('/update_data', {
            sheet: 'Notebooks',
            row_name: 'image',
            row_value: worksheetId,
            data: worksheet
        })
        
        const notesList = worksheetDiv.querySelector('.notes-list');
        const li = document.createElement('li');
        li.innerHTML = `
            <i class="fas fa-angle-right"></i>
            <span class="note-text">${note}</span>
        `;
        notesList.appendChild(li);
    }
    
    endLoading();
    
}

async function addQuestionToWorksheet(worksheetId, worksheetDiv) {
    const question = prompt("Enter your practice question:");
    if (question) {
        startLoading();
        await fetchRequest('/update_data', {
            sheet: 'Notebooks',
            row_name: 'image',
            row_value: worksheetId,
            data: {practice_questions: [...worksheet.practice_questions, question]}
        })
        
        if (data.success) {
            const questionsList = worksheetDiv.querySelector('.practice-list');
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-question-circle"></i>
                <span class="question-text">${question}</span>
            `;
            questionsList.appendChild(li);
        } else {
            alert('Failed to add question. Please try again.');
        }
        
        endLoading();
    }
}

async function askWorksheetQuestion(imageReference, question, worksheetDiv) {
    try {
        startLoading();
        const response = await fetch('/ask-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: imageReference,
                question: question,
                fileType: 'image/png'
            })
        });
        
        const data = await response.json();
        
        // Split the answer by steps (assuming steps are separated by numbers followed by dots/asterisks)
        const steps = data.answer.split(/(\d+[\.*]\s*\*{0,2})/g);
        
        const formattedAnswer = steps
            .map(step => step.trim())
            .filter(step => step.length > 0)
            .join('<br><br>');
            
        const answerDisplay = worksheetDiv.querySelector('.answer-display');
        answerDisplay.innerHTML = `
            <div class="answer-box">
                <h4>Answer:</h4>
                <p style="white-space: pre-line;">${formattedAnswer}</p>
            </div>
        `;

        // Process LaTeX in the answer
        if (window.MathJax) {
            MathJax.typesetPromise([answerDisplay]);
        }
    } catch (error) {
        console.error('Error asking question:', error);
        alert('Failed to get answer. Please try again.');
    }
    endLoading();
}

function setupEventListeners() {
    const toggleButton = document.getElementById('notebook-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    toggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar(sidebar, content, toggleButton);
    });

    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe(sidebar, content, toggleButton);
    }, false);

    function handleSwipe(sidebar, content, toggleButton) {
        const swipeThreshold = 50; // Minimum distance for swipe
        const difference = touchEndX - touchStartX;
        
        // Swipe right to open
        if (difference > swipeThreshold && sidebar.classList.contains('collapsed')) {
            toggleSidebar(sidebar, content, toggleButton);
        }
        // Swipe left to close
        else if (difference < -swipeThreshold && !sidebar.classList.contains('collapsed')) {
            toggleSidebar(sidebar, content, toggleButton);
        }
    }
}

function toggleSidebar(sidebar, content, toggleButton) {
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
}

// Add CSS for the upload dialog
const style = document.createElement('style');
style.textContent = `
    .upload-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .upload-options {
        background: #2d2d2d;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        position: relative;
        max-width: 400px;
        width: 90%;
    }
    
    .qr-section {
        margin: 20px 0;
    }
    
    .divider {
        margin: 20px 0;
        color: #666;
    }
    
    .close-dialog {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
    }
    
    .upload-pc-btn {
        background: rgb(228, 76, 101);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
    }
`;
document.head.appendChild(style);