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
    
    fetchRequest('/data', { data: 'Classes, Notebooks, Name, CMaps, Problems' })
    .then(data => {
        notebookData = data;
        loadClasses();
        
        // Check for upload parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('class');
        const encodedUnit = urlParams.get('unit');
        const shouldUpload = urlParams.get('upload') !== 'false';
        
        if (classId && encodedUnit) {
            currentClassId = classId;
            // Replace underscores with spaces
            currentUnitName = encodedUnit.replace(/_/g, ' ');
            
            // Open the class's units container in sidebar
            const classElement = document.querySelector(`.class-item[data-id="${classId}"]`);
            const unitsContainer = classElement.querySelector('.units-container');
            unitsContainer.style.display = 'block';
            
            // Check if unit exists
            const units = getUniqueUnits(classId);
            if (!units.includes(currentUnitName)) {
                // Create the unit if it doesn't exist
                const unitElement = createUnitElement(classId, currentUnitName);
                unitsContainer.appendChild(unitElement);
            }
            
            loadUnitWorksheets(classId, currentUnitName);
            // Only trigger upload if shouldUpload is true
            if (shouldUpload) {
                uploadWorksheet(classId, currentUnitName);
            }
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
        <div class="unit-header">
            <h2>Worksheets for ${unitName}</h2>
            <div class="unit-actions">
                <button id="refresh-unit" class="refresh-button" title="Refresh Unit">
                    <i class="fas fa-mobile-alt"></i><i class="fas fa-sync"></i>
                </button>
                ${hasConceptMap(classId, unitName) ? 
                    `<button id="map-problems" class="map-button" title="Map Problems to Concepts">
                        <i class="fas fa-project-diagram"></i>
                    </button>` : 
                    ''}
            </div>
        </div>
    `;
    
    // Add event listener for refresh
    document.getElementById('refresh-unit').addEventListener('click', () => {
        // Clear the Notebooks cache
        localStorage.removeItem('Notebooks');
        // Redirect to the same unit with URL parameters
        const encodedUnit = unitName.replace(/ /g, '_');
        window.location.href = `?class=${classId}&unit=${encodedUnit}&upload=false`;
    });
    
    // Add event listener for problem mapping if button exists
    const mapButton = document.getElementById('map-problems');
    if (mapButton) {
        mapButton.addEventListener('click', () => {
            mapProblems(classId, unitName);
        });
    }
    
    worksheets.forEach(worksheet => {
        const worksheetElement = createWorksheetElement(worksheet);
        contentArea.appendChild(worksheetElement);
    });
}

function hasConceptMap(classId, unitName) {
    // Check if CMaps data exists in notebookData
    console.log('in hasConceptMap');
    if (!notebookData.CMaps) {
        console.log('No CMaps data found');
        return false;
    }
    console.log('notebookData.CMaps', notebookData.CMaps, 'classId', classId, 'unitName', unitName);
    maps = notebookData.CMaps.some(map => 
        parseInt(map.classID) == parseInt(classId) && map.unit === unitName
    );
    console.log('maps', maps);
    return maps;
}

async function mapProblems(classId, unitName) {
    try {
        startLoading();
        
        // Get problems and concept map data first
        const data = await fetchRequest('/data', { data: 'Classes, CMaps, Problems' });
        
        // Find the concept map for this class/unit
        const conceptMap = data.CMaps.find(map => 
            parseInt(map.classID) == parseInt(classId) && map.unit === unitName
        );
        
        if (!conceptMap) {
            throw new Error('No concept map found for this unit');
        }
        
        // Filter problems for this class/unit
        const problems = data.Problems.filter(prob => 
            parseInt(prob.classID) == parseInt(classId) && prob.unit === unitName
        );
        
        if (!problems || problems.length === 0) {
            console.log('classId', classId, 'unitName', unitName, 'problems', data.Problems);
            throw new Error('No problems found for this unit');
        }
        
        console.log('sending to backend');
        // Send the filtered data to the backend
        const response = await fetch('/map_problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conceptMap: conceptMap,
                problems: problems
            })
        });
        
        const responseData = await response.json();
        
        if (responseData.message === 'success') {
            alert('Problems successfully mapped to concepts!');
            // clear Problems sheet from local storage
            localStorage.removeItem('Problems');
        } else {
            throw new Error(responseData.error || 'Problem mapping failed');
        }
        
    } catch (error) {
        console.error('Error mapping problems:', error);
        alert(error.message || 'Failed to map problems. Please try again.');
    }
    endLoading();
}

function createWorksheetElement(worksheet) {
    console.log('worksheet', worksheet);
    const worksheetDiv = document.createElement('div');
    worksheetDiv.className = 'worksheet-item';
    
    // Get problems for this worksheet - strict worksheetID matching
    const problems = notebookData.Problems ? notebookData.Problems.filter(p => 
        p.worksheetID && // ensure worksheetID exists
        p.worksheetID === worksheet.id && 
        parseInt(p.classID) === parseInt(worksheet.classID) && 
        p.unit === worksheet.unit
    ).sort((a, b) => a.id.localeCompare(b.id)) : []; // Sort by ID for consistent ordering
    
    // Split problems into initial and remaining
    const initialProblems = problems.slice(0, 5);
    const remainingProblems = problems.slice(5);
    
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
            <div class="add-button-container" data-tooltip="Add Note">
                <button class="add-note"><i class="fas fa-plus"></i></button>
            </div>
        </div>
        <div class="practice-section">
            <h4><i class="fas fa-tasks"></i> Practice Questions:</h4>
            <ol class="practice-list">
                ${initialProblems.map((problem, index) => 
                    `<li>
                        <i class="fas fa-question-circle"></i>
                        <span class="question-text">${problem.problem}</span>
                        <button class="solve-question" data-index="${index}" title="Solve Question">
                            <i class="fas fa-lightbulb"></i>
                        </button>
                        <div class="solution-display" style="display: none;"></div>
                    </li>`
                ).join('')}
            </ol>
            ${remainingProblems.length > 0 ? `
                <div class="show-more-container">
                    <button class="show-more-problems" title="Show More Problems">
                        <i class="fas fa-plus-circle"></i> Show ${remainingProblems.length} More
                    </button>
                    <div class="remaining-problems" style="display: none;">
                        <ol class="practice-list" start="6">
                            ${remainingProblems.map((problem, index) => 
                                `<li>
                                    <i class="fas fa-question-circle"></i>
                                    <span class="question-text">${problem.problem}</span>
                                    <button class="solve-question" data-index="${index + 5}" title="Solve Question">
                                        <i class="fas fa-lightbulb"></i>
                                    </button>
                                    <div class="solution-display" style="display: none;"></div>
                                </li>`
                            ).join('')}
                        </ol>
                    </div>
                </div>
            ` : ''}
            <div class="practice-actions">
                <button class="more-like-this" title="Show More Similar Problems">
                    <i class="fas fa-plus-circle"></i> More Like This
                </button>
                <div class="additional-problems" style="display: none;">
                    <ol class="practice-list more-problems"></ol>
                </div>
            </div>
            <div class="add-button-container" data-tooltip="Add Practice Question">
                <button class="add-question"><i class="fas fa-plus"></i></button>
            </div>
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

    // Process LaTeX in notes and questions
    const processLatex = async () => {
        // Wait for MathJax to be fully loaded
        if (typeof MathJax === 'undefined') {
            await new Promise(resolve => {
                const checkMathJax = setInterval(() => {
                    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
                        clearInterval(checkMathJax);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const elements = document.querySelectorAll('.note-text, .question-text');
            if (elements.length > 0) {
                await MathJax.typesetPromise(Array.from(elements));
            }
        } catch (error) {
            console.error('Error processing LaTeX:', error);
        }
    };
    
    processLatex();

    // Add event listeners for the buttons
    worksheetDiv.querySelector('.add-note').addEventListener('click', () => {
        addNoteToWorksheet(worksheet.image, worksheetDiv);
    });

    worksheetDiv.querySelector('.add-question').addEventListener('click', async () => {
        const question = prompt("Enter your practice question (LaTeX supported using \\( ... \\) for inline and \\[ ... \\] for display):");
        if (question) {
            try {
                startLoading();
                const newProblem = {
                    id: Math.floor(100000 + Math.random() * 900000).toString(), // Generate 6-digit ID
                    classID: worksheet.classID,
                    unit: worksheet.unit,
                    worksheetID: worksheet.id,
                    problem: question,
                    difficulty: "medium", // Default difficulty
                    concepts: [] // Empty concepts array, to be filled by problem mapping
                };
                
                // Add to Problems sheet
                await fetchRequest('/post_data', {
                    sheet: 'Problems',
                    data: newProblem
                });
                
                // Add to local data
                if (!notebookData.Problems) {
                    notebookData.Problems = [];
                }
                notebookData.Problems.push(newProblem);
                
                // Add to UI
                const questionsList = worksheetDiv.querySelector('.practice-list');
                const li = document.createElement('li');
                li.innerHTML = `
                    <i class="fas fa-question-circle"></i>
                    <span class="question-text">${question}</span>
                    <button class="solve-question" data-index="${problems.length}" title="Solve Question">
                        <i class="fas fa-lightbulb"></i>
                    </button>
                    <div class="solution-display" style="display: none;"></div>
                `;
                questionsList.appendChild(li);
                
                // Process LaTeX in the new question
                if (window.MathJax) {
                    MathJax.typesetPromise([li.querySelector('.question-text')]);
                }
                
                // Add event listener for the new solve button
                const solveButton = li.querySelector('.solve-question');
                solveButton.addEventListener('click', async () => {
                    const solutionDisplay = solveButton.parentElement.querySelector('.solution-display');
                    try {
                        startLoading();
                        const response = await fetch('/solve-question', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                file: worksheet.image,
                                question: question,
                                fileType: 'image/png'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        
                        solutionDisplay.innerHTML = `
                            <div class="solution-box">
                                <h4>Solution:</h4>
                                <p style="white-space: pre-line;">${data.solution}</p>
                            </div>
                        `;
                        solutionDisplay.style.display = 'block';
                        
                        if (window.MathJax) {
                            MathJax.typesetPromise([solutionDisplay]);
                        }
                    } catch (error) {
                        console.error('Error solving question:', error);
                        alert('Failed to get solution. Please try again.');
                    }
                    endLoading();
                });
                
            } catch (error) {
                console.error('Error adding question:', error);
                alert('Failed to add question. Please try again.');
            }
            endLoading();
        }
    });

    worksheetDiv.querySelector('.view-worksheet').addEventListener('click', (e) => {
        viewWorksheet(e.currentTarget.dataset.image, worksheetDiv);
    });

    worksheetDiv.querySelector('.delete-worksheet').addEventListener('click', (e) => {
        deleteWorksheet(e.currentTarget.dataset.image, worksheetDiv);
    });

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

    // Add event listeners for solve buttons
    worksheetDiv.querySelectorAll('.solve-question').forEach((button, index) => {
        button.addEventListener('click', async () => {
            const problem = problems[index];
            const solutionDisplay = button.parentElement.querySelector('.solution-display');
            
            try {
                startLoading();
                const response = await fetch('/solve-question', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file: worksheet.image,
                        question: problem.problem,
                        fileType: 'image/png'
                    })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                solutionDisplay.innerHTML = `
                    <div class="solution-box">
                        <h4>Solution:</h4>
                        <p style="white-space: pre-line;">${data.solution}</p>
                    </div>
                `;
                solutionDisplay.style.display = 'block';
                
                if (window.MathJax) {
                    MathJax.typesetPromise([solutionDisplay]);
                }
                
            } catch (error) {
                console.error('Error solving question:', error);
                alert('Failed to get solution. Please try again.');
            }
            endLoading();
        });
    });

    // Add event listener for More Like This button
    worksheetDiv.querySelector('.more-like-this').addEventListener('click', async () => {
        const additionalProblems = worksheetDiv.querySelector('.additional-problems');
        const moreProblemsContainer = worksheetDiv.querySelector('.more-problems');
        
        startLoading();
        try {
            // Get the existing problems for context
            const existingProblems = problems.map(p => p.problem);
            
            // Request AI-generated problems
            const response = await fetch('/generate-problems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: worksheet.image,
                    existingProblems: existingProblems,
                    count: 5,
                    fileType: 'image/png'
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Create new problem objects and add them to the Problems sheet
            const newProblems = data.problems.map(problemData => ({
                id: Math.floor(100000 + Math.random() * 900000).toString(), // Generate 6-digit ID
                classID: worksheet.classID,
                unit: worksheet.unit,
                worksheetID: worksheet.id,
                problem: problemData.problem,
                difficulty: problemData.difficulty,
                concepts: [] // Empty concepts array, to be filled by problem mapping
            }));
            console.log(newProblems);
            // Add all new problems to the Problems sheet
            for (const problem of newProblems) {
                await fetchRequest('/post_data', {
                    sheet: 'Problems',
                    data: problem
                });
            }
            // remove Problems from local storage
            localStorage.removeItem('Problems');
            
            // Add to local data
            if (!notebookData.Problems) {
                notebookData.Problems = [];
            }
            notebookData.Problems.push(...newProblems);
            
            // Display the new problems
            moreProblemsContainer.innerHTML = newProblems.map((problem, index) => `
                <li>
                    <i class="fas fa-question-circle"></i>
                    <span class="question-text">${problem.problem}</span>
                    <button class="solve-question" data-index="${problems.length + index}" title="Solve Question">
                        <i class="fas fa-lightbulb"></i>
                    </button>
                    <div class="solution-display" style="display: none;"></div>
                </li>
            `).join('');
            
            // Add event listeners for new solve buttons
            moreProblemsContainer.querySelectorAll('.solve-question').forEach((button, index) => {
                button.addEventListener('click', async () => {
                    const problem = newProblems[index];
                    const solutionDisplay = button.parentElement.querySelector('.solution-display');
                    
                    startLoading();
                    try {
                        const response = await fetch('/solve-question', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                file: worksheet.image,
                                question: problem.problem,
                                fileType: 'image/png'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        
                        solutionDisplay.innerHTML = `
                            <div class="solution-box">
                                <h4>Solution:</h4>
                                <p style="white-space: pre-line;">${data.solution}</p>
                            </div>
                        `;
                        solutionDisplay.style.display = 'block';
                        
                        if (window.MathJax) {
                            await MathJax.typesetPromise([solutionDisplay]);
                        }
                        
                    } catch (error) {
                        console.error('Error solving question:', error);
                        alert('Failed to get solution. Please try again.');
                    } finally {
                        endLoading();
                    }
                });
            });
            
            // Show the additional problems
            additionalProblems.style.display = 'block';
            
            // Process LaTeX in new problems if needed
            if (window.MathJax) {
                await MathJax.typesetPromise([moreProblemsContainer]);
            }
            
        } catch (error) {
            console.error('Error generating additional problems:', error);
            alert('Failed to generate additional problems. Please try again.');
        } finally {
            endLoading();
        }
    });

    // Add event listener for show more problems button
    const showMoreButton = worksheetDiv.querySelector('.show-more-problems');
    if (showMoreButton) {
        showMoreButton.addEventListener('click', async () => {
            const remainingProblemsDiv = worksheetDiv.querySelector('.remaining-problems');
            if (remainingProblemsDiv.style.display === 'none') {
                remainingProblemsDiv.style.display = 'block';
                showMoreButton.innerHTML = '<i class="fas fa-minus-circle"></i> Show Less';
                // Process LaTeX in newly shown problems
                if (window.MathJax) {
                    await MathJax.typesetPromise([remainingProblemsDiv]);
                }
            } else {
                remainingProblemsDiv.style.display = 'none';
                showMoreButton.innerHTML = `<i class="fas fa-plus-circle"></i> Show ${remainingProblems.length} More`;
            }
        });
    }

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
            // clear Notebooks from local storage
            localStorage.removeItem('Notebooks');
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
    const note = prompt("Enter your note (LaTeX supported using \\( ... \\) for inline and \\[ ... \\] for display):");
    if (note) {
        worksheet = notebookData.Notebooks.find(worksheet => worksheet.image === worksheetId);
        worksheet.subtopics.push(note);
        startLoading();
        await fetchRequest('/update_data', {
            sheet: 'Notebooks',
            row_name: 'image',
            row_value: worksheetId,
            data: worksheet
        });
        
        const notesList = worksheetDiv.querySelector('.notes-list');
        const li = document.createElement('li');
        li.innerHTML = `
            <i class="fas fa-angle-right"></i>
            <span class="note-text">${note}</span>
        `;
        notesList.appendChild(li);
        
        // Process LaTeX in the new note
        if (window.MathJax) {
            MathJax.typesetPromise([li.querySelector('.note-text')]);
        }
    }
    endLoading();
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
    
    .solve-question {
        background: none;
        border: none;
        color: #4CAF50;
        cursor: pointer;
        padding: 5px;
        margin-left: 10px;
        transition: color 0.3s;
    }
    
    .solve-question:hover {
        color: #45a049;
    }
    
    .solution-box {
        background: #2d2d2d;
        border-radius: 5px;
        padding: 15px;
        margin-top: 10px;
        border-left: 3px solid #4CAF50;
    }
    
    .solution-box h4 {
        color: #4CAF50;
        margin: 0 0 10px 0;
    }
    
    .solution-display {
        margin-top: 10px;
        margin-left: 25px;
    }
`;
document.head.appendChild(style);