// Import all functionality from levels.js
import * as levels from './levels.js';

// Additional global variables for study guide functionality
let qaHistory = [];
let currentGuideContent = '';
let pendingChanges = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize levels functionality
    levels.setupEventListeners();
    levels.fetchClasses();
    levels.initializePrompts();
    levels.loadMathJax();

    // Setup additional study guide functionality
    setupGuideEventListeners();
    setupTextSelectionHandler();
});

function setupGuideEventListeners() {
    document.getElementById('update-guide').addEventListener('click', updateGuide);
    document.getElementById('save-guide').addEventListener('click', saveGuide);
    document.getElementById('load-guide').addEventListener('click', loadGuide);
    document.getElementById('approve-changes').addEventListener('click', approveChanges);
    document.getElementById('reject-changes').addEventListener('click', rejectChanges);
}

// Override the original submitAnswer function to track Q&A history
async function submitAnswer() {
    const answer = document.getElementById('answer').value;
    if (!answer.trim()) {
        showNotification('Please enter an answer before submitting.', 'warning');
        return;
    }

    const currentQuestion = levels.currentQuestions.questions[levels.currentQuestionIndex];
    
    try {
        const evalResponse = await fetch('/evaluate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: currentQuestion.question,
                answer: answer,
                level: levels.levels[levels.currentLevel],
                customPrompt: levels.customPrompts.scoring
            }),
        });
        
        const evalData = await evalResponse.json();
        
        // Add to Q&A history
        qaHistory.push({
            question: currentQuestion.question,
            userAnswer: answer,
            correctAnswer: evalData.correct_answer,
            score: evalData.score,
            feedback: evalData.feedback
        });

        // Continue with original functionality
        showFeedback(evalData.score, evalData.feedback);
        updatePoints(evalData.score);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

async function updateGuide() {
    const guideContent = document.getElementById('guide-content').innerHTML;
    
    try {
        const response = await fetch('/update-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guide_content: guideContent,
                qa_history: qaHistory
            }),
        });
        
        const data = await response.json();
        if (data.success) {
            pendingChanges = data.updated_guide;
            showChanges(data.updated_guide);
        } else {
            showNotification('Failed to update guide: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to update guide', 'error');
    }
}

function setupTextSelectionHandler() {
    const guideContent = document.getElementById('guide-content');
    const popup = document.getElementById('text-selection-popup');
    
    guideContent.addEventListener('mouseup', function() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 5}px`;
            popup.style.display = 'block';
            
            const textarea = popup.querySelector('textarea');
            textarea.value = '';
            
            popup.querySelector('.submit-modification').onclick = () => {
                modifySection(selectedText, textarea.value);
                popup.style.display = 'none';
            };
        } else {
            popup.style.display = 'none';
        }
    });
}

async function modifySection(selectedText, request) {
    const guideContent = document.getElementById('guide-content').innerHTML;
    
    try {
        const response = await fetch('/modify-guide-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guide_content: guideContent,
                selected_text: selectedText,
                modification_request: request
            }),
        });
        
        const data = await response.json();
        if (data.success) {
            pendingChanges = data.updated_guide;
            showChanges(data.updated_guide);
        } else {
            showNotification('Failed to modify section: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to modify section', 'error');
    }
}

function showChanges(updatedContent) {
    const changesPanel = document.getElementById('changes-panel');
    const changesContent = document.getElementById('changes-content');
    
    // Process the content to highlight changes
    let processedContent = updatedContent
        .replace(/<add>/g, '<span class="addition">')
        .replace(/<\/add>/g, '</span>')
        .replace(/<remove>/g, '<span class="removal">')
        .replace(/<\/remove>/g, '</span>');
    
    changesContent.innerHTML = processedContent;
    changesPanel.style.display = 'block';
}

function approveChanges() {
    if (pendingChanges) {
        // Remove the markup tags and update the guide
        const cleanContent = pendingChanges
            .replace(/<add>/g, '')
            .replace(/<\/add>/g, '')
            .replace(/<remove>.*?<\/remove>/g, '');
        
        document.getElementById('guide-content').innerHTML = cleanContent;
        document.getElementById('changes-panel').style.display = 'none';
        pendingChanges = null;
        
        showNotification('Changes approved and applied', 'success');
    }
}

function rejectChanges() {
    document.getElementById('changes-panel').style.display = 'none';
    pendingChanges = null;
    showNotification('Changes rejected', 'info');
}

async function saveGuide() {
    const guideContent = document.getElementById('guide-content').innerHTML;
    const classId = document.getElementById('class-select').value;
    
    try {
        const response = await fetch('/save-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                class_id: classId,
                guide_content: guideContent
            }),
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Guide saved successfully', 'success');
        } else {
            showNotification('Failed to save guide: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to save guide', 'error');
    }
}

async function loadGuide() {
    const classId = document.getElementById('class-select').value;
    
    try {
        const response = await fetch('/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sheet: "Guides",
                query: { classId: classId }
            }),
        });
        
        const data = await response.json();
        if (data && data.length > 0) {
            // Get the most recent guide
            const mostRecent = data.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            )[0];
            
            document.getElementById('guide-content').innerHTML = mostRecent.content;
            showNotification('Guide loaded successfully', 'success');
        } else {
            showNotification('No saved guide found for this class', 'info');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to load guide', 'error');
    }
}

function showNotification(message, type) {
    // You can implement this using a toast library or custom notification system
    console.log(`${type}: ${message}`);
}


// Replace the existing handleClassSelect function with this version
function handleClassSelect() {
    const unitSelect = document.getElementById('unit-select');
    const startEvalBtn = document.getElementById('start-evaluation');
    unitSelect.innerHTML = '<option value="">Select a unit</option>';
    unitSelect.disabled = true;
    startEvalBtn.classList.remove('active');

    const classId = document.getElementById('class-select').value;
    
    fetch('/get-units', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId: classId }),
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
            
            // Add change event listener to unit select
            unitSelect.addEventListener('change', () => {
                if (unitSelect.value) {
                    startEvalBtn.classList.add('active');
                } else {
                    startEvalBtn.classList.remove('active');
                }
            });
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

// Update the startEvaluation function to include fade transitions
function startEvaluation() {
    if (!document.getElementById('start-evaluation').classList.contains('active')) {
        return;
    }

    const selectionArea = document.getElementById('class-selection');
    const evaluationArea = document.getElementById('evaluation');

    selectionArea.classList.add('fade-out');
    setTimeout(() => {
        selectionArea.style.display = 'none';
        evaluationArea.style.display = 'block';
        // Continue with the existing evaluation logic...
    }, 500);
}