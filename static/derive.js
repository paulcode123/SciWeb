// Global variables
let classes = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let guidePoints = {};
let lastSavedState = {};
let wrongAttempts = 0;
let conversationActive = false;

document.addEventListener('DOMContentLoaded', function() {
    fetchClasses();
    setupEventListeners();
});

function fetchClasses() {
    fetchRequest('/data', { data: 'Name, Classes, NbS' })
    .then(data => {
        classes = data.Classes;
        notebooks = data.NbS;
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

function setupEventListeners() {
    document.getElementById('class-select').addEventListener('change', handleClassSelect);
    document.getElementById('start-derive').addEventListener('click', startDeriving);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('save-guide').addEventListener('click', saveGuide);
    document.getElementById('interim-save').addEventListener('click', saveGuide);
    document.getElementById('help-button').addEventListener('click', startHelpConversation);
    document.getElementById('close-conversation').addEventListener('click', endConversation);
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('conversation-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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
        body: JSON.stringify({ classId: selectedClassId, notebooks: notebooks, classes: classes }),
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
        }
    })
    .catch(error => console.error('Error:', error));
}

function startDeriving() {
    const classId = document.getElementById('class-select').value;
    const unit = document.getElementById('unit-select').value;
    
    if (!classId || !unit) {
        alert('Please select both a class and unit');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('class-selection').style.display = 'none';

    fetchRequest('/generate-derive-questions', {
        classID: classId, 
        unit: unit, 
        notebooks: notebooks
    })
    .then(data => {
        if (data.error) throw new Error(data.error);
        
        // Store questions from the questions array in the response
        currentQuestions = data.questions;
        currentQuestionIndex = 0;
        
        // Initialize guide points with categories from questions
        guidePoints = currentQuestions.reduce((acc, question) => {
            if (!acc[question.category]) {
                acc[question.category] = [];
            }
            return acc;
        }, {});
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('derive-container').style.display = 'block';
        initializeSections();
        showQuestion(0);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loading').style.display = 'none';
        alert('Failed to generate questions. Please try again.');
    });
}

function initializeSections() {
    const guideContent = document.getElementById('guide-content');
    guideContent.innerHTML = '';
    
    // Create sections for each unique category
    Object.keys(guidePoints).forEach(category => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section';
        sectionDiv.innerHTML = `
            <h4>${category}</h4>
            <ol id="guide-points-${category.replace(/\s+/g, '-')}" class="guide-points"></ol>
        `;
        guideContent.appendChild(sectionDiv);
    });
}

function showQuestion(index) {
    const question = currentQuestions[index];
    
    // Update section and question number
    const currentSectionElem = document.getElementById('current-section');
    const questionNumberElem = document.getElementById('question-number');
    const currentQuestionElem = document.getElementById('current-question');
    
    if (currentSectionElem) currentSectionElem.textContent = question.category;
    if (questionNumberElem) questionNumberElem.textContent = `${index + 1}/${currentQuestions.length}`;
    if (currentQuestionElem) currentQuestionElem.textContent = question.question;
    
    // Reset answer and feedback
    const answerElem = document.getElementById('answer');
    if (answerElem) answerElem.value = '';
    
    const feedbackElem = document.getElementById('feedback');
    if (feedbackElem) feedbackElem.style.display = 'none';
    
    // Update button visibility
    const submitButton = document.getElementById('submit-answer');
    const nextButton = document.getElementById('next-question');
    
    if (submitButton) submitButton.style.display = 'block';
    if (nextButton) nextButton.style.display = 'none';
    
    // Show save button if we have guide points
    const saveButton = document.getElementById('interim-save');
    if (saveButton) {
        saveButton.style.display = Object.keys(guidePoints).some(cat => guidePoints[cat].length > 0) ? 'block' : 'none';
    }
}

function submitAnswer() {
    const answer = document.getElementById('answer').value.trim();
    if (!answer) {
        alert('Please enter an answer');
        return;
    }

    const currentQuestion = currentQuestions[currentQuestionIndex];
    
    fetchRequest('/evaluate-derive-answer', {
        question: currentQuestion.question,
        expected_answer: currentQuestion.expected_answer,
        user_answer: answer
    })
    .then(data => {
        if (data.error) throw new Error(data.error);
        
        showFeedback(data);
        if (data.status === 'correct' && data.newLine) {
            addGuidePoint(currentQuestion.category, data.newLine);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to evaluate answer. Please try again.');
    });
}

function showFeedback(evaluation) {
    const feedbackElement = document.getElementById('feedback');
    if (evaluation.status === 'correct') {
        feedbackElement.innerHTML = `
            <div class="feedback-bubble correct">
                <i class="fas fa-check-circle"></i>
                <div>
                    <strong>Correct!</strong> 
                    <p>This concept has been added to your guide.</p>
                </div>
            </div>`;
        document.getElementById('submit-answer').style.display = 'none';
        document.getElementById('next-question').style.display = 'block';
        document.getElementById('help-button').style.display = 'none';
        wrongAttempts = 0;
    } else {
        wrongAttempts++;
        feedbackElement.innerHTML = `
            <div class="feedback-bubble incorrect">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Let's try again:</strong>
                    <p>${evaluation.simplifiedQuestion}</p>
                </div>
            </div>`;
        document.getElementById('answer').value = '';
        document.getElementById('submit-answer').style.display = 'block';
        document.getElementById('next-question').style.display = 'none';
        
        // Show help button after two wrong attempts
        if (wrongAttempts >= 2) {
            document.getElementById('help-button').style.display = 'block';
        }
    }
    feedbackElement.style.display = 'block';
}

function addGuidePoint(category, point) {
    if (!point) return;
    
    guidePoints[category].push(point);
    const sectionId = `guide-points-${category.replace(/\s+/g, '-')}`;
    const guideList = document.getElementById(sectionId);
    
    const li = document.createElement('li');
    li.textContent = point;
    li.className = 'guide-point new-point';
    li.draggable = true;
    li.setAttribute('data-index', guidePoints[category].length - 1);
    li.setAttribute('data-category', category);
    
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragend', handleDragEnd);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    
    guideList.appendChild(li);
}

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-index'));
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    const items = document.querySelectorAll('.guide-point');
    items.forEach(item => item.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    
    if (this === draggedItem) return;
    
    const items = document.querySelectorAll('.guide-point');
    items.forEach(item => item.classList.remove('drag-over'));
    this.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (this === draggedItem) return;
    
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(this.getAttribute('data-index'));
    
    const category = this.getAttribute('data-category');
    const [movedItem] = guidePoints[category].splice(fromIndex, 1);
    guidePoints[category].splice(toIndex, 0, movedItem);
    
    updateGuideDisplay();
}

function updateGuideDisplay() {
    // Implementation of updateGuideDisplay function
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion(currentQuestionIndex);
    } else {
        showCompletion();
    }
}

function showCompletion() {
    document.getElementById('derive-container').style.display = 'none';
    document.getElementById('completion').style.display = 'block';
    saveGuide(true); // Pass true to indicate final save
}

function saveGuide(isFinal = false) {
    const classId = document.getElementById('class-select').value;
    const unit = document.getElementById('unit-select').value;
    
    // Format guide content according to requirements
    const formattedGuide = {
        classId: classId,
        OSIS: osis,
        unit: unit,
        sections: Object.entries(guidePoints).map(([category, points]) => ({
            title: category,
            points: points.map(point => ({
                text: point,
                correct: [],
                incorrect: []
            }))
        })),
        last_edit: new Date().toISOString(),
        study_score: 20,
        id: Math.floor(100000 + Math.random() * 900000).toString()

    };

    // Only save if there are changes
    const currentState = JSON.stringify(formattedGuide);
    if (currentState === JSON.stringify(lastSavedState)) {
        alert('No changes to save');
        return;
    }

    fetchRequest('/post_data', {
        sheet: 'Guides',
        data: formattedGuide
    })
    .then(data => {
        lastSavedState = formattedGuide;
        alert('Guide saved successfully!');
        
        if (isFinal) {
            window.location.href = '/StudyHub';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to save guide. Please try again.');
    });
}

function startHelpConversation() {
    conversationActive = true;
    const currentQuestion = currentQuestions[currentQuestionIndex];
    
    document.getElementById('conversation-container').style.display = 'block';
    document.getElementById('help-button').style.display = 'none';
    
    // Start the conversation with the AI
    fetchRequest('/derive-conversation', {
        question: currentQuestion.question,
        expected_answer: currentQuestion.expected_answer,
        student_message: "You're starting the conversation",  // Empty for initial prompt
        conversation_history: []
    })
    .then(response => {
        console.log(response.message);
        if (response.message) {
            addMessage({
                role: 'tutor',
                content: response.message.text
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage({
            role: 'tutor',
            content: "I apologize, but I'm having trouble starting our conversation. Please try again."
        });
    });
}

function endConversation() {
    conversationActive = false;
    document.getElementById('conversation-container').style.display = 'none';
    document.getElementById('help-button').style.display = 'block';
}

function addMessage(message) {
    const messagesContainer = document.getElementById('conversation-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    messageDiv.textContent = message.content;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('conversation-input');
    const message = input.value.trim();
    if (!message) return;
    
    // Add student message
    addMessage({
        role: 'student',
        content: message
    });
    
    input.value = '';
    
    // Get AI response
    const currentQuestion = currentQuestions[currentQuestionIndex];
    fetchRequest('/derive-conversation', {
        question: currentQuestion.question,
        expected_answer: currentQuestion.expected_answer,
        student_message: message,
        conversation_history: Array.from(document.querySelectorAll('.message')).map(m => ({
            role: m.classList.contains('tutor') ? 'tutor' : 'student',
            content: m.textContent
        }))
    })
    .then(response => {
        console.log(response.message);
        addMessage({
            role: 'tutor',
            content: response.message.text
        });
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage({
            role: 'tutor',
            content: "I apologize, but I'm having trouble responding. Please try again."
        });
    });
} 