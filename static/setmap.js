// Predefined concepts for class units
const unitConcepts = {
    'Physics-Mechanics': [
        "Force is a push or pull that can change motion",
        "Newton's Laws describe motion and forces",
        "Energy is conserved in a closed system",
        "Momentum is mass times velocity"
    ],
    'Physics-Thermodynamics': [
        "Heat is the transfer of thermal energy",
        "Temperature measures average kinetic energy",
        "Entropy increases in natural processes",
        "Pressure is force per unit area"
    ],
    // Add more class-unit combinations as needed
};

// Store parent-child relationships
const nodeConnections = new Map();

// Helper function to add a child connection
function addNodeConnection(parentNode, childNode) {
    if (!nodeConnections.has(parentNode)) {
        nodeConnections.set(parentNode, []);
    }
    nodeConnections.get(parentNode).push(childNode);
}

// Function to adjust font size to fit content
function adjustFontSize(element) {
    const text = element.querySelector('.concept-text');
    if (!text) return;

    // Get the content container dimensions
    const maxWidth = text.clientWidth - 10; // Subtract padding
    const maxHeight = text.clientHeight - 10; // Subtract padding
    
    // Create a temporary span to measure text
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'normal';
    span.style.width = maxWidth + 'px';
    span.style.lineHeight = '1.2';
    span.innerHTML = text.innerHTML;
    document.body.appendChild(span);

    // Binary search for the right font size
    let low = 0.5;  // Min font size
    let high = 1.0; // Max font size
    let fontSize = 0.9; // Starting size
    let bestSize = 0.5; // Default to min if nothing fits
    
    while (high - low > 0.01) {
        fontSize = (high + low) / 2;
        span.style.fontSize = `${fontSize}rem`;
        
        if (span.offsetHeight <= maxHeight && span.offsetWidth <= maxWidth) {
            bestSize = fontSize;
            low = fontSize;
        } else {
            high = fontSize;
        }
    }
    
    // Clean up
    document.body.removeChild(span);
    
    // Apply the best fitting size
    text.style.fontSize = `${bestSize}rem`;
}

// Create a new concept node
function createNode(text, x, y) {
    const node = document.createElement('div');
    node.className = 'concept-node';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    
    node.innerHTML = `
        <div class="concept-text">${text}</div>
        <div class="node-actions">
            <button class="node-button check-button" onclick="markUnderstood(this)">
                <i class="fas fa-check"></i>
            </button>
            <button class="node-button expand-button" onclick="createChildNode(this)">
                <i class="fas fa-arrow-down"></i>
            </button>
        </div>
    `;
    
    const conceptMap = document.getElementById('conceptMap');
    if (conceptMap) {
        conceptMap.appendChild(node);
        node.setAttribute('data-x', '0');
        node.setAttribute('data-y', '0');
        
        // Adjust font size after node is added to DOM
        requestAnimationFrame(() => adjustFontSize(node));
    }
    return node;
}

// Setup canvas for drawing connections
function setupCanvas() {
    const canvas = document.getElementById('connectionCanvas');
    const container = document.getElementById('infiniteContainer');
    
    if (!canvas || !container) return;
    
    function updateCanvasSize() {
        const width = Math.max(container.scrollWidth, 3000);
        const height = Math.max(container.scrollHeight, 3000);
        
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            requestAnimationFrame(updateConnections);
        }
    }
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
}

// Update connections between nodes
function updateConnections() {
    const canvas = document.getElementById('connectionCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set line style
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    
    // Draw connections
    nodeConnections.forEach((children, parentNode) => {
        if (!parentNode || !children) return;

        // Get parent position
        const parentX = parseFloat(parentNode.style.left) || 0;
        const parentY = parseFloat(parentNode.style.top) || 0;

        // Draw connection to each child
        children.forEach(childNode => {
            if (!childNode) return;
            
            // Get child position
            const childX = parseFloat(childNode.style.left) || 0;
            const childY = parseFloat(childNode.style.top) || 0;

            // Calculate connection points
            const startX = parentX + 100; // Half of node width
            const startY = parentY + 120; // Bottom of parent node
            const endX = childX + 100; // Half of node width
            const endY = childY; // Top of child node
            
            // Draw line with curve
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(
                startX, startY + (endY - startY)/3,
                endX, startY + (endY - startY)*2/3,
                endX, endY
            );
            ctx.stroke();
        });
    });
}

// Setup draggable functionality using interact.js
function setupDraggable() {
    interact('.concept-node').draggable({
        inertia: false,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: '.infinite-content',
                endOnly: true
            })
        ],
        autoScroll: true,
        listeners: {
            start(event) {
                event.target.classList.add('dragging');
            },
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                
                // Update the actual position instead of using transform
                const currentLeft = parseFloat(target.style.left) || 0;
                const currentTop = parseFloat(target.style.top) || 0;
                
                target.style.left = `${currentLeft + event.dx}px`;
                target.style.top = `${currentTop + event.dy}px`;
                
                // Store the cumulative movement
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);

                requestAnimationFrame(updateConnections);
            },
            end(event) {
                event.target.classList.remove('dragging');
                requestAnimationFrame(updateConnections);
            }
        }
    });
}

// Track node completion status
function isNodeComplete(node) {
    return node.classList.contains('understood') || 
           (nodeConnections.has(node) && nodeConnections.get(node).length > 0);
}

// Check if all nodes are complete
function checkAllNodesComplete() {
    const nodes = document.querySelectorAll('.concept-node');
    return Array.from(nodes).every(isNodeComplete);
}

// Show completion UI
function showCompletionUI() {
    // Create completion overlay if it doesn't exist
    let overlay = document.querySelector('.completion-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'completion-overlay';
        overlay.innerHTML = `
            <div class="completion-content">
                <div class="completion-animation">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="saving-indicator">
                    <div class="spinner"></div>
                    <span>Saving your concept map...</span>
                </div>
                <button id="continue-button" class="continue-button" style="display: none;">
                    Continue to Derive
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Simulate saving process (replace with actual save later)
        setTimeout(() => {
            const savingIndicator = overlay.querySelector('.saving-indicator');
            const continueButton = overlay.querySelector('#continue-button');
            savingIndicator.style.display = 'none';
            continueButton.style.display = 'flex';
            
            // Handle continue button click
            continueButton.addEventListener('click', () => {
                const urlParams = new URLSearchParams(window.location.search);
                const topic = urlParams.get('topic');
                const className = urlParams.get('class');
                const unitName = urlParams.get('unit');
                
                if (topic) {
                    window.location.href = `/derive?topic=${encodeURIComponent(topic)}`;
                } else if (className && unitName) {
                    const params = new URLSearchParams({
                        class: className,
                        unit: unitName
                    });
                    window.location.href = `/derive?${params.toString()}`;
                }
            });
        }, 2000); // Simulate 2 second save
    }
}

// Update the markUnderstood function
function markUnderstood(button) {
    const node = button.closest('.concept-node');
    if (!node.classList.contains('understood')) {
        node.classList.add('understood');
        if (checkAllNodesComplete()) {
            showCompletionUI();
        }
    }
}

// Create a child node when down arrow is clicked
async function createChildNode(button) {
    const parentNode = button.closest('.concept-node');
    if (!parentNode) return;
    
    // Get parent's current position
    const parentX = parseFloat(parentNode.style.left) || 0;
    const parentY = parseFloat(parentNode.style.top) || 0;
    
    // Get the concept text from the parent node
    const conceptText = parentNode.querySelector('.concept-text').textContent;
    
    try {
        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Call the /why endpoint to get prerequisites
        const response = await fetch('/why', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: conceptText
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get prerequisites');
        }
        
        const data = await response.json();
        
        // Calculate positions for child nodes
        const prerequisites = data.prerequisites;
        const numChildren = prerequisites.length;
        const spacing = 200; // Horizontal spacing between nodes
        const totalWidth = (numChildren - 1) * spacing;
        const startX = parentX - totalWidth / 2;
        
        // Create a child node for each prerequisite
        prerequisites.forEach((prerequisite, index) => {
            const x = startX + (index * spacing);
            const y = parentY + 150; // 150px below parent
            
            // Create the child node with the prerequisite content
            const childNode = createNode(prerequisite, x, y);
            
            // Store the connection using the new helper function
            addNodeConnection(parentNode, childNode);
        });
        
        // Update connections
        requestAnimationFrame(updateConnections);
        
        // Check completion
        if (checkAllNodesComplete()) {
            showCompletionUI();
        }
    } catch (error) {
        console.error('Error creating child nodes:', error);
    } finally {
        // Restore button icon
        button.innerHTML = '<i class="fas fa-arrow-down"></i>';
    }
}

// Add a resize observer to handle window resizing
const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        if (entry.target.classList.contains('concept-node')) {
            adjustFontSize(entry.target);
        }
    }
});

// Initialize the concept map
function initSetMap() {
    const conceptMap = document.getElementById('conceptMap');
    const container = document.getElementById('infiniteContainer');
    const canvas = document.getElementById('connectionCanvas');
    
    if (!conceptMap || !container || !canvas) {
        console.error('Required elements not found, retrying in 100ms');
        setTimeout(initSetMap, 100);
        return;
    }

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic');
    const className = urlParams.get('class');
    const unitName = urlParams.get('unit');

    // Clear any existing nodes
    conceptMap.innerHTML = '';
    nodeConnections.clear();

    // Calculate center position
    const containerWidth = container.clientWidth;
    const centerX = (3000 - containerWidth) / 2; // 3000 is the infinite-content width

    if (topic) {
        // Create single node at center
        createNode(decodeURIComponent(topic), centerX + (containerWidth / 2) - 75, 50); // 75 is half node width
    } else if (className && unitName) {
        // Create nodes for class+unit combination
        const unitKey = `${className}-${unitName}`;
        const concepts = unitConcepts[unitKey] || [
            `No predefined concepts for ${unitName}`,
            "Click the down arrow to explore related concepts",
        ];
        
        // Create nodes in a centered grid layout
        const columns = Math.ceil(Math.sqrt(concepts.length));
        const totalWidth = columns * 200; // 200px spacing between nodes
        const startX = centerX + (containerWidth / 2) - (totalWidth / 2);
        
        concepts.forEach((concept, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = startX + (col * 200);
            const y = 50 + (row * 150);
            createNode(concept, x, y);
        });
    }

    // Setup canvas for connections
    setupCanvas();

    // Setup draggable nodes
    setupDraggable();

    // Add scroll event listener to update connections
    container.addEventListener('scroll', () => {
        requestAnimationFrame(updateConnections);
    });

    // Center the scroll position horizontally
    container.scrollLeft = centerX;

    // Observe existing nodes
    document.querySelectorAll('.concept-node').forEach(node => {
        resizeObserver.observe(node);
    });
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', initSetMap); 