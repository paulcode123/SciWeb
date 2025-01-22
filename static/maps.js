// Global UI elements container
const UI = {
    network: null,
    nodes: null,
    edges: null,
    sendButton: null,
    userInput: null,
    saveNotesButton: null,
    userNotes: null,
    conceptNotes: null,
    saveConceptNotes: null,
    currentTab: 'concept',
    currentMap: null
};

// Sample concept data
const conceptData = {
    1: {
        title: 'Derivatives',
        text: 'A derivative measures the rate of change of a function with respect to its variable. It tells us how fast a function is changing at any given point.',
        practice: [
            { question: 'What is the derivative of x²?', hint: 'Use the power rule.' },
            { question: 'Find dy/dx when y = 3x + 2', hint: 'This is a linear function.' }
        ]
    },
    2: {
        title: 'Chain Rule',
        text: 'The chain rule is used to find the derivative of composite functions. If y = f(g(x)), then dy/dx = f\'(g(x)) * g\'(x).',
        practice: [
            { question: 'Find d/dx of (x² + 1)³', hint: 'This is a composite function: outer function is cube, inner is x² + 1' },
            { question: 'What is the derivative of sin(x²)?', hint: 'Apply chain rule with outer function sin(x) and inner function x²' }
        ]
    },
    3: {
        title: 'Product Rule',
        text: 'The product rule is used to find the derivative of the product of two functions. If y = f(x)g(x), then dy/dx = f\'(x)g(x) + f(x)g\'(x).',
        practice: [
            { question: 'Find d/dx of x * sin(x)', hint: 'Use the product rule with f(x) = x and g(x) = sin(x)' },
            { question: 'What is the derivative of (x² + 1)(x³ - 2)?', hint: 'Apply product rule with f(x) = x² + 1 and g(x) = x³ - 2' }
        ]
    },
    4: {
        title: 'Quotient Rule',
        text: 'The quotient rule is used to find the derivative of the quotient of two functions. If y = f(x)/g(x), then dy/dx = [f\'(x)g(x) - f(x)g\'(x)]/[g(x)]².',
        practice: [
            { question: 'Find d/dx of (x² + 1)/(x - 2)', hint: 'Apply quotient rule with f(x) = x² + 1 and g(x) = x - 2' },
            { question: 'What is the derivative of sin(x)/x?', hint: 'Use quotient rule with f(x) = sin(x) and g(x) = x' }
        ]
    },
    5: {
        title: 'Power Rule',
        text: 'The power rule states that the derivative of x^n is n * x^(n-1). This is one of the fundamental rules of differentiation.',
        practice: [
            { question: 'Find d/dx of x⁵', hint: 'Apply the power rule directly' },
            { question: 'What is the derivative of 3x⁴?', hint: 'Remember to use the constant multiple rule along with power rule' }
        ]
    },
    6: {
        title: 'Applications',
        text: 'Derivatives have many real-world applications, including finding rates of change, optimization, and analyzing motion.',
        practice: [
            { question: 'A ball is thrown upward with a height h(t) = -16t² + 64t. Find its velocity at t = 1.', hint: 'Velocity is the derivative of position' },
            { question: 'Find the dimensions of a rectangle with perimeter 20 that has the maximum area.', hint: 'Use derivatives to find the maximum of the area function' }
        ]
    }
};

// Network configuration
const options = {
    nodes: {
        shape: 'box',
        margin: 10,
        font: {
            size: 16,
            face: 'Arial',
            color: '#fff'
        },
        borderWidth: 2,
        shadow: true,
        fixed: {
            x: false,
            y: false
        }
    },
    edges: {
        width: 2,
        arrows: {
            to: {
                enabled: true,
                scaleFactor: 1
            }
        },
        smooth: {
            type: 'cubicBezier',
            forceDirection: 'none',
            roundness: 0.5
        },
        color: {
            color: 'rgba(255, 255, 255, 0.5)',
            highlight: '#3498db'
        }
    },
    physics: {
        enabled: true,
        stabilization: {
            enabled: true,
            iterations: 1000,
            updateInterval: 100,
            fit: true
        },
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 100,
            springConstant: 0.08,
            damping: 0.4,
            avoidOverlap: 0.5
        },
        minVelocity: 0.75,
        maxVelocity: 30
    },
    interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        navigationButtons: true,
        keyboard: true
    },
    layout: {
        randomSeed: 2,
        improvedLayout: true,
        hierarchical: false
    }
};

// Initialize network
async function initNetwork() {
    console.log('Initializing network...');
    const container = document.getElementById('concept-map');
    if (!container) {
        console.error('Concept map container not found');
        return;
    }

    try {
        // Create the network
        UI.nodes = new vis.DataSet([]);
        UI.edges = new vis.DataSet([]);
        
        const data = {
            nodes: UI.nodes,
            edges: UI.edges
        };
        
        // Modify options to prevent constant redrawing
        const initialOptions = {
            ...options,
            physics: {
                ...options.physics,
                enabled: false  // Start with physics disabled
            }
        };
        
        UI.network = new vis.Network(container, data, initialOptions);
        console.log('Network created successfully');
        
        // Add click handler
        UI.network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                selectNode(nodeId);
            }
        });

        UI.network.on('stabilizationProgress', function(params) {
            console.log('Stabilization progress:', Math.round((params.iterations/params.total) * 100) + '%');
        });

        UI.network.on('stabilizationIterationsDone', function() {
            console.log('Stabilization complete');
            UI.network.setOptions({ physics: { enabled: false } });
        });

        // Load available units
        await loadUnits();
    } catch (error) {
        console.error('Error initializing network:', error);
    }
}

// Load available units
async function loadUnits() {
    console.log('Loading units...');
    try {
        const response = await fetchRequest('/data', { data: 'Classes, CMaps' });
        console.log('Received response:', response);
        
        if (!response || !response.CMaps) {
            console.error('Invalid response format:', response);
            return;
        }

        const maps = response.CMaps;
        
        // Get unique units
        const units = [...new Set(maps.map(map => map.unit))];
        console.log('Available units:', units);
        
        // Update select options
        const select = document.getElementById('class-select');
        if (!select) {
            console.error('Class select element not found');
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Choose a unit...</option>';
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            select.appendChild(option);
        });

        // Add event listener for unit selection
        select.addEventListener('change', async (e) => {
            const selectedUnit = e.target.value;
            console.log('Selected unit:', selectedUnit);
            
            if (selectedUnit) {
                const map = maps.find(m => m.unit === selectedUnit);
                console.log('Found map:', map);
                
                if (map) {
                    loadConceptMap(map);
                } else {
                    console.error('No map found for unit:', selectedUnit);
                }
            }
        });
    } catch (error) {
        console.error('Error loading units:', error);
    }
}

// Load concept map
function loadConceptMap(mapData) {
    console.log('Loading concept map:', mapData);
    try {
        // Store current map data
        UI.currentMap = mapData;
        
        // Clear existing nodes and edges
        UI.nodes.clear();
        UI.edges.clear();

        if (!mapData.nodes || !Array.isArray(mapData.nodes)) {
            console.error('Invalid map data - nodes missing or not an array:', mapData);
            return;
        }

        // Add nodes with styling
        const styledNodes = mapData.nodes.map(node => ({
            id: node.id,
            label: node.label || 'Unnamed Node',
            status: 'pending',
            color: {
                background: getNodeColor('pending'),
                border: getBorderColor('pending')
            },
            widthConstraint: {
                minimum: 120,
                maximum: 200
            },
            margin: 10,
            shape: 'box',
            font: {
                size: 16,
                color: '#fff'
            }
        }));

        console.log('Created styled nodes:', styledNodes);

        // Create edges from prerequisites
        const edges = [];
        mapData.nodes.forEach(node => {
            if (node.prerequisites && node.prerequisites.length > 0) {
                node.prerequisites.forEach(prereqId => {
                    edges.push({
                        from: prereqId,
                        to: node.id,
                        length: 200,
                        color: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            highlight: '#3498db'
                        }
                    });
                });
            }
        });

        console.log('Created edges:', edges);

        // Add nodes and edges first with physics disabled
        UI.nodes.add(styledNodes);
        UI.edges.add(edges);

        // Enable physics and stabilize
        UI.network.setOptions({
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 100
                }
            }
        });

        // Fit the network to view all nodes
        if (UI.network) {
            console.log('Fitting network view');
            // Wait for next frame to ensure nodes are added
            requestAnimationFrame(() => {
                UI.network.fit({
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutQuad'
                    }
                });
                
                // Disable physics after stabilization
                UI.network.once('stabilized', () => {
                    console.log('Network stabilized');
                    UI.network.setOptions({ physics: { enabled: false } });
                });
            });
        } else {
            console.error('Network not initialized');
        }
    } catch (error) {
        console.error('Error loading concept map:', error);
    }
}

// Get node color based on status
function getNodeColor(status) {
    switch (status) {
        case 'completed':
            return '#2196F3';
        case 'in_progress':
            return '#4CAF50';
        case 'pending':
            return '#FFA500';
        default:
            return '#999';
    }
}

// Get border color based on status
function getBorderColor(status) {
    switch (status) {
        case 'completed':
            return '#1976D2';
        case 'in_progress':
            return '#388E3C';
        case 'pending':
            return '#F57C00';
        default:
            return '#666';
    }
}

// Select node and update UI
async function selectNode(nodeId) {
    if (!UI.currentMap) return;

    // Find the selected node
    const selectedNode = UI.currentMap.nodes.find(n => n.id === nodeId);
    if (!selectedNode) return;

    // Get tab elements
    const conceptTab = document.querySelector('.tab[data-tab="concept"]');
    const conceptContent = document.getElementById('concept-tab');
    const practiceContent = document.getElementById('practice-tab');

    // Update concept content
    conceptContent.innerHTML = `
        <div class="concept-content">
            <h2 class="concept-title">${selectedNode.label}</h2>
            <div class="concept-text">${selectedNode.description}</div>
        </div>
    `;

    // Fetch problems associated with this node
    try {
        const response = await fetchRequest('/data', { data: 'Classes, Problems' });
        const problems = response.Problems.filter(p => 
            p.concepts && p.concepts.includes(nodeId.toString())
        );
        console.log("problems: " + response.Problems, "nodeId: " + nodeId);
        // Update practice content
        practiceContent.innerHTML = `
            <div class="practice-section">
                <div class="practice-questions">
                    ${problems.length > 0 ? 
                        problems.map(problem => `
                            <div class="practice-question">
                                <p>${problem.problem}</p>
                            </div>
                        `).join('') : 
                        '<p>No practice problems available for this concept yet.</p>'
                    }
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching problems:', error);
        practiceContent.innerHTML = `
            <div class="practice-section">
                <p>Error loading practice problems.</p>
            </div>
        `;
    }

    // Update node status if needed
    const node = UI.nodes.get(nodeId);
    if (node.status === 'pending') {
        UI.nodes.update({
            id: nodeId,
            status: 'in_progress',
            color: {
                background: getNodeColor('in_progress'),
                border: getBorderColor('in_progress')
            }
        });
    }
}

// Load concept notes
function loadConceptNotes(nodeId) {
    // In a real app, you would fetch notes from backend
    const savedNotes = localStorage.getItem(`concept-notes-${nodeId}`);
    if (savedNotes) {
        document.getElementById('concept-notes').value = savedNotes;
    } else {
        document.getElementById('concept-notes').value = '';
    }
}

// Save concept notes
function saveConceptNotes() {
    const nodeId = getCurrentNodeId(); // You'll need to track the current node
    if (nodeId) {
        const notes = document.getElementById('concept-notes').value;
        localStorage.setItem(`concept-notes-${nodeId}`, notes);
    }
}

// Handle tab switching
function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    UI.currentTab = tabName;
}

// Initialize UI elements
function initializeUIElements() {
    UI.sendButton = document.getElementById('send-message');
    UI.userInput = document.getElementById('user-input');
    UI.saveNotesButton = document.getElementById('save-notes');
    UI.userNotes = document.getElementById('user-notes');
    UI.conceptNotes = document.getElementById('concept-notes');
    UI.saveConceptNotes = document.getElementById('save-concept-notes');
}

// Setup event listeners
function setupEventListeners() {
    // Chat event listeners
    if (UI.sendButton && UI.userInput) {
        UI.sendButton.addEventListener('click', sendMessage);
        UI.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
                sendMessage();
            }
        });
    }

    // Notes event listener
    if (UI.saveNotesButton) {
        UI.saveNotesButton.addEventListener('click', saveNotes);
    }

    // Map control event listeners
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const resetView = document.getElementById('reset-view');

    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            if (UI.network) {
                UI.network.moveTo({
                    scale: UI.network.getScale() * 1.2
                });
            }
        });
    }

    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            if (UI.network) {
                UI.network.moveTo({
                    scale: UI.network.getScale() / 1.2
                });
            }
        });
    }

    if (resetView) {
        resetView.addEventListener('click', () => {
            if (UI.network) {
                UI.network.fit();
            }
        });
    }

    // Tab event listeners
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    // Concept notes save button
    if (UI.saveConceptNotes) {
        UI.saveConceptNotes.addEventListener('click', saveConceptNotes);
    }
}

// Send message
function sendMessage() {
    if (UI.userInput && UI.userInput.value.trim()) {
        const text = UI.userInput.value.trim();
        addMessage('user', text);
        UI.userInput.value = '';
        addMessage('ai', 'I understand your question about ' + text + '. Let me help explain that...');
    }
}

// Save notes
function saveNotes() {
    if (UI.userNotes) {
        // Here you would typically save the notes to a backend
        console.log('Notes saved:', UI.userNotes.value);
    }
}

// Helper function to get current node ID
function getCurrentNodeId() {
    // In a real app, you would track the currently selected node
    return UI.network ? UI.network.getSelectedNodes()[0] : null;
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeUIElements();
    initNetwork();
    setupEventListeners();
});
