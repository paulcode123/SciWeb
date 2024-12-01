// State management
const state = {
    classes: [],
    currentQuestions: [],
    currentIndex: 0,
    userAnswers: [],
    followupHistory: [],
    evaluationSummaries: [],
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
    loadMathJax();
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
        console.log('Data received:', data);
        // rename data.questions.multiple_choice_questions to data.questions.multiple_choice    
        // and data.questions.short_response_questions to data.questions.short_response
        data.questions.multiple_choice = data.questions.multiple_choice_questions;
        data.questions.short_response = data.questions.short_response_questions;
        state.currentQuestions = data.questions;
        state.userAnswers = new Array(data.questions.multiple_choice.length + 
                                    data.questions.short_response_questions.length).fill(null);
        dom.hide('loading');
        dom.show('evaluation');
        showQuestion(0);
    });
}

// Display question
function showQuestion(index) {
    state.currentIndex = index;
    state.followupHistory = [];
    
    dom.hide('next-question');
    dom.hide('followup-container');
    
    const mcqCount = state.currentQuestions.multiple_choice.length;
    const question = index < mcqCount ? 
        state.currentQuestions.multiple_choice[index] :
        state.currentQuestions.short_response[index - mcqCount];
    
    // Update this line to handle both MCQ and short response questions
    console.log('Question:', question);
    dom.setValue('question', index < mcqCount ? question.question : question.question.toString());
    dom.setValue('progress', `Question ${index + 1} of ${mcqCount + state.currentQuestions.short_response.length}`);
    
    dom.setValue('question-type', index < mcqCount ? 'Multiple Choice' : 'Short Answer');
    renderChoices(index, mcqCount, question);

    // Process LaTeX in question text
    if (window.MathJax) {
        MathJax.typesetPromise([dom.get('question')]);
    }
}

// Handle answers
function handleAnswer(choice, correct) {
    state.userAnswers[state.currentIndex] = choice;
    var foundCorrect = false;
    document.querySelectorAll('.choice').forEach(btn => {
        btn.disabled = true;

        // Compare the original LaTeX syntax for correctness
        const originalContent = btn.innerHTML;
        const isCorrect = originalContent === correct;

        if (isCorrect) {
            foundCorrect = true;
            btn.classList.add('correct');
        } else if (btn.innerHTML === choice) {
            btn.classList.add('incorrect');
        }
    });
  

    initiateFollowup(choice);
}

function handleOpenAnswer() {
    const answer = dom.get('short-answer').value;
    state.userAnswers[state.currentIndex] = answer;
    dom.get('short-answer').disabled = true;
    
    initiateFollowup(answer);
}

function initiateFollowup(answer) {
    dom.show('followup-container');
    dom.show('loading');
    
    const questionContext = getCurrentQuestionContext();
    
    fetch('/generate-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: questionContext,
            answer: answer,
            history: state.followupHistory
        })
    })
    .then(res => res.json())
    .then(data => {
        dom.hide('loading');
        state.followupHistory.push({
            question: data.followup,
            answer: null
        });
        renderFollowup(data.followup);
    });
}

function handleFollowupResponse() {
    const response = dom.get('followup-answer').value;
    
    // Add response to history with question index
    state.followupHistory.push({
        questionIndex: state.currentIndex,
        question: state.currentQuestions[state.currentIndex],
        answer: response,
        isFollowup: true
    });
    
    // Add to conversation display
    const responseElement = document.createElement('div');
    responseElement.className = 'conversation-item user-response';
    responseElement.textContent = response;
    document.querySelector('.conversation-history').appendChild(responseElement);
    
    // Check if this was the third followup
    if (state.followupHistory.filter(h => h.questionIndex === state.currentIndex).length >= 3) {
        showNextOrSubmit();
    } else {
        // Only initiate another followup if we haven't reached 3 yet
        initiateFollowup(response);
    }
}

function generateQuestionEvaluation() {
    fetch('/evaluate-understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questionContext: getCurrentQuestionContext(),
            history: state.followupHistory
        })
    })
    .then(res => res.json())
    .then(data => {
        state.evaluationSummaries.push(data.evaluation);
        showNextOrSubmit();
    });
}

function getCurrentQuestionContext() {
    const mcqCount = state.currentQuestions.multiple_choice.length;
    return state.currentIndex < mcqCount ? 
        state.currentQuestions.multiple_choice[state.currentIndex] :
        state.currentQuestions.short_response[state.currentIndex - mcqCount];
}

function showNextOrSubmit() {
    const totalQuestions = state.currentQuestions.multiple_choice.length + 
                          state.currentQuestions.short_response.length;
    if (state.currentIndex < totalQuestions - 1) {
        showQuestion(++state.currentIndex);
    } else {
        generateFinalEvaluation();
    }
}



function showResult(evaluation) {
    // Debug log
    console.log('Showing result with evaluation:', evaluation);
    
    // Hide question-related elements but keep the evaluation section visible
    ['question-container', 'progress', 'next-question', 'followup-container', 'question-type'].forEach(id => dom.hide(id));
    
    const resultContainer = dom.get('result');
    
    try {
        resultContainer.innerHTML = `
            <h3>Evaluation Results</h3>
            <div class="overall-score">
                Overall Score: ${evaluation.composite_score}/100
            </div>
            
            <div class="overall-understanding">
                <h4>Understanding Assessment</h4>
                <p>${evaluation.overall_understanding}</p>
            </div>
            
            <div class="strengths-weaknesses">
                <div class="strengths">
                    <h4>Strengths</h4>
                    <ul>
                        ${evaluation.strengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="weaknesses">
                    <h4>Areas for Improvement</h4>
                    <ul>
                        ${evaluation.weaknesses.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="recommendations">
                <h4>Learning Recommendations</h4>
                <ul>
                    ${evaluation.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
            
            <div class="detailed-evaluations">
                <h4>Question-by-Question Analysis</h4>
                ${evaluation.question_evaluations.map((qe, i) => `
                    <div class="question-evaluation">
                        <h5>Question ${i + 1}</h5>
                        <p>Understanding Level: ${qe.understanding_level}</p>
                        <div class="key-points">
                            <h6>Key Points</h6>
                            <ul>
                                ${qe.key_points.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>
                        ${qe.misconceptions && qe.misconceptions.length ? `
                            <div class="misconceptions">
                                <h6>Misconceptions</h6>
                                <ul>
                                    ${qe.misconceptions.map(m => `<li>${m}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        dom.show('result');
    } catch (error) {
        console.error('Error rendering result:', error);
        console.error('Evaluation object:', evaluation);
        resultContainer.innerHTML = `
            <h3>Error Displaying Results</h3>
            <p>There was an error displaying your results. Please try again or contact support.</p>
        `;
        dom.show('result');
    }
}
function generateFeedbackHTML(feedback) {
    const feedbackHTML = `
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
    return feedbackHTML;
}

// Add this function to your evaluate.js file
function renderChoices(index, mcqCount, question) {
    const choicesContainer = dom.get('choices-container');
    choicesContainer.innerHTML = ''; // Clear previous content
    
    if (index < mcqCount) {
        // Render multiple choice buttons
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'choice';
            button.innerHTML = option; // Changed from textContent to innerHTML
            button.onclick = () => handleAnswer(option, question.answer);
            choicesContainer.appendChild(button);
        });

        // Process LaTeX in all buttons after they are added to the DOM
        if (window.MathJax) {
            MathJax.typesetPromise([choicesContainer]).catch((err) => console.log(err.message));
        }
    } else {
        // Render short answer textarea
        choicesContainer.innerHTML = `
            <textarea id="short-answer" 
                      rows="4" 
                      placeholder="Type your answer here..."
                      class="short-answer-input"></textarea>
            <button onclick="handleOpenAnswer()" 
                    class="button primary">
                Submit Answer
            </button>
        `;
    }
}
// Add MathJax initialization function
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

// Modify renderFollowup function to process LaTeX
function renderFollowup(followupQuestion) {
    const historyContainer = document.querySelector('.conversation-history');
    
    // Add the new question to the conversation history
    const questionElement = document.createElement('div');
    questionElement.className = 'conversation-item ai-question';
    questionElement.innerHTML = followupQuestion;
    historyContainer.appendChild(questionElement);
    
    // Add progress indicator
    updateFollowupProgress();
    
    // Clear previous answer input
    dom.get('followup-answer').value = '';
    
    // Process LaTeX
    if (window.MathJax) {
        MathJax.typesetPromise([questionElement]);
    }
}

// Add progress indicator for followups
function updateFollowupProgress() {
    const progressElement = document.createElement('div');
    progressElement.className = 'followup-progress';
    progressElement.textContent = `Follow-up ${state.followupHistory.length}/3`;
    document.querySelector('.conversation-history').appendChild(progressElement);
}

// New function for final evaluation
function generateFinalEvaluation() {
    fetch('/evaluate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questions: state.currentQuestions,
            answers: state.userAnswers,
            followupHistory: state.followupHistory
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log('Final evaluation data:', data); // Debug log
        showResult(data.evaluation);
    })
    .catch(error => {
        console.error('Error in final evaluation:', error); // Error logging
    });
}

