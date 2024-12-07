class QuestionRenderer {
    constructor() {
        this.mathJaxConfig();
    }

    mathJaxConfig() {
        window.MathJax = {
            tex: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']]
            }
        };
    }

    render(question) {
        const container = document.getElementById('question-container');
        container.innerHTML = '';
        
        // Add context if available
        if (question.context) {
            const context = document.createElement('div');
            context.className = 'question-context';
            context.textContent = question.context;
            container.appendChild(context);
        }
        
        // Render based on question type
        switch (question.type) {
            case 'fill_in_blank':
                this.renderFillInBlank(question.content);
                break;
            case 'matching':
                this.renderMatching(question.content);
                break;
            case 'ordering':
                this.renderOrdering(question.content);
                break;
            case 'multiple_choice':
                this.renderMultipleChoice(question.content);
                break;
            case 'equation':
                this.renderEquation(question.content);
                break;
        }
    }

    renderFillInBlank(content) {
        const container = document.getElementById('question-container');
        let text = content.text;
        let currentPos = 0;
        
        content.blank_positions.forEach((pos, index) => {
            // Add text before blank
            container.appendChild(document.createTextNode(text.slice(currentPos, pos)));
            
            // Add input field
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'blank-input';
            input.dataset.blankIndex = index;
            container.appendChild(input);
            
            currentPos = pos + 3; // Skip "___"
        });
        
        // Add remaining text
        container.appendChild(document.createTextNode(text.slice(currentPos)));
    }

    renderMatching(content) {
        const container = document.getElementById('question-container');
        const termsContainer = document.createElement('div');
        const defsContainer = document.createElement('div');
        
        termsContainer.className = 'matching-terms';
        defsContainer.className = 'matching-definitions';
        
        content.terms.forEach((term, index) => {
            const termDiv = document.createElement('div');
            termDiv.className = 'matching-item';
            termDiv.textContent = term;
            termDiv.draggable = true;
            termDiv.dataset.index = index;
            termsContainer.appendChild(termDiv);
        });
        
        content.definitions.forEach((def, index) => {
            const defDiv = document.createElement('div');
            defDiv.className = 'matching-item matching-target';
            defDiv.textContent = def;
            defDiv.dataset.index = index;
            defsContainer.appendChild(defDiv);
        });
        
        container.appendChild(termsContainer);
        container.appendChild(defsContainer);
        
        this.setupDragAndDrop();
    }

    // ... (I'll continue with the remaining render methods and thought process display)
} 

// Global variables
let classes = [];
let currentQuestion = null;
let previousQuestions = [];

// Study flow control functions
async function startStudy(renderer) {
    const classId = document.getElementById('class-select').value;
    const unitName = document.getElementById('unit-select').value;

    if (!classId || !unitName) {
        showNotification('Please select both a class and a unit.', 'warning');
        return;
    }

    document.getElementById('class-selection').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('study-area').style.display = 'none';

    try {
        // Fetch notebook data
        const notebooks = await fetchRequest('/data', {"data": "Classes, Notebooks"});
        const filteredNotebooks = notebooks.Notebooks
            .filter(notebook => notebook.classID === classId && notebook.unit === unitName)
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);

        const topics = filteredNotebooks.map(nb => nb.subtopics);
        const questions = filteredNotebooks.map(nb => nb.practice_questions);
        const notebookData = "topics: " + topics + " questions: " + questions;

        // Generate first question
        const response = await fetch('/generate-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                notebook_content: notebookData,
                previous_qa: previousQuestions
            }),
        });

        if (!response.ok) throw new Error('Failed to generate question');
        
        currentQuestion = await response.json();
        
        // Hide loading, show study area
        document.getElementById('loading').style.display = 'none';
        document.getElementById('study-area').style.display = 'block';
        
        // Render the question
        renderer.render(currentQuestion);
        
    } catch (error) {
        console.error('Error starting study session:', error);
        showNotification('Failed to start study session. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('class-selection').style.display = 'block';
    }
}

async function submitAnswer(renderer) {
    const answer = renderer.getAnswer();
    if (!answer) {
        showNotification('Please provide an answer before submitting.', 'warning');
        return;
    }

    document.getElementById('submit-answer').disabled = true;
    document.getElementById('loading').style.display = 'block';

    try {
        const response = await fetch('/analyze-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: currentQuestion,
                answer: answer,
                previous_qa: previousQuestions
            }),
        });

        if (!response.ok) throw new Error('Failed to analyze answer');
        
        const analysis = await response.json();
        
        // Store question and analysis for context
        previousQuestions.push({
            question: currentQuestion,
            answer: answer,
            analysis: analysis
        });

        // Show thought process if misconceptions detected
        if (analysis.misconceptions && analysis.misconceptions.length > 0) {
            renderer.showThoughtProcess(analysis);
        }

        document.getElementById('next-question').style.display = 'block';
        document.getElementById('loading').style.display = 'none';

    } catch (error) {
        console.error('Error submitting answer:', error);
        showNotification('Failed to analyze answer. Please try again.', 'error');
        document.getElementById('submit-answer').disabled = false;
        document.getElementById('loading').style.display = 'none';
    }
}

async function nextQuestion(renderer) {
    document.getElementById('next-question').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('thought-process').style.display = 'none';

    try {
        const response = await fetch('/generate-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                previous_qa: previousQuestions
            }),
        });

        if (!response.ok) throw new Error('Failed to generate next question');
        
        currentQuestion = await response.json();
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-answer').disabled = false;
        
        // Render the new question
        renderer.render(currentQuestion);
        
    } catch (error) {
        console.error('Error generating next question:', error);
        showNotification('Failed to generate next question. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
    }
}

// Utility functions
function fetchRequest(url, data) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    }).then(response => response.json());
}

function showNotification(message, type) {
    console.log(`${type}: ${message}`);
    // Implement notification system (e.g., toast messages)
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const renderer = new QuestionRenderer();
    fetchClasses();
    setupEventListeners(renderer);
    loadMathJax();
});

function fetchClasses() {
    fetch('/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'Name, Classes' }),
    })
    .then(response => response.json())
    .then(data => {
        classes = data.Classes;
        populateClassSelect();
    })
    .catch(error => console.error('Error:', error));
}

function populateClassSelect() {
    const classSelect = document.getElementById('class-select');
    classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.id;
        option.textContent = classItem.name;
        classSelect.appendChild(option);
    });
}

function handleClassSelect() {
    const unitSelect = document.getElementById('unit-select');
    unitSelect.innerHTML = '<option value="">Select a unit</option>';
    unitSelect.disabled = true;

    const selectedClassId = document.getElementById('class-select').value;

    fetch('/get-units', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId: selectedClassId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.units) {
            data.units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = unit;
                unitSelect.appendChild(option);
            });
            unitSelect.disabled = false;
        } else if (data.error) {
            console.error('Error fetching units:', data.error);
            showNotification('Failed to fetch units. Please try again.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred while fetching units.', 'error');
    });
}

function loadMathJax() {
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
}

function setupEventListeners(renderer) {
    // Class/unit selection
    document.getElementById('class-select').addEventListener('change', handleClassSelect);
    
    // Study flow buttons
    const startButton = document.getElementById('start-study');
    if (startButton) {
        startButton.addEventListener('click', () => startStudy(renderer));
    }
    
    const submitButton = document.getElementById('submit-answer');
    if (submitButton) {
        submitButton.addEventListener('click', () => submitAnswer(renderer));
    }
    
    const nextButton = document.getElementById('next-question');
    if (nextButton) {
        nextButton.addEventListener('click', () => nextQuestion(renderer));
    }

    // Notebook button
    const notebookButton = document.getElementById('open-notebook');
    if (notebookButton) {
        notebookButton.addEventListener('click', () => {
            const classId = document.getElementById('class-select').value;
            const unitName = document.getElementById('unit-select').value;
            if (classId && unitName) {
                window.open(`/notebook/${classId}/${unitName}`, '_blank');
            } else {
                showNotification('Please select a class and unit first.', 'warning');
            }
        });
    }
}