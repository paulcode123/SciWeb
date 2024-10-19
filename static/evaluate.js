// Global variables to store class data, questions, and user progress
let classes = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

// Event listener for when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchClasses();
    setupEventListeners();
});

// Function to fetch available classes from the server
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

// Function to populate the class selection dropdown
function populateClassSelect() {
    const classSelect = document.getElementById('class-select');
    classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.id;
        option.textContent = classItem.name;
        classSelect.appendChild(option);
    });
}

// Function to set up event listeners for various UI elements
function setupEventListeners() {
    document.getElementById('class-select').addEventListener('change', handleClassSelect);
    document.getElementById('start-evaluation').addEventListener('click', startEvaluation);
    document.getElementById('next-question').addEventListener('click', showNextQuestion);
    document.querySelectorAll('.choice').forEach(button => {
        button.addEventListener('click', handleAnswer);
    });
}

// Function to handle class selection and fetch corresponding units
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
            data.units.forEach((unit, index) => {
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

// Modify the startEvaluation function to handle the new format
function startEvaluation() {
    const classId = document.getElementById('class-select').value;
    const unitName = document.getElementById('unit-select').value;

    if (!classId || !unitName) {
        showNotification('Please select both a class and a unit.', 'warning');
        return;
    }

    document.getElementById('class-selection').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    fetch('/generate-questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId, unitName }),
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        currentQuestions = data.questions;
        userAnswers = new Array(currentQuestions.multiple_choice.length + currentQuestions.short_response.length).fill(null);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('evaluation').style.display = 'block';
        showQuestion(0);
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to generate questions. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('class-selection').style.display = 'block';
    });
}

// Function to display a question and its answer choices
function showQuestion(index) {
    let question;
    if (index < 2) {
        // Multiple choice question
        question = currentQuestions.multiple_choice[index];
        document.getElementById('question').textContent = question.question;
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';

        question.answers.forEach((choice, i) => {
            const button = document.createElement('button');
            button.textContent = choice;
            button.classList.add('choice');
            button.addEventListener('click', () => handleAnswer(choice));
            choicesContainer.appendChild(button);
        });
    } else {
        // Short response question
        question = currentQuestions.short_response[index - 2];
        document.getElementById('question').textContent = question;
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';

        const textarea = document.createElement('textarea');
        textarea.id = 'short-answer';
        textarea.rows = 4;
        textarea.cols = 50;
        choicesContainer.appendChild(textarea);

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Answer';
        submitButton.classList.add('submit-answer-button'); // Add this line
        submitButton.addEventListener('click', handleOpenAnswer);
        choicesContainer.appendChild(submitButton);
    }

    document.getElementById('current-question').textContent = index + 1;
    document.getElementById('next-question').style.display = 'none';
}

// Function to handle user's answer for multiple-choice questions
function handleAnswer(selectedAnswer) {
    const currentQuestion = currentQuestions.multiple_choice[currentQuestionIndex];
    userAnswers[currentQuestionIndex] = selectedAnswer;

    document.querySelectorAll('.choice').forEach(button => {
        button.disabled = true;
        if (button.textContent === currentQuestion.correct_answer) {
            button.style.backgroundColor = '#4CAF50';
        } else if (button.textContent === selectedAnswer) {
            button.style.backgroundColor = '#FF6347';
        }
    });

    showNextButton();
}
    

// Function to handle user's answer for open-ended questions
function handleOpenAnswer() {
    const answer = document.getElementById('short-answer').value;
    userAnswers[currentQuestionIndex] = answer;
    document.getElementById('short-answer').disabled = true;
    showNextButton();
}

// Function to show the 'Next' button or submit answers if it's the last question
function showNextButton() {
    if (currentQuestionIndex < 4) {
        document.getElementById('next-question').style.display = 'block';
    } else {
        submitAnswers();
    }
}

// Function to show the next question
function showNextQuestion() {
    currentQuestionIndex++;
    showQuestion(currentQuestionIndex);
}

// Function to submit all answers for scoring
function submitAnswers() {
    console.log(userAnswers);
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loading-text').textContent = 'Evaluating responses...';
    document.getElementById('evaluation').style.display = 'none';

    fetch('/score-answers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            questions: currentQuestions,
            answers: userAnswers
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        document.getElementById('loading').style.display = 'none';
        showResult(data);
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to score answers. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('evaluation').style.display = 'block';
    });
}

function showResult(data) {
    console.log(data);
    document.getElementById('evaluation').style.display = 'block';
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('progress').style.display = 'none';
    document.getElementById('next-question').style.display = 'none';
    document.getElementById('result').style.display = 'block';

    const mcqScore = data.MCQscore;
    const saqFeedback = data.SAQ_feedback;

    let resultHTML = `
        <h3>Evaluation Results</h3>
        <div class="score-summary">
            <p>Multiple Choice Questions Score: ${mcqScore} / 40</p>
            <p>Short Answer Questions Score: ${saqFeedback.feedback.reduce((total, item) => total + item.score, 0)} / 60</p>
            <p class="total-score">Predicted Test Score: ${mcqScore + saqFeedback.test_score} / 100</p>
        </div>
        <div class="feedback-section">
            <h4>Detailed Feedback</h4>
            <ul>
                ${saqFeedback.feedback.map((feedback, index) => `
                    <li>
                        <strong>Question ${index + 1}:</strong>
                        <p>Score: ${feedback.score} / 20</p>
                        <p>${feedback.feedback}</p>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="strengths-weaknesses">
            <div class="strengths">
                <h4>Strengths</h4>
                <ul>
                    ${saqFeedback.strengths.map(strength => `<li>${strength}</li>`).join('')}
                </ul>
            </div>
            <div class="weaknesses">
                <h4>Areas for Improvement</h4>
                <ul>
                    ${saqFeedback.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    document.getElementById('result').innerHTML = resultHTML;
}
