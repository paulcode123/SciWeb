// Add at the start of the file
const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[Derive]', ...args);
    }
}

// Global UI elements container
const UI = {
    network: null,
    nodes: null,
    edges: null,
    sendButton: null,
    userInput: null,
    currentNode: null,
    currentMap: null,
    youtubePlayer: null,
    reinforcementPanel: null
};

// Network configuration (same as maps.js)
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
            bindToWindow: false  // Only enable keyboard controls when network is focused
        }
    },
    layout: {
        randomSeed: 2,
        improvedLayout: true,
        hierarchical: false
    }
};

/**
 * Initialize the network visualization
 * Sets up the vis.js network with initial empty data
 * Adds event listeners for node clicks
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

    // Load initial units
    await loadUnits();
}

/**
 * Load available units from the backend
 * Populates the unit select dropdown
 * Sets up event listener for unit selection
 */
async function loadUnits() {
    log('Loading units');
    try {
        const response = await fetchRequest('/data', { data: 'Classes, CMaps' });
        log('Received response:', response);
        
        const unitSelect = document.getElementById('unit-select');
        if (!unitSelect) {
            log('Error: unit-select not found');
            return;
        }
        if (!response.CMaps) {
            log('Error: No CMaps data in response');
            return;
        }

        // Clear existing options
        unitSelect.innerHTML = '<option value="">Select a Unit</option>';

        // Get unique units from CMaps
        const units = [...new Set(response.CMaps.map(map => map.unit))];
        log('Available units:', units);

        // Add units to dropdown
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitSelect.appendChild(option);
        });

        // Add change event listener
        unitSelect.addEventListener('change', async function() {
            if (this.value) {
                log('Unit selected:', this.value);
                const mapData = response.CMaps.find(map => map.unit === this.value);
                if (mapData) {
                    log('Found map data:', mapData);
                    loadConceptMap(mapData);
                } else {
                    log('Error: No map data found for unit:', this.value);
                }
            }
        });
    } catch (error) {
        log('Error loading units:', error);
        addMessage('system', 'Failed to load units. Please try again.');
    }
}

/**
 * Load concept map for the selected unit
 * Creates nodes and edges based on prerequisites
 * Applies styling based on completion status
 */
async function loadConceptMap(mapData) {
    log('Loading concept map:', mapData);
    if (!mapData || !mapData.nodes) {
        log('Error: Invalid map data');
        return;
    }

    // Store current map data
    UI.currentMap = mapData;

    // Clear existing data
    UI.nodes.clear();
    UI.edges.clear();
    log('Cleared existing network data');

    try {
        // Fetch UMaps data for this unit
        const response = await fetchRequest('/data', { 
            data: 'Classes, UMaps'
        });
        log('Received UMaps data:', response);

        // Find the UMap entry for the current unit and classID
        const currentUMap = response.UMaps?.find(umap => 
            umap.unit === mapData.unit && 
            umap.classID === mapData.classID
        );
        const umap = currentUMap?.node_progress || {};

        // Add nodes with styling
        const nodes = mapData.nodes.map(node => {
            const nodeProgress = umap[node.id] || {};
            const status = nodeProgress.date_derived ? 'completed' : 'pending';
            
            const nodeData = {
                id: node.id,
                label: node.label,
                title: node.description,
                status: status,
                color: getNodeColor(status),
                borderWidth: 2,
                borderColor: getBorderColor(status),
                font: { color: '#fff' },
                prerequisites: node.prerequisites || [],
                starter_prompt: node.starter_prompt,
                chat_history: nodeProgress.chat_history || [],
                widthConstraint: {
                    minimum: 120,
                    maximum: 200
                },
                margin: 10,
                shape: 'box'
            };

            // Apply saved position if available
            if (mapData.structure?.nodes?.[node.id]) {
                nodeData.x = mapData.structure.nodes[node.id].x;
                nodeData.y = mapData.structure.nodes[node.id].y;
            }

            return nodeData;
        });
        log('Created nodes:', nodes);

        // Create edges from prerequisites
        const edges = [];
        nodes.forEach(node => {
            if (node.prerequisites && node.prerequisites.length > 0) {
                node.prerequisites.forEach(prereqId => {
                    edges.push({
                        from: prereqId,
                        to: node.id,
                        length: 200,
                        arrows: 'to',
                        color: { 
                            color: 'rgba(255, 255, 255, 0.5)',
                            highlight: '#3498db'
                        },
                        width: 2
                    });
                });
            }
        });
        log('Created edges:', edges);

        // Add nodes and edges with physics disabled initially
        UI.network.setOptions({ physics: { enabled: false } });
        UI.nodes.add(nodes);
        UI.edges.add(edges);

        // Enable physics briefly for layout only if no structure exists
        if (!mapData.structure?.nodes) {
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

        // Find first incomplete node with completed prerequisites
        const nextNode = findNextConcept();
        if (nextNode) {
            log('Found next node to derive:', nextNode);
            startDerivation(nextNode);
        } else {
            log('No available nodes to derive');
            addMessage('system', 'All concepts have been derived! You can click on any node to review it.');
        }

        // Fit the network to view
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

    } catch (error) {
        log('Error loading UMaps data:', error);
        addMessage('system', 'Failed to load previous progress. Starting fresh.');
        
        // Fallback to basic initialization with physics disabled
        const nodes = mapData.nodes.map(node => ({
            id: node.id,
            label: node.label,
            title: node.description,
            status: 'pending',
            color: getNodeColor('pending'),
            borderWidth: 2,
            borderColor: getBorderColor('pending'),
            font: { color: '#fff' },
            prerequisites: node.prerequisites || [],
            starter_prompt: node.starter_prompt,
            chat_history: [],
            widthConstraint: {
                minimum: 120,
                maximum: 200
            },
            margin: 10,
            shape: 'box'
        }));

        UI.nodes.add(nodes);
        UI.edges.add(edges);

        // Find root node (node with no prerequisites)
        const rootNode = nodes.find(node => !node.prerequisites || node.prerequisites.length === 0);
        if (rootNode) {
            log('Found root node:', rootNode);
            startDerivation(rootNode);
        }

        UI.network.fit();
    }
}

/**
 * Handle node selection in the concept map
 * Updates current node
 * Triggers conversation for deriving the concept
 */
async function selectNode(nodeId) {
    const node = UI.nodes.get(nodeId);
    if (!node) return;

    // Check if all prerequisites are completed
    const prerequisites = node.prerequisites || [];
    const completedPrereqs = prerequisites.every(prereqId => {
        const prereqNode = UI.nodes.get(prereqId);
        return prereqNode && prereqNode.status === 'completed';
    });

    if (!completedPrereqs) {
        addMessage('system', 'Please complete the prerequisite concepts first.');
        // Highlight prerequisites
        prerequisites.forEach(prereqId => {
            const prereqNode = UI.nodes.get(prereqId);
            if (prereqNode && prereqNode.status !== 'completed') {
                UI.network.selectNodes([prereqId], true);
            }
        });
        return;
    }

    // If node is already completed, show review message
    if (node.status === 'completed') {
        addMessage('system', 'You have already derived this concept. Would you like to review it?');
        return;
    }

    // Start derivation for this concept
    startDerivation(node);
}

/**
 * Start a new derivation conversation
 * Sends initial message based on the selected concept
 * Sets up the chat context
 */
function startDerivation(concept) {
    log('Starting derivation for concept:', concept);
    
    // Clear previous messages
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    // If there's existing chat history, load it
    if (concept.chat_history && concept.chat_history.length > 0) {
        log('Loading existing chat history:', concept.chat_history);
        concept.chat_history.forEach(msg => {
            addMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
        });
        addMessage('system', 'Previous conversation loaded. You can continue from where you left off.');
    } else {
        // Add system message with starter prompt if available
        if (concept.starter_prompt) {
            log('Using starter prompt:', concept.starter_prompt);
            addMessage('system', concept.starter_prompt);
        } else {
            log('No starter prompt, using default');
            addMessage('system', `Let's derive the concept of ${concept.label}. I'll guide you through the historical development and reasoning behind this concept.`);
        }
    }
    
    // Update current node
    UI.currentNode = concept;
    
    // Update node status to in_progress if not already completed
    if (concept.status !== 'completed') {
        updateNodeStatus(concept.id, 'in_progress');
    }
}

/**
 * Initialize UI elements
 * Gets references to DOM elements
 * Sets up initial state
 */
function initializeUIElements() {
    log('Initializing UI elements');
    UI.sendButton = document.getElementById('send-message');
    UI.userInput = document.getElementById('derive-user-input');
    
    if (!UI.sendButton) {
        log('Error: send-message button not found');
    }
    if (!UI.userInput) {
        log('Error: derive-user-input textarea not found');
    }
    
    log('UI elements initialized:', {
        sendButton: !!UI.sendButton,
        userInput: !!UI.userInput,
        inputValue: UI.userInput?.value
    });

    // Initialize YouTube player
    initYouTubePlayer();
}

/**
 * Setup event listeners
 * Adds listeners for buttons and inputs
 * Sets up map controls
 */
function setupEventListeners() {
    log('Setting up event listeners');
    
    // Chat event listeners
    if (UI.sendButton && UI.userInput) {
        UI.sendButton.addEventListener('click', () => {
            log('Send button clicked');
            sendMessage();
        });
        
        UI.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                log('Enter key pressed');
                e.preventDefault();
                sendMessage();
            }
        });

        // Disable network keyboard controls when input is focused
        UI.userInput.addEventListener('focus', () => {
            if (UI.network) {
                UI.network.setOptions({
                    interaction: {
                        keyboard: {
                            enabled: false
                        }
                    }
                });
            }
        });

        // Re-enable network keyboard controls when input loses focus
        UI.userInput.addEventListener('blur', () => {
            if (UI.network) {
                UI.network.setOptions({
                    interaction: {
                        keyboard: {
                            enabled: true,
                            bindToWindow: false
                        }
                    }
                });
            }
        });

        log('Chat event listeners added');
    } else {
        log('Error: Could not add chat event listeners', {
            sendButton: !!UI.sendButton,
            userInput: !!UI.userInput
        });
    }

    // Map control event listeners
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const resetView = document.getElementById('reset-view');

    if (zoomIn && zoomOut && resetView) {
        zoomIn.addEventListener('click', () => {
            if (UI.network) {
                UI.network.moveTo({
                    scale: UI.network.getScale() * 1.2
                });
            }
        });

        zoomOut.addEventListener('click', () => {
            if (UI.network) {
                UI.network.moveTo({
                    scale: UI.network.getScale() / 1.2
                });
            }
        });

        resetView.addEventListener('click', () => {
            if (UI.network) {
                UI.network.fit();
            }
        });
        log('Map control event listeners added');
    } else {
        log('Error: Could not add map control event listeners');
    }
}

/**
 * Show typing indicator in chat
 * Displays bouncing dots animation
 */
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator message ai-message';
    typingIndicator.innerHTML = `
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Remove typing indicator from chat
 */
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

/**
 * Add a message to the chat UI with animation
 * Supports user, AI, and system message types
 */
function addMessage(type, text) {
    const chatMessages = document.getElementById('chat-messages');
    const message = document.createElement('div');
    message.className = `message ${type}-message`;
    message.style.opacity = '0';
    message.style.transform = 'translateY(20px)';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    message.appendChild(content);
    
    chatMessages.appendChild(message);
    
    // Trigger animation
    requestAnimationFrame(() => {
        message.style.opacity = '1';
        message.style.transform = 'translateY(0)';
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
}

/**
 * Celebrate concept derivation
 * Adds visual feedback when a concept is derived
 */
function celebrateDerivation(nodeId) {
    // Flash the derived node using color animation
    const node = UI.nodes.get(nodeId);
    if (!node) return;
    
    // Store original color
    const originalColor = node.color;
    
    // Flash animation using color updates
    UI.nodes.update({
        id: nodeId,
        color: {
            background: '#FFFFFF',
            border: '#FFFFFF'
        }
    });
    
    // Reset color after flash
    setTimeout(() => {
        UI.nodes.update({
            id: nodeId,
            color: originalColor
        });
    }, 500);
    
    // Show celebration message
    const celebration = document.createElement('div');
    celebration.className = 'celebration-message';
    celebration.textContent = 'Concept Derived! 🎉';
    document.body.appendChild(celebration);
    
    // Create confetti
    createConfetti();
    
    // Remove celebration message after animation
    setTimeout(() => celebration.remove(), 2000);

    // Add reinforce button after celebration
    setTimeout(() => {
        const message = document.createElement('div');
        message.className = 'message system';
        const button = document.createElement('button');
        button.className = 'reinforce-btn';
        button.innerHTML = '<span class="material-icons">school</span> Reinforce Concept';
        button.onclick = () => showReinforcementPanel(nodeId);
        message.appendChild(button);
        document.getElementById('chat-messages').appendChild(message);
    }, 2000);
}

function createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
        document.body.appendChild(confetti);
        
        // Remove confetti after animation
        confetti.addEventListener('animationend', () => confetti.remove());
    }
}

/**
 * Send a message in the chat
 * Handles both user messages and AI responses
 * Updates the chat UI
 */
async function sendMessage() {
    log('sendMessage called');

    // Always re-fetch the input element to ensure we have the latest
    UI.userInput = document.getElementById('derive-user-input');
    
    if (!UI.userInput) {
        log('Error: Could not find derive-user-input element');
        return;
    }

    const message = UI.userInput.value.trim();
    log('Message value:', message);

    if (!message) {
        log('No message to send - empty message');
        return;
    }

    if (!UI.currentNode) {
        log('No current node selected');
        return;
    }

    // Clear input before sending to prevent double sends
    UI.userInput.value = '';
    log('Sending message:', message);

    // Add user message to chat with animation
    const userMessage = addMessage('user', message);
    
    // Show typing indicator
    showTypingIndicator();

    try {
        // Get all messages from chat
        const chatMessages = Array.from(document.getElementById('chat-messages').children)
            .map(msg => ({
                role: msg.classList.contains('user-message') ? 'user' : 'assistant',
                content: msg.querySelector('.message-content')?.textContent || msg.textContent
            }));
        log('Chat history:', chatMessages);

        // Get completed prerequisites
        const completedNodes = Array.from(UI.nodes.get())
            .filter(node => node.status === 'completed')
            .map(node => node.label);
        log('Completed prerequisites:', completedNodes);

        // Get existing UMaps data
        const umapsResponse = await fetchRequest('/data', {data: 'Classes, UMaps'});
        // filter for the current unit and classID
        const existingUmap = umapsResponse.UMaps?.filter(umap => umap.unit === UI.currentMap.unit && umap.classID === UI.currentMap.classID)?.[0] || null;

        // Send to backend
        const requestData = {
            concept: {
                id: UI.currentNode.id,
                label: UI.currentNode.label,
                description: UI.currentNode.title
            },
            message: message,
            chat_history: chatMessages,
            prerequisites_completed: completedNodes,
            classID: UI.currentMap.classID,
            unit: UI.currentMap.unit,
            existing_umap: existingUmap  // Pass the existing UMaps data
        };
        log('Sending request to backend:', requestData);
        
        const response = await fetchRequest('/derive-conversation', requestData);
        log('Received response:', response);

        if (response.error) {
            throw new Error(response.error);
        }

        // Remove typing indicator before showing AI response
        removeTypingIndicator();
        
        // Add AI response with animation
        if (typeof response.message === 'string') {
            const aiMessage = addMessage('ai', response.message);
            
            if (response.derived) {
                log('Concept derived successfully');
                updateNodeStatus(UI.currentNode.id, 'completed');
                celebrateDerivation(UI.currentNode.id);
                
                // Add a "Continue to Next Concept" button instead of automatically moving on
                setTimeout(() => {
                    const continueMessage = document.createElement('div');
                    continueMessage.className = 'message system';
                    const continueButton = document.createElement('button');
                    continueButton.className = 'continue-btn';
                    continueButton.innerHTML = '<span class="material-icons">arrow_forward</span> Continue to Next Concept';
                    continueButton.onclick = () => {
                        const nextConcept = findNextConcept();
                        if (nextConcept) {
                            log('Moving to next concept:', nextConcept);
                            addMessage('system', "Let's move on to the next concept.");
                            startDerivation(nextConcept);
                        } else {
                            log('All concepts completed');
                            addMessage('system', "Congratulations! You've derived all the concepts in this unit!");
                        }
                    };
                    continueMessage.appendChild(continueButton);
                    document.getElementById('chat-messages').appendChild(continueMessage);
                }, 3000); // Add continue button after celebration
            }
        } else {
            log('Error: Invalid response message format:', response.message);
            addMessage('system', 'Sorry, there was an error processing the response.');
        }

        // Update progress
        updateProgress();

    } catch (error) {
        // Remove typing indicator on error
        removeTypingIndicator();
        log('Error in sendMessage:', error);
        addMessage('system', 'Sorry, there was an error processing your message.');
    }
}

/**
 * Find the next concept to derive
 * Returns the next concept with completed prerequisites
 */
function findNextConcept() {
    if (!UI.currentMap || !UI.currentMap.nodes) return null;

    const nodes = UI.nodes.get();
    const completedNodeIds = nodes
        .filter(node => node.status === 'completed')
        .map(node => node.id);

    // Find nodes where all prerequisites are completed
    return nodes.find(node => {
        // Skip if already completed or in progress
        if (node.status !== 'pending') return false;

        // Check if all prerequisites are completed
        return !node.prerequisites || 
               node.prerequisites.length === 0 || 
               node.prerequisites.every(prereq => completedNodeIds.includes(prereq));
    });
}

/**
 * Update progress statistics
 * Calculates and displays completion metrics
 * Updates time spent studying
 */
function updateProgress() {
    const nodes = UI.nodes.get();
    const totalNodes = nodes.length;
    const completedNodes = nodes.filter(node => node.status === 'completed').length;

    // Update progress stats
    document.querySelector('.stat-value').textContent = `${completedNodes}/${totalNodes}`;

    // Calculate time spent (simplified version)
    const startTime = UI.startTime || new Date();
    const timeSpent = Math.floor((new Date() - startTime) / (1000 * 60)); // in minutes
    document.querySelectorAll('.stat-value')[1].textContent = 
        `${Math.floor(timeSpent/60)}h ${timeSpent%60}m`;
}

/**
 * Update node status in the concept map
 * Changes colors and styles based on derivation progress
 * Updates progress statistics
 */
function updateNodeStatus(nodeId, status) {
    const node = UI.nodes.get(nodeId);
    if (!node) return;

    // Update node styling
    const updates = {
        id: nodeId,
        status: status,
        color: getNodeColor(status),
        borderColor: getBorderColor(status)
    };

    UI.nodes.update(updates);

    // Update progress statistics
    updateProgress();
}

/**
 * Get node color based on status
 * Returns appropriate colors for different node states
 */
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

/**
 * Get border color based on status
 * Returns appropriate border colors for different node states
 */
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

/**
 * Initialize YouTube player
 * Creates a YouTube player instance for the reinforcement panel
 */
function initYouTubePlayer() {
    log('Initializing YouTube player');
    
    // If YouTube API isn't ready yet, wait for it
    if (!window.youtubeAPIReady) {
        log('YouTube API not ready yet, will initialize when ready');
        return;
    }
    
    try {
        // Check if player container exists
        const playerContainer = document.getElementById('youtube-player');
        if (!playerContainer) {
            log('Error: youtube-player container not found');
            return;
        }

        // If player already exists, destroy it first
        if (UI.youtubePlayer) {
            log('Destroying existing YouTube player');
            UI.youtubePlayer.destroy();
            UI.youtubePlayer = null;
        }
        
        log('Creating new YouTube player');
        UI.youtubePlayer = new YT.Player('youtube-player', {
            height: '360',
            width: '640',
            videoId: '',
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                fs: 1,
                playsinline: 1
            },
            events: {
                onReady: (event) => {
                    log('YouTube player ready');
                },
                onError: (e) => {
                    log('YouTube player error:', e.data);
                    const errorMessages = {
                        2: 'Invalid video ID',
                        5: 'HTML5 player error',
                        100: 'Video not found',
                        101: 'Video cannot be played in embedded players',
                        150: 'Video cannot be played in embedded players'
                    };
                    const errorMessage = errorMessages[e.data] || 'An error occurred playing the video';
                    addMessage('system', `Sorry, there was an error playing the video: ${errorMessage}`);
                },
                onStateChange: (event) => {
                    log('YouTube player state changed:', event.data);
                }
            }
        });
        
    } catch (error) {
        log('Error initializing YouTube player:', error);
        addMessage('system', 'Sorry, there was an error initializing the video player.');
    }
}

// Make initYouTubePlayer available globally for the YouTube API callback
window.initYouTubePlayer = initYouTubePlayer;

/**
 * Format explanation text with proper styling
 * Handles LaTeX equations, newlines, and other formatting
 */
function formatExplanation(text) {
    if (!text) return '';
    
    // First replace newlines
    text = text.replace(/\\n/g, '<br>');
    text = text.replace(/\n/g, '<br>');
    
    // Replace display-style LaTeX equations first (they can contain inline delimiters)
    text = text.replace(/\\\[(.*?)\\\]/g, (match, equation) => {
        try {
            return katex.renderToString(equation, {
                throwOnError: false,
                displayMode: true,
                strict: false
            });
        } catch (e) {
            log('LaTeX display rendering error:', e);
            return match;
        }
    });

    // Then replace inline LaTeX equations
    text = text.replace(/\\\((.*?)\\\)/g, (match, equation) => {
        try {
            return katex.renderToString(equation, {
                throwOnError: false,
                displayMode: false,
                strict: false
            });
        } catch (e) {
            log('LaTeX inline rendering error:', e);
            return match;
        }
    });

    return text;
}

/**
 * Show reinforcement panel for a concept
 * Displays video and explanation for the derived concept
 */
async function showReinforcementPanel(conceptId) {
    log('Showing reinforcement panel for concept:', conceptId);
    const node = UI.nodes.get(conceptId);
    if (!node) return;

    try {
        // Get the concept's YouTube data directly from the current map data
        const conceptData = UI.currentMap.nodes.find(n => n.id === conceptId);
        if (!conceptData || !conceptData.youtube) {
            throw new Error('Missing YouTube data for concept');
        }

        // Show panel
        UI.reinforcementPanel = document.getElementById('reinforcement-panel');
        UI.reinforcementPanel.style.display = 'flex';

        // Load YouTube video
        if (UI.youtubePlayer) {
            const { videoId, startTime, endTime } = parseYouTubeData(conceptData.youtube);
            log('Loading video with params:', { videoId, startTime, endTime });
            UI.youtubePlayer.loadVideoById({
                videoId: videoId,
                startSeconds: startTime,
                endSeconds: endTime
            });
        } else {
            log('YouTube player not initialized');
            // Reinitialize player
            initYouTubePlayer();
            // Add a small delay to allow initialization
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (UI.youtubePlayer) {
                const { videoId, startTime, endTime } = parseYouTubeData(conceptData.youtube);
                UI.youtubePlayer.loadVideoById({
                    videoId: videoId,
                    startSeconds: startTime,
                    endSeconds: endTime
                });
            }
        }

        // Get AI explanation for the concept
        const response = await fetchRequest('/get_concept_explanation', {
            concept_id: conceptId,
            cmap: UI.currentMap
        });

        // Format and set explanation
        const explanationElement = document.getElementById('concept-explanation');
        explanationElement.innerHTML = formatExplanation(response.explanation || 'No explanation available.');

        // Load existing notes if any
        const notes = node.notes || '';
        document.getElementById('concept-notes').value = notes;

        // Add event listeners
        setupReinforcementControls(conceptId);

    } catch (error) {
        log('Error showing reinforcement panel:', error);
        addMessage('system', 'Sorry, there was an error loading the reinforcement content.');
    }
}

/**
 * Parse YouTube data from the format [youtube_link, time_range]
 * Handles various YouTube URL formats and time range formats
 */
function parseYouTubeData(youtubeData) {
    const [link, timeRange] = youtubeData;
    
    // Extract video ID from various YouTube URL formats
    let videoId = '';
    try {
        const url = new URL(link);
        if (url.hostname.includes('youtube.com')) {
            videoId = url.searchParams.get('v');
        } else if (url.hostname.includes('youtu.be')) {
            videoId = url.pathname.slice(1);
        }
    } catch (e) {
        // If URL parsing fails, try direct extraction
        const match = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (match) {
            videoId = match[1];
        }
    }

    if (!videoId) {
        log('Error: Could not extract video ID from:', link);
        throw new Error('Invalid YouTube URL');
    }

    // Parse time range (format: MM:SS-MM:SS)
    const [startStr, endStr] = timeRange.split('-');
    
    const parseTime = (timeStr) => {
        const [minutes, seconds] = timeStr.trim().split(':').map(Number);
        return minutes * 60 + seconds;
    };

    const startTime = parseTime(startStr);
    const endTime = parseTime(endStr);

    log('Parsed YouTube data:', { videoId, startTime, endTime });
    return { videoId, startTime, endTime };
}

/**
 * Setup event listeners for reinforcement panel controls
 */
function setupReinforcementControls(conceptId) {
    const closeBtn = document.querySelector('.close-reinforcement');
    const saveNotesBtn = document.getElementById('save-notes');

    closeBtn.onclick = () => {
        UI.reinforcementPanel.style.display = 'none';
        if (UI.youtubePlayer) {
            UI.youtubePlayer.stopVideo();
        }
    };

    saveNotesBtn.onclick = async () => {
        const notes = document.getElementById('concept-notes').value;
        try {
            await saveConceptNotes(conceptId, notes);
            addMessage('system', 'Notes saved successfully!');
        } catch (error) {
            log('Error saving notes:', error);
            addMessage('system', 'Failed to save notes. Please try again.');
        }
    };
}

/**
 * Save concept notes to the backend
 */
async function saveConceptNotes(conceptId, notes) {
    log('Saving notes for concept:', conceptId);
    const node = UI.nodes.get(conceptId);
    if (!node) return;

    try {
        await fetchRequest('/update_data', {
            sheet: 'UMaps',
            data: {
                unit: UI.currentMap.unit,
                concept_id: conceptId,
                notes: notes
            }
        });

        // Update local node data
        UI.nodes.update({
            id: conceptId,
            notes: notes
        });

    } catch (error) {
        log('Error saving notes:', error);
        throw error;
    }
}

// Add CSS for continue button
const style = document.createElement('style');
style.textContent = `
    .continue-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: rgba(33, 150, 243, 0.2);
        border: 1px solid rgba(33, 150, 243, 0.3);
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        font-size: 1em;
        transition: all 0.2s ease;
        margin: 12px auto;
    }

    .continue-btn:hover {
        background: rgba(33, 150, 243, 0.3);
        transform: translateY(-1px);
    }

    .continue-btn .material-icons {
        font-size: 20px;
    }
`;
document.head.appendChild(style);

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeUIElements();
    initNetwork();
    setupEventListeners();
    UI.startTime = new Date(); // Track session start time
});