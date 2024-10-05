// Global variables
let classes = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentLevel = 0;
let points = 0;
const levels = ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];

document.addEventListener('DOMContentLoaded', function() {
    fetchClasses();
    setupEventListeners();
});

function fetchClasses() {
    fetch('/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'FILTERED Classes' }),
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

function setupEventListeners() {
    document.getElementById('class-select').addEventListener('change', handleClassSelect);
    document.getElementById('start-evaluation').addEventListener('click', startEvaluation);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    document.getElementById('next-level').addEventListener('click', nextLevel);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
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

let previousAnswers = [];

async function startEvaluation() {
    const classId = document.getElementById('class-select').value;
    const unitName = document.getElementById('unit-select').value;

    if (!classId || !unitName) {
        showNotification('Please select both a class and a unit.', 'warning');
        return;
    }

    document.getElementById('class-selection').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    const notebooks = await fetchRequest('/data', {"data": "Notebooks"})
    // filter notebooks by classId and unitName
    const filteredNotebooks = notebooks.Notebooks.filter(notebook => notebook.classID === classId && notebook.unit === unitName);
    let topics = []
    let questions = []
    filteredNotebooks.forEach(notebook => {
        topics.push(notebook.subtopics)
        questions.push(notebook.practice_questions)
    })
    notebook_data = "topics: " + topics + " questions: " + questions

    fetch('/generate-bloom-questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            level: levels[currentLevel],
            previousAnswers: previousAnswers,
            notebookContent: notebook_data

        }),
    })
    .then(response => response.json())
    .then(data => {
        currentQuestions = data.questions;
        currentQuestionIndex = 0;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('evaluation').style.display = 'block';
        showQuestion(currentQuestionIndex);
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to generate questions. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('class-selection').style.display = 'block';
    });
}

function showQuestion(index) {
    console.log("index", index)
    document.getElementById('current-level').textContent = `Level: ${levels[currentLevel]}`;
    const currentQuestion = currentQuestions.questions[index];
    document.getElementById('question').textContent = currentQuestion.question;
    document.getElementById('question-difficulty').textContent = `Estimated Difficulty: ${currentQuestion.personalDifficulty}`;
    document.getElementById('answer').value = '';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('submit-answer').style.display = 'block';
    document.getElementById('next-question').style.display = 'none';
    updateProgressBar();
}

function submitAnswer() {
    const answer = document.getElementById('answer').value;
    if (!answer.trim()) {
        showNotification('Please enter an answer before submitting.', 'warning');
        return;
    }

    document.getElementById('submit-answer').disabled = true;
    document.getElementById('loading').style.display = 'block';

    fetch('/evaluate-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: currentQuestions.questions[currentQuestionIndex].question,
            answer: answer,
            level: levels[currentLevel]
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log("data", data)
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-answer').disabled = false;
        showFeedback(data.score, data.feedback);
        updatePoints(data.score);

        previousAnswers.push({
            question: currentQuestions.questions[currentQuestionIndex].question,
            answer: answer,
            score: data.score
        });

        document.getElementById('submit-answer').style.display = 'none';
        document.getElementById('next-question').style.display = 'block';
    
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to evaluate answer. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-answer').disabled = false;
    });
}

function showFeedback(score, feedback) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.textContent = `Score: ${score}/10. ${feedback}`;
    feedbackElement.className = score >= 5 ? 'feedback-positive' : 'feedback-negative';
    feedbackElement.style.display = 'block';
    document.getElementById('next-question').style.display = 'block';
}

function updatePoints(score) {
    points += score;
    document.getElementById('points').textContent = `Points: ${points}`;
    updateProgressBar();

    if (currentQuestionIndex >= currentQuestions.length - 1) {
        if (points >= 40) {  // Changed from 50 to 40 since we now have 5 questions
            showLevelComplete();
        } else {
            console.log("C3")
            startEvaluation(); // Generate new questions for the current level
        }
    }
}

function updateProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    const percentage = (points / 50) * 100;
    progressFill.style.width = `${percentage}%`;
}

function showLevelComplete() {
    document.getElementById('evaluation').style.display = 'none';
    document.getElementById('level-complete').style.display = 'block';
    document.getElementById('level-complete-message').textContent = `You've completed the ${levels[currentLevel]} level!`;
}

function nextLevel() {
    currentLevel++;
    points = 0;
    currentQuestionIndex = 0;

    if (currentLevel < levels.length) {
        document.getElementById('level-complete').style.display = 'none';
        console.log("C2")
        startEvaluation();
    } else {
        showAllLevelsComplete();
    }
}

function showAllLevelsComplete() {
    document.getElementById('level-complete').style.display = 'none';
    document.getElementById('all-levels-complete').style.display = 'block';
}

function showNotification(message, type) {
    // Implement this function to show notifications to the user
    console.log(`${type}: ${message}`);
    // You can use a library like toastr or create a custom notification system
}

// New function to handle moving to the next question
function nextQuestion() {
    currentQuestionIndex++;
    console.log("currentQuestionIndex", currentQuestionIndex)
    if (currentQuestionIndex < currentQuestions.questions.length) {
        showQuestion(currentQuestionIndex);
    } else {
        console.log("C1")
        startEvaluation(); // Generate new questions when all current questions are answered
    }
}