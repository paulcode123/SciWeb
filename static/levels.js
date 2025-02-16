const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[Levels]', ...args);
    }
}

// Global UI elements container
const UI = {
    network: null,
    nodes: null,
    edges: null,
    currentNode: null,
    currentMap: null
};

// Network configuration (similar to derive.js)
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
        keyboard: {
            enabled: true,
            bindToWindow: false
        }
    },
    layout: {
        randomSeed: 2,
        improvedLayout: true,
        hierarchical: false
    }
};

/**
 * State management for problems
 */
const ProblemState = {
    currentProblem: null,
    currentAnswer: null,
    problems: [],
    problemIndex: 0,
    recording: false,
    mediaRecorder: null,
    audioChunks: []
};

/**
 * State management for data
 */
const DataState = {
    classes: null,
    cmaps: null,
    umaps: null,
    problems: null,
    currentUnit: null,
    currentClass: null
};

/**
 * Initialize the network visualization
 */
async function initNetwork() {
    log('Initializing network');
    const container = document.getElementById('concept-map');
    if (!container) {
        log('Error: concept-map container not found');
        return;
    }

    // Create empty dataset
    const data = {
        nodes: new vis.DataSet([]),
        edges: new vis.DataSet([])
    };
    log('Created empty dataset');

    // Store references
    UI.nodes = data.nodes;
    UI.edges = data.edges;

    // Start with physics disabled for initial setup
    const initialOptions = {
        ...options,
        physics: {
            ...options.physics,
            enabled: false
        }
    };
    
    UI.network = new vis.Network(container, data, initialOptions);
    log('Network created');

    // Add stabilization event handlers
    UI.network.on('stabilizationProgress', function(params) {
        log('Stabilization progress:', Math.round((params.iterations/params.total) * 100) + '%');
    });

    UI.network.on('stabilizationIterationsDone', function() {
        log('Stabilization complete');
        UI.network.setOptions({ physics: { enabled: false } });
    });

    // Add click event listener
    UI.network.on('click', function(params) {
        if (params.nodes.length > 0) {
            log('Node clicked:', params.nodes[0]);
            selectNode(params.nodes[0]);
        }
    });

    // Load initial data and setup unit selection
    await initializeData();
}

/**
 * Initialize all data from the backend
 */
async function initializeData() {
    log('Initializing data...');
    try {
        // Fetch all required data
        const response = await fetchRequest('/data', { data: 'Classes, CMaps, UMaps, Problems' });
        log('Received data response:', response);

        if (!response.UMaps) {
            log('Warning: No UMaps data in response');
        }

        // Store data in state
        DataState.classes = response.Classes || [];
        DataState.cmaps = response.CMaps || [];
        DataState.umaps = response.UMaps || [];
        DataState.problems = response.Problems || [];

        log('Stored UMaps data:', DataState.umaps);

        // Setup unit selection
        await setupUnitSelection();
    } catch (error) {
        log('Error initializing data:', error);
        showError('Failed to load initial data. Please refresh the page.');
    }
}

/**
 * Setup unit selection dropdown
 */
async function setupUnitSelection() {
    log('Setting up unit selection');
    const unitSelect = document.getElementById('unit-select');
    if (!unitSelect) {
        log('Error: unit-select not found');
        return;
    }

    try {
        // Get unique units from CMaps
        const units = [...new Set(DataState.cmaps.map(map => map.unit))];
        log('Available units:', units);

        // Clear existing options
        unitSelect.innerHTML = '<option value="" disabled selected>Choose a unit...</option>';

        // Add units to dropdown
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitSelect.appendChild(option);
        });

        // Add change event listener
        unitSelect.addEventListener('change', handleUnitSelection);

        log('Unit selection setup complete');
    } catch (error) {
        log('Error setting up unit selection:', error);
        showError('Failed to setup unit selection.');
    }
}

/**
 * Handle unit selection change
 */
async function handleUnitSelection(event) {
    const selectedUnit = event.target.value;
    log('Unit selected:', selectedUnit);

    if (!selectedUnit) return;

    try {
        // Hide initial message and show problem section
        const initialMessage = document.querySelector('.initial-message');
        const problemSection = document.querySelector('.problem-section');
        if (initialMessage) initialMessage.style.display = 'none';
        if (problemSection) problemSection.style.display = 'block';

        // Find corresponding map data
        const mapData = DataState.cmaps.find(map => map.unit === selectedUnit);
        if (!mapData) {
            log('Error: No map data found for unit:', selectedUnit);
            showError('Failed to load concept map for selected unit.');
            return;
        }

        // Store current unit and class
        DataState.currentUnit = selectedUnit;
        DataState.currentClass = mapData.classID;

        // Filter relevant data for this unit AND class
        const unitData = {
            cmap: mapData,
            umaps: DataState.umaps.filter(u => 
                u.unit === selectedUnit && 
                parseInt(u.classID) === parseInt(mapData.classID)
            ),
            problems: DataState.problems.filter(p => 
                p.unit === selectedUnit && 
                p.classID === mapData.classID
            )
        };

        log('Filtered UMaps data:', unitData.umaps);

        // Update progress display
        updateProgressStats(unitData);

        // Load concept map
        await loadConceptMap(unitData);

        log('Unit data loaded successfully');
    } catch (error) {
        log('Error handling unit selection:', error);
        showError('Failed to load unit data.');
    }
}

/**
 * Update progress statistics display
 */
function updateProgressStats(unitData) {
    const problems = unitData.problems || [];
    const completedProblems = problems.filter(p => p.completed).length;
    
    // Update problems count
    const problemsStats = document.querySelector('.stat-value');
    if (problemsStats) {
        problemsStats.textContent = `${completedProblems}/${problems.length}`;
    }

    // Update time spent (placeholder for now)
    const timeStats = document.querySelectorAll('.stat-value')[1];
    if (timeStats) {
        const startTime = UI.startTime || new Date();
        const timeSpent = Math.floor((new Date() - startTime) / (1000 * 60)); // in minutes
        timeStats.textContent = `${Math.floor(timeSpent/60)}h ${timeSpent%60}m`;
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // Add to document
    document.body.appendChild(errorDiv);

    // Remove after delay
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Load concept map for the selected unit
 */
async function loadConceptMap(unitData) {
    log('Loading concept map:', unitData);
    try {
        // Store current map data
        UI.currentMap = unitData.cmap;
        
        // Clear existing nodes and edges
        UI.nodes.clear();
        UI.edges.clear();

        if (!unitData.cmap.nodes || !Array.isArray(unitData.cmap.nodes)) {
            log('Error: Invalid map data - nodes missing or not an array:', unitData.cmap);
            return;
        }

        // Get UMaps data for this unit and class
        if (!unitData.umaps || !Array.isArray(unitData.umaps)) {
            log('Error: Invalid UMaps data:', unitData.umaps);
            return;
        }

        log('UMaps data for unit:', unitData.umaps);
        const umap = unitData.umaps?.[0]?.node_progress || {};
        log('Node progress data:', umap);

        // Add nodes with enhanced styling based on UMaps data
        const styledNodes = unitData.cmap.nodes.map(node => {
            const nodeId = node.id.toString();
            const nodeProgress = umap[nodeId] || {};
            
            // Get node styling based on progress
            const haloConfig = getHaloConfig(nodeProgress);
            
            const nodeData = {
                id: nodeId,
                label: node.label,
                status: nodeProgress.date_derived ? 'completed' : 'pending',
                color: {
                    background: haloConfig.color,
                    border: getBorderColor(nodeProgress.date_derived ? 'completed' : 'pending')
                },
                shadow: {
                    enabled: true,
                    color: haloConfig.color,
                    size: 15,
                    x: 0,
                    y: 0
                },
                opacity: haloConfig.intensity,
                widthConstraint: {
                    minimum: 120,
                    maximum: 200
                },
                margin: 10,
                shape: 'box',
                font: {
                    size: 16,
                    color: '#fff',
                    bold: true,
                    strokeWidth: 2,
                    strokeColor: '#000'
                },
                title: generateNodeTooltip(node, nodeProgress),
                prerequisites: node.prerequisites || [],
                problems: unitData.problems.filter(p => p.concept_id === nodeId)
            };

            // Apply saved position if available
            if (unitData.cmap.structure?.nodes?.[nodeId]) {
                nodeData.x = unitData.cmap.structure.nodes[nodeId].x;
                nodeData.y = unitData.cmap.structure.nodes[nodeId].y;
            }

            return nodeData;
        });

        log('Created styled nodes:', styledNodes);

        // Create edges from prerequisites
        const edges = [];
        unitData.cmap.nodes.forEach(node => {
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

        log('Created edges:', edges);

        // Add nodes and edges first with physics disabled
        UI.network.setOptions({ physics: { enabled: false } });
        UI.nodes.add(styledNodes);
        UI.edges.add(edges);

        // Enable physics and stabilize only if no structure exists
        if (!unitData.cmap.structure?.nodes) {
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
        }

        // Fit the network to view all nodes
        if (UI.network) {
            log('Fitting network view');
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
                    log('Network stabilized');
                    UI.network.setOptions({ physics: { enabled: false } });
                });
            });
        } else {
            log('Error: Network not initialized');
        }

        // Find first available node and load its problems
        const nextNode = findNextConcept();
        if (nextNode) {
            log('Found next node to work on:', nextNode);
            selectNode(nextNode.id);
        } else {
            log('No available nodes to work on');
            showMessage('All concepts have been completed! You can click on any node to review it.');
        }

    } catch (error) {
        log('Error loading concept map:', error);
        showError('Failed to load concept map. Please try again.');
    }
}

/**
 * Handle node selection in the concept map
 */
function selectNode(nodeId) {
    const node = UI.nodes.get(nodeId);
    if (!node) return;

    // Check if all prerequisites are completed
    const prerequisites = node.prerequisites || [];
    const completedPrereqs = prerequisites.every(prereqId => {
        const prereqNode = UI.nodes.get(prereqId);
        return prereqNode && prereqNode.status === 'completed';
    });

    if (!completedPrereqs && 1==2) {
        showMessage('Please complete the prerequisite concepts first.');
        // Highlight prerequisites
        prerequisites.forEach(prereqId => {
            const prereqNode = UI.nodes.get(prereqId);
            if (prereqNode && prereqNode.status === 'pending') {
                UI.network.selectNodes([prereqId], true);
            }
        });
        return;
    }

    // Update current node
    UI.currentNode = node;
    
    // Check if this node has problems
    const hasProblems = DataState.problems.some(p => 
        p.concepts && Array.isArray(p.concepts) && p.concepts.includes(nodeId.toString())
    );

    if (!hasProblems) {
        log('No problems for node:', nodeId);
        // Try to find next node with problems
        const nextNodeWithProblems = findNextConceptWithProblems([nodeId]);
        if (nextNodeWithProblems) {
            log('Found next node with problems:', nextNodeWithProblems.id);
            selectNode(nextNodeWithProblems.id);
        } else {
            showMessage('No problems available for any accessible concepts.');
        }
        return;
    }
    
    // Load problems for this node
    loadProblems(nodeId);
}

/**
 * Find the next concept to work on
 */
function findNextConcept() {
    if (!UI.currentMap || !UI.currentMap.nodes) return null;

    const nodes = UI.nodes.get();
    
    // Get current UMap to check completed problems
    const currentUmap = DataState.umaps.find(u => 
        u.unit === DataState.currentUnit && 
        parseInt(u.classID) === parseInt(DataState.currentClass)
    );

    // Find nodes that have uncompleted problems
    const availableNodes = nodes.filter(node => {
        // Get the node's evaluation history
        const nodeProgress = currentUmap?.node_progress?.[node.id] || {};
        const completedProblemIds = new Set(
            (nodeProgress.evaluation_history || [])
                .map(entry => entry.problem_id)
                .filter(id => id)
        );
        
        // Check if this node has any uncompleted problems
        const hasUncompletedProblems = DataState.problems.some(p => 
            p.concepts && 
            Array.isArray(p.concepts) && 
            p.concepts.includes(node.id.toString()) &&
            !completedProblemIds.has(p.id.toString())
        );

        return hasUncompletedProblems;
    });

    log('Available nodes with uncompleted problems:', availableNodes);
    return availableNodes[0] || null;
}

/**
 * Find the next concept that has problems
 */
function findNextConceptWithProblems(excludeNodeIds = []) {
    const nodes = UI.nodes.get();
    
    // Get current UMap to check completed problems
    const currentUmap = DataState.umaps.find(u => 
        u.unit === DataState.currentUnit && 
        parseInt(u.classID) === parseInt(DataState.currentClass)
    );

    // Find nodes that have uncompleted problems
    return nodes.find(node => {
        // Skip if already checked
        if (excludeNodeIds.includes(node.id)) return false;

        // Get the node's evaluation history
        const nodeProgress = currentUmap?.node_progress?.[node.id] || {};
        const completedProblemIds = new Set(
            (nodeProgress.evaluation_history || [])
                .map(entry => entry.problem_id)
                .filter(id => id)
        );
        
        // Check if this node has any uncompleted problems
        return DataState.problems.some(p => 
            p.concepts && 
            Array.isArray(p.concepts) && 
            p.concepts.includes(node.id.toString()) &&
            !completedProblemIds.has(p.id.toString())
        );
    });
}

/**
 * Display problems for the selected concept
 */
function displayProblems(node) {
    const problemsContainer = document.getElementById('problems-container');
    if (!problemsContainer) return;

    problemsContainer.innerHTML = '';
    
    if (!node.problems || node.problems.length === 0) {
        problemsContainer.innerHTML = '<p>No problems available for this concept.</p>';
        return;
    }

    const problemsList = document.createElement('div');
    problemsList.className = 'problems-list';

    node.problems.forEach(problem => {
        const problemCard = document.createElement('div');
        problemCard.className = `problem-card ${problem.completed ? 'completed' : ''}`;
        problemCard.innerHTML = `
            <h3>${problem.title}</h3>
            <p>${problem.description}</p>
            <button onclick="startProblem('${problem.id}')" ${problem.completed ? 'disabled' : ''}>
                ${problem.completed ? 'Completed' : 'Start Problem'}
            </button>
        `;
        problemsList.appendChild(problemCard);
    });

    problemsContainer.appendChild(problemsList);
}

/**
 * Get node color based on mastery level
 */
function getNodeColor(status, mastery = 0) {
    if (status === 'completed') {
        return '#4CAF50';  // Green for mastered nodes
    }
    
    // Color gradient based on mastery level
    if (mastery >= 0.9) return '#FFF';  // Bright white/gold for high mastery
    if (mastery >= 0.7) return '#2196F3';  // Blue for good understanding
    if (mastery >= 0.4) return '#FF9800';  // Orange for making progress
    return '#795548';  // Brown for just starting
}

/**
 * Get halo configuration based on mastery and achievements
 */
function getHaloConfig(nodeData) {
    const mastery = nodeData.mastery_level || 0;
    const achievements = nodeData.achievements || [];
    const lastPractice = nodeData.last_practice ? new Date(nodeData.last_practice) : null;
    
    // Calculate decay factor
    let decayFactor = 1;
    if (lastPractice) {
        const daysSinceLastPractice = (new Date() - lastPractice) / (1000 * 60 * 60 * 24);
        decayFactor = Math.max(0.3, 1 - (daysSinceLastPractice / 30)); // Decay over 30 days to 30%
    }
    
    // Base halo intensity on mastery and decay
    const intensity = Math.max(0.2, mastery * decayFactor);
    
    // Get active achievements
    const activeAchievements = achievements.filter(a => a.active);
    
    // Define special effects based on achievements
    const effects = [];
    activeAchievements.forEach(achievement => {
        switch(achievement.type) {
            case 'perfect_score':
                effects.push('perfect-score-glow');
                break;
            case 'quick_learner':
                effects.push('sparkle');
                break;
            case 'consistent':
                effects.push('steady-pulse');
                break;
        }
    });
    
    return {
        color: getNodeColor(nodeData.status, mastery),
        intensity: intensity,
        effects: effects
    };
}

/**
 * Apply visual effects to node
 */
function applyNodeEffects(node, effects) {
    // Remove existing effects
    node.classList.remove('perfect-score-glow', 'sparkle', 'steady-pulse');
    
    // Apply new effects
    effects.forEach(effect => {
        node.classList.add(effect);
    });
}

/**
 * Update node styling based on progress
 */
function updateNodeStyling(nodeId, progress) {
    const node = UI.nodes.get(nodeId);
    if (!node) return;
    
    const haloConfig = getHaloConfig(progress);
    
    // Update node appearance
    const updatedNode = {
        ...node,
        color: {
            background: haloConfig.color,
            border: getBorderColor(node.status)
        },
        shadow: {
            enabled: true,
            color: haloConfig.color,
            size: 15,
            x: 0,
            y: 0
        },
        opacity: haloConfig.intensity,
        title: generateNodeTooltip(node, progress)
    };
    
    // Add custom effects if supported by vis.js
    if (haloConfig.effects.length > 0) {
        updatedNode.shapeProperties = {
            ...updatedNode.shapeProperties,
            useBorderWithShadow: true
        };
    }
    
    UI.nodes.update(updatedNode);
}

/**
 * Get border color based on status
 */
function getBorderColor(status) {
    switch (status) {
        case 'completed':
            return '#388E3C';  // Darker green for mastered
        case 'in_progress':
            return '#1976D2';  // Darker blue for derived
        case 'pending':
            return '#E65100';  // Darker orange for not started
        default:
            return '#666';
    }
}

/**
 * Show message to user
 */
function showMessage(message) {
    // Implement message display logic
    console.log(message);
}

/**
 * Load problems for the current concept node
 * Fetches problems from the backend filtered by concept prerequisites
 */
async function loadProblems(nodeId) {
    log('Loading problems for node:', nodeId);
    
    // Get problems for this concept from DataState
    const conceptProblems = DataState.problems.filter(p => 
        p.concepts && Array.isArray(p.concepts) && p.concepts.includes(nodeId.toString())
    );
    
    // Get current UMap data for the user's current unit and class
    const currentUMap = DataState.umaps.find(u => 
        u.unit === DataState.currentUnit && 
        parseInt(u.classID) === parseInt(DataState.currentClass)
    );
    
    // Extract evaluation history from the node's progress data
    const nodeProgress = currentUMap?.node_progress?.[nodeId] || {};
    const evaluationHistory = nodeProgress.evaluation_history || [];
    
    // Create a Set of completed problem IDs from the evaluation history
    const completedProblemIds = new Set(evaluationHistory.map(entry => entry.problem_id));
    
    // Filter out problems that have already been completed
    const filteredProblems = conceptProblems.filter(p => !completedProblemIds.has(p.id));
    
    // Sort by difficulty
    filteredProblems.sort((a, b) => {
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
    
    log('Found problems:', filteredProblems);
    
    // Store in problem state
    ProblemState.problems = filteredProblems;
    ProblemState.problemIndex = 0;
    ProblemState.currentProblem = filteredProblems[0] || null;
    
    // Display first problem
    if (ProblemState.currentProblem) {
        displayProblem(ProblemState.currentProblem);
    } else {
        showMessage('No new problems available for this concept. Try another concept.');
    }
}

/**
 * Display the current problem
 * Updates UI with problem details
 */
function displayProblem(problem) {
    log('Displaying problem:', problem);
    
    // Update problem display
    const problemNumber = document.querySelector('.problem-number');
    const problemDifficulty = document.querySelector('.problem-difficulty');
    const problemText = document.getElementById('problem-text');
    const answerInput = document.getElementById('answer-input');
    const submitButton = document.getElementById('submit-answer');
    
    if (problemNumber) {
        problemNumber.textContent = `Problem #${ProblemState.problemIndex + 1}`;
    }
    
    if (problemDifficulty) {
        problemDifficulty.textContent = `Difficulty: ${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}`;
    }
    
    if (problemText) {
        problemText.textContent = problem.problem;
    }
    
    // Reset answer input
    if (answerInput) {
        answerInput.value = '';
        answerInput.disabled = false;
    }
    
    // Enable submit button
    if (submitButton) {
        submitButton.disabled = true;
    }
    
    // Hide explanation and evaluation sections
    const explanationSection = document.getElementById('explanation-section');
    const evaluationResults = document.getElementById('evaluation-results');
    
    if (explanationSection) {
        explanationSection.classList.add('hidden');
    }
    if (evaluationResults) {
        evaluationResults.classList.add('hidden');
    }
    
    // Update navigation buttons
    updateNavigationButtons();
}

/**
 * Handle answer submission
 * Validates answer and shows explanation section
 */
async function handleAnswerSubmit() {
    log('Handling answer submission');
    
    const answerInput = document.getElementById('answer-input');
    if (!answerInput || !answerInput.value.trim()) return;
    
    // Store answer
    ProblemState.currentAnswer = answerInput.value.trim();
    
    // Disable input and submit button
    answerInput.disabled = true;
    const submitButton = document.getElementById('submit-answer');
    if (submitButton) {
        submitButton.disabled = true;
    }
    
    // Show explanation section and enable input
    const explanationSection = document.getElementById('explanation-section');
    const explanationInput = document.getElementById('explanation-input');
    if (explanationSection) {
        explanationSection.classList.remove('hidden');
    }
    if (explanationInput) {
        explanationInput.disabled = false;
        explanationInput.focus();
    }
}

/**
 * Handle recording start/stop
 */
async function toggleRecording() {
    const recordButton = document.getElementById('record-button');
    if (!recordButton) return;

    try {
        if (!ProblemState.recording) {
            // Start recording with specific audio configuration
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000, // Changed to 16kHz for better compatibility
                    sampleSize: 16
                }
            });
            
            ProblemState.mediaRecorder = new MediaRecorder(stream);
            ProblemState.audioChunks = [];

            ProblemState.mediaRecorder.ondataavailable = (event) => {
                ProblemState.audioChunks.push(event.data);
            };

            ProblemState.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(ProblemState.audioChunks, { type: 'audio/webm' });
                
                // Convert to WAV format
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 16000 // Match the recording sample rate
                });
                
                const audioData = await audioBlob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(audioData);
                
                // Resample to 16kHz mono
                const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
                const source = offlineContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(offlineContext.destination);
                source.start();
                
                const resampled = await offlineContext.startRendering();
                const wavBlob = await audioBufferToWav(resampled);
                await processAudio(wavBlob);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            // Update UI
            recordButton.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            
            // Start recording
            ProblemState.mediaRecorder.start();
            ProblemState.recording = true;
            
            log('Started recording');
        } else {
            // Stop recording
            if (ProblemState.mediaRecorder && ProblemState.mediaRecorder.state !== 'inactive') {
                ProblemState.mediaRecorder.stop();
            }
            
            // Update UI
            recordButton.textContent = 'Record Explanation';
            recordButton.classList.remove('recording');
            recordButton.disabled = true;
            
            ProblemState.recording = false;
            log('Stopped recording');
        }
    } catch (error) {
        log('Error during recording:', error);
        showError('Failed to access microphone. Please check your permissions.');
        recordButton.disabled = true;
    }
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(buffer) {
    const length = buffer.length * 2; // 16-bit samples
    const view = new DataView(new ArrayBuffer(44 + length));

    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
    view.setUint16(20, 1, true); // audio format (1 for PCM)
    view.setUint16(22, 1, true); // num channels (1 for mono)
    view.setUint32(24, 16000, true); // sample rate
    view.setUint32(28, 16000 * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const data = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < data.length; i++, offset += 2) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

/**
 * Helper function to write strings to DataView
 */
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Process recorded audio
 * Converts speech to text and displays result
 */
async function processAudio(audioBlob) {
    log('Processing audio...');
    const explanationInput = document.getElementById('explanation-input');
    if (!explanationInput) return;

    try {
        // Create form data with audio blob
        const formData = new FormData();
        
        // Convert blob to base64 for reliable transfer
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(audioBlob);
        });
        
        const base64Audio = await base64Promise;
        
        // Create a new blob from the base64 data
        const base64Data = base64Audio.split(',')[1];
        const binaryData = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binaryData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i);
        }
        
        const processedBlob = new Blob([uint8Array], { type: 'audio/wav' });
        
        formData.append('audio', processedBlob, 'explanation.wav');
        formData.append('problem_id', ProblemState.currentProblem.id);
        formData.append('answer', ProblemState.currentAnswer);

        // Send to backend for processing
        const response = await fetch('/process_audio', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to process audio: ${errorText}`);
        }

        const result = await response.json();
        
        // Update explanation input and transcription
        explanationInput.value = result.transcription;
        explanationInput.dispatchEvent(new Event('input')); // Trigger input event to update UI
        
        log('Audio processed successfully');
    } catch (error) {
        log('Error processing audio:', error);
        showError('Failed to process audio. Please try again.');
        
        // Enable manual entry
        explanationInput.disabled = false;
        explanationInput.placeholder = 'Failed to transcribe audio. Please type your explanation here...';
    }
}

/**
 * Evaluate student's understanding
 * Sends answer and explanation to backend for evaluation
 */
async function evaluateUnderstanding() {
    log('Evaluating understanding...');
    const evaluateButton = document.getElementById('evaluate-button');
    const transcriptionText = document.getElementById('transcription-text');
    
    if (!evaluateButton || !transcriptionText || !ProblemState.currentProblem || !ProblemState.currentAnswer) {
        showError('Missing required information for evaluation');
        return;
    }
    
    try {
        evaluateButton.disabled = true;
        
        // Prepare evaluation data
        const evaluationData = {
            problem_id: ProblemState.currentProblem.id,
            answer: ProblemState.currentAnswer,
            explanation: transcriptionText.textContent,
            unit: DataState.currentUnit,
            class_id: DataState.currentClass,
            problems: DataState.problems,
            cmaps: DataState.cmaps,
            umaps: DataState.umaps
        };
        
        log('Sending evaluation data:', evaluationData);
        
        // Send to backend for evaluation
        const response = await fetch('/evaluate_understanding', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(evaluationData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to evaluate understanding');
        }
        
        const evaluation = await response.json();
        log('Received evaluation response:', evaluation);
        
        // Display evaluation results
        displayEvaluation(evaluation);
        
        // Create concept modifications from evaluation
        const modifications = {
            mastery_level: evaluation.score,
            score: evaluation.score,
            date_derived: new Date().toISOString(),
            strengths: evaluation.correct_concepts,
            weaknesses: evaluation.misconceptions
        };
        
        log('Created concept modifications:', modifications);
        
        // Update concept map with modifications
        await updateConceptMap(modifications);
        
        log('Evaluation complete');
    } catch (error) {
        log('Error during evaluation:', error);
        showError('Failed to evaluate understanding. Please try again.');
        evaluateButton.disabled = false;
    }
}

/**
 * Display evaluation results
 * Shows correct/incorrect statements and suggestions
 */
function displayEvaluation(evaluation) {
    log('Displaying evaluation:', evaluation);
    const evaluationSection = document.getElementById('evaluation-results');
    if (!evaluationSection) return;
    
    // Remove hidden class to show the evaluation section
    evaluationSection.classList.remove('hidden');
    
    // Create evaluation display
    const content = document.createElement('div');
    content.className = 'evaluation-content';
    
    // Add understanding score
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'evaluation-score';
    scoreDiv.innerHTML = `
        <h3>Understanding Score</h3>
        <div class="score-circle ${getScoreClass(evaluation.score)}">
            ${Math.round(evaluation.score * 100)}%
        </div>
    `;
    content.appendChild(scoreDiv);
    
    // Add correct concepts
    if (evaluation.correct_concepts && evaluation.correct_concepts.length > 0) {
        const correctList = document.createElement('div');
        correctList.className = 'evaluation-section correct';
        correctList.innerHTML = `
            <h3>✓ Correct Understanding</h3>
            <ul>
                ${evaluation.correct_concepts.map(concept => `<li>${concept}</li>`).join('')}
            </ul>
        `;
        content.appendChild(correctList);
    }
    
    // Add misconceptions
    if (evaluation.misconceptions && evaluation.misconceptions.length > 0) {
        const misconceptionsList = document.createElement('div');
        misconceptionsList.className = 'evaluation-section incorrect';
        misconceptionsList.innerHTML = `
            <h3>✗ Areas for Improvement</h3>
            <ul>
                ${evaluation.misconceptions.map(concept => `<li>${concept}</li>`).join('')}
            </ul>
        `;
        content.appendChild(misconceptionsList);
    }
    
    // Add suggestions
    if (evaluation.suggestions && evaluation.suggestions.length > 0) {
        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'evaluation-section suggestions';
        suggestionsList.innerHTML = `
            <h3>💡 Suggestions</h3>
            <ul>
                ${evaluation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
        `;
        content.appendChild(suggestionsList);
    }
    
    // Clear previous content and add new evaluation
    evaluationSection.innerHTML = '';
    evaluationSection.appendChild(content);
    
    // Show next problem button if available
    const nextButton = document.getElementById('next-problem');
    if (nextButton) {
        nextButton.disabled = false;
    }
    
    // Scroll to evaluation results
    evaluationSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Update concept map based on evaluation
 * Modifies UMaps data with new understanding
 */
async function updateConceptMap(modifications) {
    log('Updating concept map with:', modifications);
    try {
        // Get current UMaps data
        const currentUmap = DataState.umaps.find(u => 
            u.unit === DataState.currentUnit && 
            parseInt(u.classID) === parseInt(DataState.currentClass)
        );
        
        if (!currentUmap) {
            log('No UMap found for current unit/class');
            return;
        }
        
        // Update node progress
        const nodeId = UI.currentNode.id.toString();
        log('Updating node:', nodeId);
        
        // Initialize node progress if it doesn't exist
        if (!currentUmap.node_progress) {
            currentUmap.node_progress = {};
        }
        if (!currentUmap.node_progress[nodeId]) {
            currentUmap.node_progress[nodeId] = {};
        }
        
        const nodeProgress = currentUmap.node_progress[nodeId];
        
        // Log current state
        log('Current node progress:', nodeProgress);
        log('Current node mastery level:', nodeProgress.mastery_level);
        
        // Update progress data
        nodeProgress.mastery_level = modifications.mastery_level;
        nodeProgress.last_evaluation = new Date().toISOString();
        nodeProgress.date_derived = modifications.date_derived;
        nodeProgress.evaluation_history = [
            ...(nodeProgress.evaluation_history || []),
            {
                date: new Date().toISOString(),
                score: modifications.score,
                problem_id: ProblemState.currentProblem.id,
                strengths: modifications.strengths,
                weaknesses: modifications.weaknesses
            }
        ];
        
        log('Updated node progress:', nodeProgress);
        
        // Update UMaps in DataState
        DataState.umaps = DataState.umaps.map(umap => 
            umap.unit === currentUmap.unit && 
            parseInt(umap.classID) === parseInt(currentUmap.classID) ? 
            currentUmap : umap
        );
        
        // Update UMaps in backend
        await fetchRequest('/update_data', {
            sheet: 'UMaps',
            row_name: 'id',
            row_value: currentUmap.id,
            data: currentUmap
        });
        
        // Update node styling
        const node = UI.nodes.get(nodeId);
        if (node) {
            log('Current node status:', node.status);
            const newStatus = modifications.mastery_level >= 0.8 ? 'completed' : 'in_progress';
            log('New node status:', newStatus);
            
            const updatedNode = {
                ...node,
                status: newStatus,
                color: getNodeColor(newStatus, modifications.mastery_level),
                borderColor: getBorderColor(newStatus),
                title: generateNodeTooltip(node, nodeProgress)
            };
            
            log('Updating node with:', updatedNode);
            UI.nodes.update(updatedNode);
            log('Node update complete');
            
            // Force a redraw of the network
            UI.network.redraw();
        } else {
            log('Error: Node not found in network:', nodeId);
        }
        
        // Update progress stats
        updateProgressStats({
            problems: DataState.problems,
            umaps: DataState.umaps
        });
        
        log('Concept map update complete');
    } catch (error) {
        log('Error updating concept map:', error);
        showError('Failed to update progress. Your explanation was recorded but progress may not be reflected.');
    }
}

/**
 * Get CSS class for score display
 */
function getScoreClass(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'needs-work';
}

/**
 * Navigate to next/previous problem
 * Updates problem display and state
 */
function navigateProblem(direction) {
    log('Navigating problem:', direction);
    
    const newIndex = direction === 'next' ? 
        ProblemState.problemIndex + 1 : 
        ProblemState.problemIndex - 1;
    
    if (newIndex >= 0 && newIndex < ProblemState.problems.length) {
        ProblemState.problemIndex = newIndex;
        ProblemState.currentProblem = ProblemState.problems[newIndex];
        displayProblem(ProblemState.currentProblem);
    }
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');
    
    if (prevButton) {
        prevButton.disabled = ProblemState.problemIndex === 0;
    }
    
    if (nextButton) {
        nextButton.disabled = ProblemState.problemIndex === ProblemState.problems.length - 1;
    }
}

/**
 * Generate tooltip content for node
 */
function generateNodeTooltip(node, progress) {
    const mastery = progress.mastery_level || 0;
    const lastPractice = progress.last_practice ? new Date(progress.last_practice) : null;
    
    let tooltip = `${node.label}\n\n`;
    tooltip += `Mastery Level: ${(mastery * 100).toFixed(1)}%\n`;
        
    if (lastPractice) {
        tooltip += `Last Practice: ${lastPractice.toLocaleDateString()}\n`;
    }
    
    if (progress.evaluation_history?.length > 0) {
        const recentStrengths = progress.evaluation_history[progress.evaluation_history.length - 1].strengths;
        const recentWeaknesses = progress.evaluation_history[progress.evaluation_history.length - 1].weaknesses;
        
        if (recentStrengths?.length > 0) {
            tooltip += `\nStrengths:\n${recentStrengths.join('\n')}\n`;
        }
        if (recentWeaknesses?.length > 0) {
            tooltip += `\nAreas for Improvement:\n${recentWeaknesses.join('\n')}\n`;
        }
    }
    
    if (progress.achievements?.length > 0) {
        const activeAchievements = progress.achievements.filter(a => a.active);
        if (activeAchievements.length > 0) {
            tooltip += `\nAchievements:\n${activeAchievements.map(a => a.type).join('\n')}`;
        }
    }
    
    return tooltip;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded, initializing...');
    
    // Initialize network
    initNetwork();
    
    // Add event listeners
    const submitButton = document.getElementById('submit-answer');
    const recordButton = document.getElementById('record-button');
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');
    const answerInput = document.getElementById('answer-input');
    const evaluateButton = document.getElementById('evaluate-button');

    if (submitButton) submitButton.addEventListener('click', handleAnswerSubmit);
    if (recordButton) recordButton.addEventListener('click', toggleRecording);
    if (prevButton) prevButton.addEventListener('click', () => navigateProblem('prev'));
    if (nextButton) nextButton.addEventListener('click', () => navigateProblem('next'));
    if (evaluateButton) evaluateButton.addEventListener('click', evaluateUnderstanding);
    
    // Enable submit button when answer is entered
    if (answerInput) {
        answerInput.addEventListener('input', function() {
            if (submitButton) {
                submitButton.disabled = !this.value.trim();
            }
        });
    }

    // Add map control event listeners
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

    // Add recording styles
    const style = document.createElement('style');
    style.textContent = `
        .recording {
            background-color: #ff4444 !important;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Add event listener for explanation input
    const explanationInput = document.getElementById('explanation-input');
    if (explanationInput) {
        explanationInput.addEventListener('input', function() {
            const transcriptionSection = document.getElementById('transcription');
            const transcriptionText = document.getElementById('transcription-text');
            const evaluateButton = document.getElementById('evaluate-button');
            
            if (this.value.trim()) {
                transcriptionSection.classList.remove('hidden');
                transcriptionText.textContent = this.value.trim();
                evaluateButton.disabled = false;
            } else {
                transcriptionSection.classList.add('hidden');
                evaluateButton.disabled = true;
            }
        });
    }

    log('Initialization complete');
});
