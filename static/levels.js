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

        if (Object.keys(umap).length === 0) {
            log('Warning: No node progress data found in UMaps');
        }

        // Add nodes with styling based on UMaps data
        const styledNodes = unitData.cmap.nodes.map(node => {
            const nodeId = node.id.toString(); // Ensure string comparison
            const nodeProgress = umap[nodeId] || {};
            log(`Node ${nodeId} progress:`, nodeProgress);
            
            // Determine status based on derivation status only
            const status = nodeProgress.date_derived ? 'completed' : 'pending';
            log(`Node ${nodeId} status: ${status}, date_derived: ${nodeProgress.date_derived}`);
            
            const nodeData = {
                id: nodeId,
                label: node.label,
                status: status,
                color: getNodeColor(status),
                borderWidth: 2,
                borderColor: getBorderColor(status),
                widthConstraint: {
                    minimum: 120,
                    maximum: 200
                },
                margin: 10,
                shape: 'box',
                font: {
                    size: 16,
                    color: '#fff'
                },
                title: `${node.label}\n${status === 'completed' ? 
                    `Derived on: ${nodeProgress.date_derived}` : 
                    'Not yet derived'}`,
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
    const completedNodeIds = nodes
        .filter(node => node.status === 'completed')
        .map(node => node.id);

    // Find nodes where all prerequisites are completed
    const availableNodes = nodes.filter(node => {
        // Skip if already completed
        if (node.status !== 'pending') return false;

        // Check if all prerequisites are completed
        return !node.prerequisites || 
               node.prerequisites.length === 0 || 
               node.prerequisites.every(prereq => completedNodeIds.includes(prereq));
    });

    // Return first node that has problems, or first available if none found
    return findNextConceptWithProblems(availableNodes.map(n => n.id)) || availableNodes[0];
}

/**
 * Find the next concept that has problems
 */
function findNextConceptWithProblems(excludeNodeIds = []) {
    const nodes = UI.nodes.get();
    const completedNodeIds = nodes
        .filter(node => node.status === 'completed')
        .map(node => node.id);

    // Find nodes where all prerequisites are completed
    return nodes.find(node => {
        // Skip if already checked or completed
        if (excludeNodeIds.includes(node.id) || node.status !== 'pending') return false;

        // // Check if all prerequisites are completed
        // const prereqsCompleted = !node.prerequisites || 
        //     node.prerequisites.length === 0 || 
        //     node.prerequisites.every(prereq => completedNodeIds.includes(prereq));

        // if (!prereqsCompleted) return false;

        // Check if node has problems
        return DataState.problems.some(p => 
            p.concepts && Array.isArray(p.concepts) && p.concepts.includes(node.id.toString())
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
 * Get node color based on status
 */
function getNodeColor(status) {
    switch (status) {
        case 'completed':
            return '#2196F3';  // Mastered
        case 'in_progress':
            return '#4CAF50';  // Derived
        case 'pending':
            return '#FFA500';  // Not Started
        default:
            return '#999';
    }
}

/**
 * Get border color based on status
 */
function getBorderColor(status) {
    switch (status) {
        case 'completed':
            return '#1976D2';  // Mastered
        case 'in_progress':
            return '#388E3C';  // Derived
        case 'pending':
            return '#F57C00';  // Not Started
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
    
    // Sort by difficulty
    conceptProblems.sort((a, b) => {
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
    
    log('Found problems:', conceptProblems);
    
    // Store in problem state
    ProblemState.problems = conceptProblems;
    ProblemState.problemIndex = 0;
    ProblemState.currentProblem = conceptProblems[0] || null;
    
    // Display first problem
    if (ProblemState.currentProblem) {
        displayProblem(ProblemState.currentProblem);
    } else {
        showMessage('No problems available for this concept.');
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
    
    // Show explanation section
    const explanationSection = document.getElementById('explanation-section');
    if (explanationSection) {
        explanationSection.classList.remove('hidden');
    }
    
    // Enable recording button
    const recordButton = document.getElementById('record-button');
    if (recordButton) {
        recordButton.disabled = false;
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
    const explanationText = document.getElementById('answer-input');
    if (!explanationText) return;

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

        // Log FormData contents
        for (let [key, value] of formData.entries()) {
            log('FormData:', key, value instanceof Blob ? 'Blob data' : value);
        }

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
        
        // Display transcription
        explanationText.value = result.transcription;
        explanationText.disabled = false;
        
        // Enable evaluation button
        const evaluateButton = document.getElementById('evaluate-button');
        if (evaluateButton) {
            evaluateButton.disabled = false;
        }

        // Display transcription
        const transcriptionSection = document.getElementById('transcription');
        const transcriptionText = document.getElementById('transcription-text');
        if (transcriptionSection && transcriptionText) {
            transcriptionSection.classList.remove('hidden');
            transcriptionText.textContent = result.transcription;
        }

        log('Audio processed successfully');
    } catch (error) {
        log('Error processing audio:', error);
        showError('Failed to process audio. Please try again.');
        
        // Enable manual entry
        explanationText.disabled = false;
        explanationText.placeholder = 'Failed to transcribe audio. Please type your explanation here...';
    }
}

/**
 * Evaluate user's answer and explanation
 * Analyzes understanding and suggests improvements
 */
async function evaluateResponse() {
    log('Evaluating response...');
    const explanationText = document.getElementById('answer-input');
    const evaluationSection = document.getElementById('evaluation-results');
    
    if (!explanationText || !evaluationSection) return;
    
    try {
        // Show loading state
        evaluationSection.classList.remove('hidden');
        evaluationSection.innerHTML = '<div class="loading">Evaluating your response...</div>';
        
        // Prepare evaluation data
        const evaluationData = {
            problem_id: ProblemState.currentProblem.id,
            answer: ProblemState.currentAnswer,
            explanation: explanationText.value,
            unit: DataState.currentUnit,
            class_id: DataState.currentClass
        };
        
        // Send to backend for evaluation
        const response = await fetchRequest('/evaluate-answer', {
            method: 'POST',
            body: evaluationData
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to evaluate response');
        }
        
        // Display evaluation results
        displayEvaluation(response);
        
        // Update concept map if mastery achieved
        if (response.mastery) {
            await updateConceptMap(response.modifications);
        }
        
    } catch (error) {
        log('Error evaluating response:', error);
        showError('Failed to evaluate response. Please try again.');
        evaluationSection.classList.add('hidden');
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
        const nodeProgress = currentUmap.node_progress[nodeId] || {};
        
        // Update progress data
        nodeProgress.mastery_level = modifications.mastery_level;
        nodeProgress.last_evaluation = new Date().toISOString();
        nodeProgress.evaluation_history = [
            ...(nodeProgress.evaluation_history || []),
            {
                date: new Date().toISOString(),
                score: modifications.score,
                problem_id: ProblemState.currentProblem.id
            }
        ];
        
        // Update UMaps in backend
        await fetchRequest('/update_data', {
            method: 'POST',
            body: {
                sheet: 'UMaps',
                row_name: 'OSIS',
                row_value: currentUmap.OSIS,
                data: currentUmap
            }
        });
        
        // Update node styling
        const node = UI.nodes.get(nodeId);
        if (node) {
            node.status = modifications.mastery_level >= 0.8 ? 'completed' : 'in_progress';
            node.color = getNodeColor(node.status);
            node.borderColor = getBorderColor(node.status);
            UI.nodes.update(node);
        }
        
        // Update progress stats
        updateProgressStats({
            problems: DataState.problems,
            umaps: DataState.umaps
        });
        
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

    if (submitButton) submitButton.addEventListener('click', handleAnswerSubmit);
    if (recordButton) recordButton.addEventListener('click', toggleRecording);
    if (prevButton) prevButton.addEventListener('click', () => navigateProblem('prev'));
    if (nextButton) nextButton.addEventListener('click', () => navigateProblem('next'));
    
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

    log('Initialization complete');
});
