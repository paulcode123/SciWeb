// Testing mode flag
const testing = false;

// Global variables
let classes = [];
let synth = {};
let nbS = [];
let guide = {};
let guides = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentLevel = 0;
let points = 0;
var points_needed = 50;
const levels = ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];

// Add default prompts as constants at the top of the file
const DEFAULT_PROMPTS = {
    questionGeneration: "Generate 5 specific short-response questions about the topics/example questions. The questions should be at the {level} level of Bloom's Taxonomy. After asking about all of the material, use the user's previous answers to generate questions like the ones they got wrong. Assign a personal difficulty to each question based on how well the user did on similar questions in the past, where 1 is easy and 10 is hard.",
    scoring: "You are an AI assistant tasked with evaluating a student's answer to a {level}-level question in Bloom's Taxonomy, and giving them feedback on their answer. Score the answer on a scale of 0 to 10, where 10 is a perfect answer. Provide the score and tell them the right answer."
};

// Add to global variables
let customPrompts = {
    questionGeneration: DEFAULT_PROMPTS.questionGeneration,
    scoring: DEFAULT_PROMPTS.scoring
};

// Add new constants for prompt libraries
const QUESTION_PROMPT_LIBRARY = [
    {
        focus: "Detailed Analysis",
        icon: "fas fa-microscope",
        prompt: "Generate 5 detailed questions that require deep analysis of the topics. Questions should be at the {level} level of Bloom's Taxonomy, focusing on specific concepts and their relationships. Include follow-up sub-questions when appropriate."
    },
    {
        focus: "Real-World Application",
        icon: "fas fa-globe",
        prompt: "Create 5 scenario-based questions at the {level} level that connect the topics to real-world situations. Focus on practical applications and problem-solving in realistic contexts."
    },
    {
        focus: "Concept Connections",
        icon: "fas fa-project-diagram",
        prompt: "Generate 5 questions at the {level} level that emphasize connections between different concepts within the topic. Focus on understanding relationships and interdependencies."
    },
    {
        focus: "Critical Thinking",
        icon: "fas fa-brain",
        prompt: "Create 5 questions at the {level} level that challenge students to think critically and defend their positions. Include prompts for justification and evidence-based reasoning."
    },
    {
        focus: "Visual Analysis",
        icon: "fas fa-chart-line",
        prompt: "Generate 5 questions at the {level} level that involve analyzing diagrams, graphs, or visual representations of the concepts. Focus on interpretation and visual literacy."
    },
    {
        focus: "Historical Context",
        icon: "fas fa-history",
        prompt: "Create 5 questions at the {level} level that explore the historical development and evolution of the concepts. Include questions about key discoveries and breakthroughs."
    },
    {
        focus: "Problem-Solving",
        icon: "fas fa-puzzle-piece",
        prompt: "Generate 5 problem-solving questions at the {level} level that require step-by-step solutions. Focus on methodology and process explanation."
    },
    {
        focus: "Comparative Analysis",
        icon: "fas fa-balance-scale",
        prompt: "Create 5 questions at the {level} level that require comparing and contrasting different aspects of the topics. Focus on similarities, differences, and relationships."
    },
    {
        focus: "Future Implications",
        icon: "fas fa-rocket",
        prompt: "Generate 5 questions at the {level} level about potential future developments and implications of the concepts. Focus on prediction and innovation."
    },
    {
        focus: "Ethical Considerations",
        icon: "fas fa-gavel",
        prompt: "Create 5 questions at the {level} level that explore ethical implications and societal impacts of the topics. Focus on decision-making and responsibility."
    }
];

const SCORING_PROMPT_LIBRARY = [
    {
        focus: "Comprehensive Feedback",
        icon: "fas fa-clipboard-check",
        prompt: "Evaluate the student's {level}-level response with detailed feedback. Score from 0-10, explain the scoring rationale, provide the correct answer, and suggest specific improvements."
    },
    {
        focus: "Concept Mastery",
        icon: "fas fa-star",
        prompt: "Score the {level}-level answer from 0-10 based on concept mastery. Identify key concepts correctly used and those missing. Provide examples of how to better demonstrate understanding."
    },
    {
        focus: "Critical Analysis",
        icon: "fas fa-search",
        prompt: "Evaluate the {level}-level response focusing on critical thinking skills. Score 0-10, assess the depth of analysis, and suggest ways to strengthen analytical reasoning."
    },
    {
        focus: "Communication Clarity",
        icon: "fas fa-comment-alt",
        prompt: "Score the {level}-level answer from 0-10 emphasizing communication clarity. Assess how well ideas are expressed and organized, suggesting improvements in presentation."
    },
    {
        focus: "Evidence-Based Evaluation",
        icon: "fas fa-balance-scale-right",
        prompt: "Rate the {level}-level response from 0-10 based on use of evidence and support. Evaluate the quality of examples and reasoning provided."
    },
    {
        focus: "Problem-Solving Process",
        icon: "fas fa-tools",
        prompt: "Score the {level}-level answer from 0-10 focusing on problem-solving methodology. Assess approach, steps taken, and solution efficiency."
    },
    {
        focus: "Creative Application",
        icon: "fas fa-lightbulb",
        prompt: "Evaluate the {level}-level response from 0-10 based on creative application of concepts. Assess innovative thinking and unique approaches."
    },
    {
        focus: "Technical Accuracy",
        icon: "fas fa-check-double",
        prompt: "Score the {level}-level answer from 0-10 emphasizing technical accuracy. Evaluate precise use of terminology and concepts."
    },
    {
        focus: "Practical Application",
        icon: "fas fa-hammer",
        prompt: "Rate the {level}-level response from 0-10 based on practical application ability. Assess how well theoretical knowledge is applied to real situations."
    },
    {
        focus: "Holistic Understanding",
        icon: "fas fa-circle-nodes",
        prompt: "Score the {level}-level answer from 0-10 focusing on holistic understanding. Evaluate how well concepts are integrated and interconnected."
    }
];

document.addEventListener('DOMContentLoaded', function() {
    fetchClasses();
    setupEventListeners();
    initializePrompts();
    loadMathJax();
    
    // Start with settings expanded
    document.getElementById('settings-content').classList.remove('collapsed');

    // Show only evaluation section if in testing mode
    if (testing) {
        // Hide other sections first
        document.getElementById('class-selection').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('level-complete').style.display = 'none';
        document.getElementById('all-levels-complete').style.display = 'none';
        
        // Show only evaluation with proper layout
        document.getElementById('evaluation').style.display = 'grid';  // Changed from 'block' to 'grid'
        
        // Add some sample content
        document.getElementById('question').textContent = 'Sample question for testing purposes?';
        document.getElementById('question-difficulty').textContent = 'Estimated Difficulty: 5';
        document.getElementById('feedback').style.display = 'none';  // Hide feedback initially
        document.getElementById('points').textContent = 'Points: 25 / 50';
        document.getElementById('progress-fill').style.width = '50%';
        
        // Add sample study guide content
        document.getElementById('study-guide-content').innerHTML = `
            <ol class="study-guide-list">
                <li>The cell membrane regulates what enters and exits the cell.</li>
                
                <div class="change-suggestion">
                    <div class="change-text">
                        <span class="deletion">The mitochondria produces energy through breaking down glucose</span>
                        <span class="addition">The mitochondria generate ATP through cellular respiration</span>
                    </div>
                    <div class="change-actions">
                        <button class="accept-change" title="Accept change">✓</button>
                        <button class="reject-change" title="Reject change">✗</button>
                    </div>
                </div>

                <li>DNA contains the genetic instructions for all living things.</li>
                
                <div class="change-suggestion">
                    <div class="change-text">
                        Add these key points about DNA structure:
                        <span class="addition">
                            <ul>
                                <li>Double helix structure discovered by Watson and Crick</li>
                                <li>Made up of four nucleotide bases: A, T, C, G</li>
                                <li>Base pairs are held together by hydrogen bonds</li>
                            </ul>
                        </span>
                    </div>
                    <div class="change-actions">
                        <button class="accept-change" title="Accept change">✓</button>
                        <button class="reject-change" title="Reject change">✗</button>
                    </div>
                </div>
            </ol>
        `;
        
        setupChangeSuggestions();
    }
});

function fetchClasses() {
    fetchRequest('/data', { data: 'Name, Classes, NbS, Guides' })
    .then(data => {
        classes = data.Classes;
        nbS = data.NbS;
        guides = data.Guides;
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
    setupNotebookButton();
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
        body: JSON.stringify({ classId: selectedClassId, notebooks: nbS, classes: classes }),
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

    // Close settings panel
    const settingsContent = document.getElementById('settings-content');
    const settingsIcon = document.querySelector('.settings-toggle-icon');
    settingsContent.classList.add('collapsed');
    settingsIcon.classList.add('collapsed');

    document.getElementById('class-selection').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    // Fetch study guide first
    await fetchStudyGuide(classId, unitName);

    
    // filter notebooks by classId and unitName
    var filteredNotebooks = nbS.filter(notebook => 
        parseInt(notebook.classID) == parseInt(classId) && notebook.unit === unitName
    );
    console.log("filteredNotebooks", filteredNotebooks, nbS, classId, unitName)
    

    // Get custom settings
    const startingLevel = parseInt(document.getElementById('starting-level').value);
    // if currentLevel is undefined or less than startingLevel, set currentLevel to startingLevel
    if (currentLevel == undefined || currentLevel < startingLevel) {
        currentLevel = startingLevel;
    }
    const customPointsNeeded = parseInt(document.getElementById('points-needed').value);
    points_needed = customPointsNeeded;
    document.getElementById('points').textContent = `Points: 0 / ${points_needed}`;

    customPrompts.questionGeneration = document.getElementById('question-prompt').value.trim() || DEFAULT_PROMPTS.questionGeneration;
    customPrompts.scoring = document.getElementById('scoring-prompt').value.trim() || DEFAULT_PROMPTS.scoring;

    fetch('/generate-bloom-questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            level: levels[currentLevel],
            previousAnswers: previousAnswers,
            notebookContent: filteredNotebooks,
            customPrompt: customPrompts.questionGeneration
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
    console.log("index", index, "currentLevel", currentLevel, levels[currentLevel]);
    document.getElementById('current-level').textContent = `Level: ${levels[currentLevel]}`;
    const currentQuestion = currentQuestions.questions[index];
    
    // Format the question with LaTeX
    const formattedQuestion = formatWithLaTeX(currentQuestion.question);
    const questionElement = document.getElementById('question');
    questionElement.innerHTML = `<div class="math-content">${formattedQuestion}</div>`;
    
    document.getElementById('question-difficulty').textContent = 
        `Estimated Difficulty: ${currentQuestion.personalDifficulty}`;
    document.getElementById('answer').value = '';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('submit-answer').style.display = 'block';
    document.getElementById('next-question').style.display = 'none';
    
    // Ensure the grid layout is maintained
    document.getElementById('evaluation').style.display = 'grid';
    document.querySelector('.question-section').style.gridColumn = 'span 1';
    
    updateProgressBar();
    // Re-enable the next button when showing a new question
    const nextButton = document.getElementById('next-question');
    nextButton.disabled = false;

    // Render LaTeX
    if (window.MathJax) {
        MathJax.typesetPromise([questionElement]).catch(err => {
            console.error('MathJax error:', err);
        });
    }
}

function formatWithLaTeX(text) {
    if (!text) return '';
    
    // First, escape any existing LaTeX delimiters
    text = text.replace(/\\\(/g, '\\\\(').replace(/\\\)/g, '\\\\)');
    text = text.replace(/\\\[/g, '\\\\[').replace(/\\\]/g, '\\\\]');
    
    // Replace inline math delimiters
    text = text.replace(/\$([^\$]+)\$/g, (match, p1) => {
        // Escape special characters in the math content
        const escaped = p1.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
        return `\\(${escaped}\\)`;
    });
    
    // Replace display math delimiters
    text = text.replace(/\$\$([^\$]+)\$\$/g, (match, p1) => {
        const escaped = p1.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
        return `\\[${escaped}\\]`;
    });
    
    return text;
}

async function submitAnswer() {
    const answer = document.getElementById('answer').value;
    if (!answer.trim()) {
        showNotification('Please enter an answer before submitting.', 'warning');
        return;
    }

    document.getElementById('submit-answer').disabled = true;
    document.getElementById('loading').style.display = 'block';
    
    try {
        const processedGuide = preprocessGuide(guide);
        const response = await fetchRequest('/evaluate-answer', {
            question: currentQuestions.questions[currentQuestionIndex].question,
            answer: answer,
            level: levels[currentLevel],
            guide: processedGuide
        });
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-answer').disabled = false;
        
        // Ensure the grid layout is maintained
        document.getElementById('evaluation').style.display = 'grid';
        document.querySelector('.question-section').style.gridColumn = 'span 1';
        
        // Show feedback with all evaluation data
        console.log("response", response)
        const score = showFeedback(0, response.feedback, response);
        updatePoints(score);
        
        previousAnswers.push({
            question: currentQuestions.questions[currentQuestionIndex].question,
            answer: answer,
            score: score
        });

        document.getElementById('submit-answer').style.display = 'none';
        document.getElementById('next-question').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-answer').disabled = false;
    }
}

function updateStudyGuideWithFeedback(evalData) {
    if (!evalData.correct && evalData.error_step !== "n/a" && evalData.new_step !== "n/a") {
        const studyGuideContent = document.getElementById('study-guide-content');
        const allSteps = studyGuideContent.querySelectorAll('li');
        
        // Find the step that matches the error_step identifier (e.g., "1A" or "2.1")
        let targetStep = null;
        allSteps.forEach(step => {
            const stepText = step.textContent.trim();
            if (stepText.startsWith(evalData.error_step)) {
                targetStep = step;
            }
        });
        
        if (targetStep) {
            // Create change suggestion element with animation
            const changeSuggestion = document.createElement('div');
            changeSuggestion.className = 'change-suggestion';
            changeSuggestion.style.opacity = '0';
            changeSuggestion.style.transform = 'translateY(20px)';
            
            // Create the change text with subpoints if they exist
            let subpointsHtml = '';
            if (evalData.subpoints && evalData.subpoints.length > 0) {
                subpointsHtml = `
                    <ul class="subpoints">
                        ${evalData.subpoints.map(point => `
                            <li>
                                <i class="fas fa-lightbulb" style="margin-right: 8px;"></i>
                                ${point}
                            </li>
                        `).join('')}
                    </ul>
                `;
            }
            
            // Add mistake information if available
            let mistakeHtml = '';
            if (evalData.mistake && evalData.mistake !== "n/a") {
                mistakeHtml = `
                    <div class="mistake-info">
                        <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
                        Common mistake: ${evalData.mistake}
                    </div>
                `;
            }
            
            changeSuggestion.innerHTML = `
                <div class="change-text">
                    <div class="deletion">
                        <i class="fas fa-minus-circle" style="margin-right: 8px; color: #e74c3c;"></i>
                        ${targetStep.textContent}
                    </div>
                    <div class="addition">
                        <i class="fas fa-plus-circle" style="margin-right: 8px; color: #2ecc71;"></i>
                        ${evalData.new_step}
                    </div>
                    ${subpointsHtml}
                    ${mistakeHtml}
                </div>
                <div class="change-actions">
                    <button class="accept-change" title="Accept change">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="reject-change" title="Reject change">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Insert the suggestion before the target step
            targetStep.parentNode.insertBefore(changeSuggestion, targetStep);
            targetStep.style.display = 'none'; // Hide the original step
            
            // Animate the suggestion appearing
            requestAnimationFrame(() => {
                changeSuggestion.style.transition = 'all 0.5s ease-out';
                changeSuggestion.style.opacity = '1';
                changeSuggestion.style.transform = 'translateY(0)';
            });
            
            // Set up event handlers for the new change suggestion
            setupChangeSuggestions();
        }
    }
}

function showFeedback(score, feedback, evalData) {
    const feedbackElement = document.getElementById('feedback');
    
    // Format feedback with LaTeX
    const formattedFeedback = formatWithLaTeX(feedback);
    
    let feedbackHtml = '';
    if (evalData.correct) {
        feedbackHtml = `
            <div class="feedback-section">
                <div class="correct-animation">
                    <i class="fas fa-check-circle"></i>
                </div>
                <p>${formattedFeedback}</p>
            </div>
        `;
        // Add 10 points for correct answers
        score = 10;
    } else {
        feedbackHtml = `
            <div class="feedback-section">
                <p>${formattedFeedback}</p>
                <div class="correct-answer-section">
                    <h4>Correct Answer:</h4>
                    <div class="math-content">${formatWithLaTeX(evalData.correct_answer)}</div>
                </div>
            </div>
        `;
        // Add 0 points for incorrect answers
        score = 0;
    }
    
    feedbackElement.innerHTML = feedbackHtml;
    feedbackElement.className = evalData.correct ? 'feedback-positive' : 'feedback-negative';
    feedbackElement.style.display = 'block';
    document.getElementById('next-question').style.display = 'block';

    // Update study guide with feedback
    updateStudyGuideWithFeedback(evalData);

    // Re-render LaTeX in the feedback
    if (window.MathJax) {
        MathJax.typesetPromise([feedbackElement]);
    }
    
    return score;
}

function updatePoints(score) {
    console.log("updatePoints", score)
    console.log("currentQuestionIndex", currentQuestionIndex, currentQuestions.questions.length)
    points += score;
    document.getElementById('points').textContent = `Points: ${points} / ${points_needed}`;
    updateProgressBar();

    if (currentQuestionIndex == currentQuestions.questions.length - 1) {
        if (points >= points_needed) {  // Changed from 50 to 40 since we now have 5 questions
            console.log("level complete")
            showLevelComplete();
        } else {
            console.log("C3", points, points_needed)
            startEvaluation(); // Generate new questions for the current level
        }
    }
}

function updateProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    const percentage = (points / points_needed) * 100;
    progressFill.style.width = `${percentage}%`;
}

function showLevelComplete() {
    document.getElementById('evaluation').style.display = 'none';
    document.getElementById('level-complete').style.display = 'block';
    document.getElementById('level-complete-message').textContent = `You've completed the ${levels[currentLevel]} level!`;
}

function nextLevel() {
    console.log("nextLevel", currentLevel)
    currentLevel++;
    points = 0;
    currentQuestionIndex = 0;

    if (currentLevel < levels.length) {
        document.getElementById('level-complete').style.display = 'none';
        // change the level text
        document.getElementById('current-level').textContent = `Level: ${levels[currentLevel]}`;
        console.log("C2", currentLevel, levels[currentLevel])
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
    // Disable the next button immediately
    const nextButton = document.getElementById('next-question');
    nextButton.disabled = true;

    currentQuestionIndex++;
    console.log("currentQuestionIndex", currentQuestionIndex)
    showQuestion(currentQuestionIndex);
}

// Add new function for opening notebook
function setupNotebookButton() {
    document.getElementById('open-notebook').addEventListener('click', () => {
        const classId = document.getElementById('class-select').value;
        const unitName = document.getElementById('unit-select').value;
        if (classId && unitName) {
            window.open(`/notebook/${classId}/${unitName}`, '_blank');
        } else {
            showNotification('Please select a class and unit first.', 'warning');
        }
    });
}

// Add new function to initialize prompts
function initializePrompts() {
    document.getElementById('question-prompt').value = DEFAULT_PROMPTS.questionGeneration;
    document.getElementById('scoring-prompt').value = DEFAULT_PROMPTS.scoring;
    
    // Add library buttons
    const questionPromptArea = document.getElementById('question-prompt').parentElement;
    const scoringPromptArea = document.getElementById('scoring-prompt').parentElement;
    
    questionPromptArea.insertAdjacentHTML('beforeend', `
        <button class="library-button" onclick="showPromptLibrary('question')">
            <i class="fas fa-book"></i> Question Prompt Library
        </button>
    `);
    
    scoringPromptArea.insertAdjacentHTML('beforeend', `
        <button class="library-button" onclick="showPromptLibrary('scoring')">
            <i class="fas fa-book"></i> Scoring Prompt Library
        </button>
    `);
}

function showPromptLibrary(type) {
    const library = type === 'question' ? QUESTION_PROMPT_LIBRARY : SCORING_PROMPT_LIBRARY;
    
    // Create modal dialog
    const modal = document.createElement('dialog');
    modal.className = 'prompt-library-modal';
    
    const modalContent = `
        <div class="prompt-library-header">
            <h3>${type === 'question' ? 'Question' : 'Scoring'} Prompt Library</h3>
            <button class="prompt-close-btn">&times;</button>
        </div>
        <div class="prompt-grid">
            ${library.map(item => `
                <div class="prompt-item" data-prompt="${item.prompt}">
                    <i class="${item.icon}"></i>
                    <h4>${item.focus}</h4>
                    <p>${item.prompt}</p>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    
    // Show modal using the dialog API
    modal.showModal();
    
    // Add event listeners
    modal.querySelector('.prompt-close-btn').addEventListener('click', () => {
        modal.close();
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.close();
            modal.remove();
        }
    });
    
    modal.querySelectorAll('.prompt-item').forEach(item => {
        item.addEventListener('click', () => {
            const prompt = item.getAttribute('data-prompt');
            document.getElementById(`${type}-prompt`).value = prompt;
            modal.close();
            modal.remove();
        });
    });
}

// Add new function to toggle settings
function toggleSettings() {
    const content = document.getElementById('settings-content');
    const icon = document.querySelector('.settings-toggle-icon');
    
    content.classList.toggle('collapsed');
    icon.classList.toggle('collapsed');
}

function loadMathJax() {
    window.MathJax = {
        tex: {
            inlineMath: [['\\(', '\\)']],
            displayMath: [['\\[', '\\]']],
            processEscapes: true,
            processEnvironments: true
        },
        svg: {
            fontCache: 'global'
        },
        options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    script.async = true;
    document.head.appendChild(script);
}

function showExplanations(explanations) {
    const container = document.createElement('div');
    container.className = 'explanations-container';
    container.innerHTML = `
        <h4>Rate these explanations to help improve future responses:</h4>
        ${explanations.map((expl, index) => `
            <div class="explanation-card">
                <p><strong>Style:</strong> ${expl.style}</p>
                <p>${expl.text}</p>
                <div class="rating-container">
                    <label>Rate this explanation (0-10):</label>
                    <input type="number" min="0" max="10" class="explanation-rating" 
                           data-index="${index}" value="5">
                </div>
            </div>
        `).join('')}
        <button class="submit-ratings-btn">Submit Ratings</button>
    `;

    document.getElementById('feedback').after(container);

    container.querySelector('.submit-ratings-btn').addEventListener('click', () => {
        const ratings = [...container.querySelectorAll('.explanation-rating')]
            .map(input => ({
                index: parseInt(input.dataset.index),
                score: parseInt(input.value)
            }));

        submitExplanationRatings(explanations, ratings);
        container.remove();
    });
}

async function submitExplanationRatings(explanations, ratings) {
    try {
        await fetch('/save-explanation-ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                classId: document.getElementById('class-select').value,
                question: currentQuestions.questions[currentQuestionIndex].question,
                level: levels[currentLevel],
                explanations: explanations.map((expl, index) => ({
                    ...expl,
                    score: ratings.find(r => r.index === index).score
                }))
            }),
        });
        showNotification('Thank you for rating the explanations!', 'success');
    } catch (error) {
        console.error('Error saving ratings:', error);
        showNotification('Failed to save ratings', 'error');
    }
}

function setupChangeSuggestions() {
    document.querySelectorAll('.change-suggestion').forEach(suggestion => {
        const acceptBtn = suggestion.querySelector('.accept-change');
        const rejectBtn = suggestion.querySelector('.reject-change');
        
        acceptBtn.addEventListener('click', () => {
            suggestion.style.transition = 'all 0.5s ease-out';
            suggestion.style.transform = 'translateX(100%)';
            suggestion.style.opacity = '0';
            
            setTimeout(() => {
                const addition = suggestion.querySelector('.addition');
                const subpoints = suggestion.querySelector('.subpoints');
                
                // Create new content with accepted changes
                const newContent = document.createElement('div');
                newContent.className = 'study-guide-item';
                newContent.style.opacity = '0';
                newContent.style.transform = 'translateX(-20px)';
                
                if (addition) {
                    const contentHtml = `
                        <div class="accepted-change">
                            <i class="fas fa-check-circle" style="margin-right: 8px; color: #2ecc71;"></i>
                            ${addition.textContent.trim()}
                        </div>
                    `;
                    newContent.innerHTML = contentHtml;
                }
                
                if (subpoints) {
                    newContent.appendChild(subpoints.cloneNode(true));
                }
                
                suggestion.replaceWith(newContent);
                
                // Animate the new content appearing
                requestAnimationFrame(() => {
                    newContent.style.transition = 'all 0.5s ease-out';
                    newContent.style.opacity = '1';
                    newContent.style.transform = 'translateX(0)';
                });
            }, 500);
        });
        
        rejectBtn.addEventListener('click', () => {
            suggestion.style.transition = 'all 0.5s ease-out';
            suggestion.style.transform = 'translateX(-100%)';
            suggestion.style.opacity = '0';
            
            setTimeout(() => {
                suggestion.remove();
            }, 500);
        });
    });
}

// Add function to fetch study guide
async function fetchStudyGuide(classId, unitName) {
    try {
        // Get guides data
        guide = guides.find(g => 
            g.classId === classId && g.unit === unitName
        );
        
        if (guide) {
            console.log("guide found", guide)
            // Show guide section and populate content
            const guideSection = document.querySelector('.guide-section');
            guideSection.style.display = 'flex';
            
            // Create HTML for nested sections
            const sectionsHtml = guide.sections.map((section, index) => {
                // Handle nested points structure
                const renderPoints = (points) => {
                    if (!points || points.length === 0) return '';
                    return `
                        <ol class="study-guide-list">
                            ${points.map(point => {
                                // If point is an object with text and nested points
                                if (typeof point === 'object') {
                                    return `
                                        <li>
                                            ${point.text}
                                            ${point.points ? renderPoints(point.points) : ''}
                                        </li>
                                    `;
                                }
                                // If point is just a string
                                return `<li>${point}</li>`;
                            }).join('')}
                        </ol>
                    `;
                };

                return `
                    <div class="section">
                        <h4>${section.title}</h4>
                        ${renderPoints(section.points)}
                    </div>
                `;
            }).join('');
            
            document.getElementById('study-guide-content').innerHTML = sectionsHtml;
            
            // Adjust layout to show both panels
            document.getElementById('evaluation').style.display = 'grid';
            document.querySelector('.question-section').style.gridColumn = 'span 1';
        } else {
            // Hide guide section and make question section full width
            const guideSection = document.querySelector('.guide-section');
            guideSection.style.display = 'none';
            
            document.getElementById('evaluation').style.display = 'block';
            document.querySelector('.question-section').style.gridColumn = 'span 2';
        }
    } catch (error) {
        console.error('Error fetching study guide:', error);
        // Hide guide section on error
        const guideSection = document.querySelector('.guide-section');
        guideSection.style.display = 'none';
        document.querySelector('.question-section').style.gridColumn = 'span 2';
    }
}

// Update CSS for evaluation div to handle both layouts
document.addEventListener('DOMContentLoaded', function() {
    const evaluationDiv = document.getElementById('evaluation');
    const questionSection = document.querySelector('.question-section');
    const guideSection = document.querySelector('.guide-section');

    // Initially hide the guide section
    guideSection.style.display = 'none';
    questionSection.style.gridColumn = 'span 2';

    // ... rest of your existing DOMContentLoaded code ...
});

// Add this function to preprocess the guide into ordered list format
function preprocessGuide(guide) {
    if (!guide || !guide.sections) return '';
    
    let orderedList = [];
    let mainIndex = 1;
    
    guide.sections.forEach(section => {
        if (!section.points) return;
        
        const processPoints = (points, prefix = '') => {
            points.forEach((point, idx) => {
                if (typeof point === 'object') {
                    orderedList.push(`${prefix}${idx + 1}. ${point.text}`);
                    if (point.points) {
                        processPoints(point.points, `${prefix}${idx + 1}`);
                    }
                } else {
                    orderedList.push(`${prefix}${idx + 1}. ${point}`);
                }
            });
        };
        
        processPoints(section.points, `${mainIndex}`);
        mainIndex++;
    });
    
    return orderedList.join('\n');
}