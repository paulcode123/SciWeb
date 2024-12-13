let classes = [];
let notebooks = [];
let history = [];

let classId;
let unitName;
let classnotebooks = [];
let unitSynthesis = [];

document.addEventListener('DOMContentLoaded', function() {
    fetchClasses();
    setupEventListeners();
    loadMathJax();
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
    document.getElementById('build-guide-btn').addEventListener('click', handleBuildGuide);
    document.getElementById('submit-highlights').addEventListener('click', handleSubmitHighlights);
    setupHighlighting();
}

function handleClassSelect() {
    const unitSelect = document.getElementById('unit-select');
    const buildGuideBtn = document.getElementById('build-guide-btn');
    unitSelect.innerHTML = '<option value="">Select a unit</option>';
    unitSelect.disabled = true;
    buildGuideBtn.classList.remove('active');

    classId = document.getElementById('class-select').value;
    
    // Filter notebooks for this class
    console.log(notebooks);
    classnotebooks = notebooks.filter(notebook => parseInt(notebook.classID) === parseInt(classId));
    console.log(classnotebooks);

    fetch('/get-units', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId: classId, classes: classes, notebooks: notebooks }),
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
                    unitName = unitSelect.value;
                    buildGuideBtn.classList.add('active');
                } else {
                    buildGuideBtn.classList.remove('active');
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

function handleBuildGuide() {
    if (!document.getElementById('build-guide-btn').classList.contains('active')) {
        return;
    }

    // Filter notebooks for selected class and unit
    console.log(classnotebooks, unitName);
    unitSynthesis = classnotebooks.filter(notebook => notebook.unit == unitName).at(-1);
    console.log(unitSynthesis);
    const selectionArea = document.getElementById('class-selection');
    const cardsContainer = document.getElementById('cards-container');

    selectionArea.classList.add('fade-out');
    setTimeout(() => {
        selectionArea.style.display = 'none';
        startLoading();
        
        console.log(unitSynthesis);
        // Get initial explanations from backend
        fetch('/make_explanation_cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                history: null,
                notebook: unitSynthesis
            }),
        })
        .then(response => response.json())
        .then(data => {
            endLoading();
            cardsContainer.style.display = 'grid';
            cardsContainer.classList.remove('fade-out');
            
            // Set the cards with the received explanations
            const explanations = data.explanations;
            set_cards(
                explanations[0].text,
                explanations[1].text,
                explanations[2].text
            );
        })
        .catch(error => {
            console.error('Error:', error);
            endLoading();
            showNotification('Failed to generate explanations', 'error');
        });
    }, 500);
}

function set_cards(text1, text2, text3) {
    const cards = document.querySelectorAll('.explanation-card .mathjax-content p');
    
    // Set content for each card
    cards.forEach((card, index) => {
        const text = [text1, text2, text3][index];
        card.innerHTML = text;
    });

    // Force MathJax to reprocess the content
    if (window.MathJax) {
        try {
            const mathjaxContent = document.querySelectorAll('.mathjax-content');
            MathJax.typesetClear(mathjaxContent);
            MathJax.typesetPromise(mathjaxContent).catch((err) => {
                console.error('MathJax typesetting failed:', err);
            });
        } catch (e) {
            console.error('Error processing MathJax:', e);
        }
    }
}

function setupHighlighting() {
    document.querySelectorAll('.explanation-card').forEach(card => {
        card.addEventListener('mouseup', (event) => {
            const selection = window.getSelection();
            if (selection.toString().length > 0) {
                // Store the range immediately
                const range = selection.getRangeAt(0);
                
                // Show color selection popup
                const popup = document.createElement('div');
                popup.className = 'color-selection-popup';
                popup.style.position = 'absolute';
                popup.style.left = `${event.pageX}px`;
                popup.style.top = `${event.pageY}px`;
                
                // Create color circles
                const greenCircle = document.createElement('div');
                greenCircle.className = 'color-circle green';
                greenCircle.onclick = () => highlightSelection('green', range);

                const redCircle = document.createElement('div');
                redCircle.className = 'color-circle red';
                redCircle.onclick = () => highlightSelection('red', range);

                popup.appendChild(greenCircle);
                popup.appendChild(redCircle);
                document.body.appendChild(popup);

                // Remove popup when clicking outside
                document.addEventListener('mousedown', function removePopup(e) {
                    if (!popup.contains(e.target)) {
                        popup.remove();
                        document.removeEventListener('mousedown', removePopup);
                    }
                });
            }
        });
    });
}

function highlightSelection(color, range) {
    try {
        const span = document.createElement('span');
        span.classList.add(color === 'green' ? 'highlighted-green' : 'highlighted-red');
        
        // Use the stored range
        const rangeClone = range.cloneRange();
        rangeClone.surroundContents(span);
    } catch (e) {
        console.error('Error highlighting:', e);
    }
    
    // Remove any color selection popup
    document.querySelectorAll('.color-selection-popup').forEach(popup => popup.remove());
}

function handleSubmitHighlights() {
    const cardsContainer = document.getElementById('cards-container');
    const userInput = document.getElementById('user-input-txtrea').value;
    console.log(userInput);
    // Get data from each card
    const cards = document.querySelectorAll('.explanation-card');
    cards.forEach((card, index) => {
        let cardData = {
            explanation: card.querySelector('p').textContent,
            greenHighlights: [],
            redHighlights: []
        };

        // Get highlighted text
        card.querySelectorAll('.highlighted-green').forEach(highlight => {
            cardData.greenHighlights.push(highlight.textContent);
        });
        card.querySelectorAll('.highlighted-red').forEach(highlight => {
            cardData.redHighlights.push(highlight.textContent);
        });

        history.push(cardData);
    });

    cardsContainer.classList.add('fade-out');
    setTimeout(() => {
        cardsContainer.style.display = 'none';
        console.log('History:', history);
        startLoading();
        
        // Get next set of explanations from backend
        fetch('/make_explanation_cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                history: history,
                notebook: unitSynthesis,
                user_input: userInput
            }),
        })
        .then(response => response.json())
        .then(data => {
            endLoading();
            if (data.explanations && data.explanations.length > 0) {
                cardsContainer.style.display = 'grid';
                cardsContainer.classList.remove('fade-out');
                
                // Set the cards with the received explanations
                const explanations = data.explanations;
                set_cards(
                    explanations[0].text,
                    explanations[1].text,
                    explanations[2].text
                );

                // Ensure container is visible before typesetting
                setTimeout(() => {
                    if (window.MathJax) {
                        MathJax.typesetClear([cardsContainer]);
                        MathJax.typesetPromise([cardsContainer]).catch((err) => {
                            console.error('MathJax typesetting failed:', err);
                        });
                    }
                }, 100);
            } else {
                console.error('No explanations received from backend');
                showNotification('No explanations received from backend', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            endLoading();
            showNotification('Failed to generate explanations', 'error');
        });
    }, 500);
}

function showNotification(message, type) {
    console.log(`${type}: ${message}`);
    // You can implement a proper notification system here
}

function loadMathJax() {
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
            processEnvironments: true
        },
        options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        },
        startup: {
            pageReady: () => {
                return MathJax.startup.defaultPageReady();
            }
        }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    document.head.appendChild(script);
}
