// State management
const state = {
    classes: [],
    currentQuestions: [],
    currentIndex: 0,
    userAnswers: [],
    scoringPrompts: {
        accuracy: "Score based on factual accuracy and correctness. Focus on correct information and concepts.",
        specificity: "Score based on detail level and examples. Focus on explanation quality and support.",
        depth: "Score based on conceptual understanding and connections. Focus on deep comprehension."
    }
};

// DOM manipulation helpers
const dom = {
    show: (id) => document.getElementById(id).style.display = 'block',
    hide: (id) => document.getElementById(id).style.display = 'none',
    get: (id) => document.getElementById(id),
    setValue: (id, value) => document.getElementById(id).textContent = value
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'Name, Classes' })
    })
    .then(res => res.json())
    .then(data => {
        state.classes = data.Classes;
        const select = dom.get('class-select');
        state.classes.forEach(c => {
            select.appendChild(new Option(c.name, c.id));
        });
    });

    // Event listeners
    dom.get('class-select').onchange = loadUnits;
    dom.get('start-evaluation').onclick = startEvaluation;
    dom.get('next-question').onclick = () => showQuestion(++state.currentIndex);
});

// Load units for selected class
function loadUnits() {
    const unitSelect = dom.get('unit-select');
    unitSelect.innerHTML = '<option value="">Select a unit</option>';
    unitSelect.disabled = true;

    fetch('/get-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: dom.get('class-select').value })
    })
    .then(res => res.json())
    .then(data => {
        if (data.units) {
            data.units.forEach(unit => unitSelect.appendChild(new Option(unit, unit)));
            unitSelect.disabled = false;
        }
    });
}

// Start evaluation
function startEvaluation() {
    const settings = {
        classId: dom.get('class-select').value,
        unitName: dom.get('unit-select').value,
        mcqCount: parseInt(dom.get('mcq-count').value),
        writtenCount: parseInt(dom.get('written-count').value)
    };

    if (!settings.classId || !settings.unitName) {
        alert('Please select both a class and a unit.');
        return;
    }

    ['class-selection', 'settings-panel'].forEach(id => dom.hide(id));
    dom.show('loading');

    fetch('/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(data => {
        state.currentQuestions = data.questions;
        state.userAnswers = new Array(data.questions.multiple_choice.length + 
                                    data.questions.short_response.length).fill(null);
        dom.hide('loading');
        dom.show('evaluation');
        showQuestion(0);
    });
}

// Display question
function showQuestion(index) {
    console.log("showing question", index);
    // hide next button
    dom.hide('next-question');
    const mcqCount = state.currentQuestions.multiple_choice.length;
    const question = index < mcqCount ? 
        state.currentQuestions.multiple_choice[index] :
        state.currentQuestions.short_response[index - mcqCount];
    
    dom.setValue('question', index < mcqCount ? question.question : question);
    // console.log(document.getElementById('current-question'));
    // dom.setValue('current-question', index + 1);
    dom.setValue('progress', `Question ${index + 1} of ${mcqCount + state.currentQuestions.short_response.length}`);
    
    const container = dom.get('choices-container');
    container.innerHTML = '';
    
    if (index < mcqCount) {
        question.answers.forEach(choice => {
            const btn = document.createElement('button');
            btn.textContent = choice;
            btn.className = 'choice';
            btn.onclick = () => handleAnswer(choice, question.correct_answer);
            container.appendChild(btn);
        });
    } else {
        container.appendChild(Object.assign(document.createElement('textarea'), {
            id: 'short-answer',
            rows: 4,
            cols: 50
        }));
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit';
        submitBtn.className = 'button primary';
        submitBtn.onclick = handleOpenAnswer;
        container.appendChild(submitBtn);
    }
}

// Handle answers
function handleAnswer(choice, correct) {
    state.userAnswers[state.currentIndex] = choice;
    document.querySelectorAll('.choice').forEach(btn => {
        btn.disabled = true;
        if (btn.textContent === correct) btn.classList.add('correct');
        else if (btn.textContent === choice) btn.classList.add('incorrect');
    });
    showNextOrSubmit();
}

function handleOpenAnswer() {
    state.userAnswers[state.currentIndex] = dom.get('short-answer').value;
    dom.get('short-answer').disabled = true;
    showNextOrSubmit();
}

function showNextOrSubmit() {
    const totalQuestions = state.currentQuestions.multiple_choice.length + 
                          state.currentQuestions.short_response.length;
    if (state.currentIndex < totalQuestions - 1) {
        dom.show('next-question');
    } else {
        submitAnswers();
    }
}

// Submit and show results
function submitAnswers() {
    const scoringType = document.querySelector('input[name="scoring-type"]:checked').value;
    
    fetch('/score-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questions: state.currentQuestions,
            answers: state.userAnswers,
            scoringPrompt: state.scoringPrompts[scoringType]
        })
    })
    .then(res => res.json())
    .then(showResult);
}

function showResult(data) {
    ['question-container', 'progress', 'next-question'].forEach(id => dom.hide(id));
    dom.show('result');
    
    dom.get('result').innerHTML = `
        <h3>Evaluation Results</h3>
        <div class="score-summary">
            <p>Multiple Choice: ${data.MCQscore}/40</p>
            <p>Short Answer: ${data.SAQ_feedback.feedback.reduce((t, i) => t + i.score, 0)}/60</p>
            <p class="total-score">Predicted Score: ${data.MCQscore + data.SAQ_feedback.test_score}/100</p>
        </div>
        ${generateFeedbackHTML(data.SAQ_feedback)}
    `;
}

function generateFeedbackHTML(feedback) {
    return `
        <div class="feedback-section">
            <h4>Detailed Feedback</h4>
            <ul>${feedback.feedback.map((f, i) => 
                `<li><strong>Q${i + 1}:</strong> Score: ${f.score}/20<br>${f.feedback}</li>`
            ).join('')}</ul>
        </div>
        <div class="analysis">
            <div><h4>Strengths</h4><ul>${feedback.strengths.map(s => `<li>${s}</li>`).join('')}</ul></div>
            <div><h4>Areas for Improvement</h4><ul>${feedback.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul></div>
        </div>
    `;
}