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

function startEvaluation() {
    const classId = document.getElementById('class-select').value;
    const unitName = document.getElementById('unit-select').value;

    if (!classId || !unitName) {
        showNotification('Please select both a class and a unit.', 'warning');
        return;
    }

    document.getElementById('class-selection').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    fetch('/generate-bloom-questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId, unitName, level: levels[currentLevel] }),
    })
    .then(response => response.json())
    .then(data => {
        currentQuestions = data.questions;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('evaluation').style.display = 'block';
        showQuestion();
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to generate questions. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('class-selection').style.display = 'block';
    });
}

function showQuestion() {
    document.getElementById('current-level').textContent = `Level: ${levels[currentLevel]}`;
    document.getElementById('question').textContent = currentQuestions[currentQuestionIndex].question;
    document.getElementById('answer').value = '';
    document.getElementById('feedback').style.display = 'none';
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
            question: currentQuestions[currentQuestionIndex].question,
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
}

function updatePoints(score) {
    points += score;
    document.getElementById('points').textContent = `Points: ${points} / 50`;
    updateProgressBar();

    if (points >= 50) {
        showLevelComplete();
    } else {
        currentQuestionIndex++;
        if (currentQuestionIndex >= currentQuestions.length) {
            startEvaluation(); // Generate new questions for the current level
        } else {
            showQuestion();
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