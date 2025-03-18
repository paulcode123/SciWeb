class TreeNode {
    constructor(content, level = 0, parent = null) {
        this.content = content;
        this.title = '';  // Will be set when node is created
        this.level = level;
        this.parent = parent;
        this.children = [];
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = 0;
        this.y = 0;
        this.isMinimized = false;
    }
}

class WhyTree {
    constructor() {
        this.root = null;
        this.nodes = new Map();
        this.nodeWidth = 250;
        this.nodeHeight = 100;
        this.levelHeight = 150;
        this.horizontalSpacing = 50;
        this.scale = 1;
        this.containerSize = 25000; // Fixed size for container
        this.init();
    }

    init() {
        // Set initial container size
        const container = document.getElementById('tree-visualization');
        const treeContainer = document.querySelector('.tree-container');
        
        // Set sizes for both containers
        container.style.width = `${this.containerSize}px`;
        container.style.height = `${this.containerSize}px`;
        container.style.minWidth = `${this.containerSize}px`;
        container.style.minHeight = `${this.containerSize}px`;
        
        treeContainer.style.minWidth = `${this.containerSize}px`;
        treeContainer.style.minHeight = `${this.containerSize}px`;
        
        // Initialize event listeners
        document.getElementById('submit-concept').addEventListener('click', () => this.createRootNode());
        document.getElementById('concept-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createRootNode();
        });
        
        // Initialize zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('reset-zoom').addEventListener('click', () => this.resetZoom());
        
        // Initialize pan functionality
        this.initializePan();
    }

    initializePan() {
        const container = document.querySelector('.tree-container');
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        });

        container.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        container.addEventListener('mouseup', () => {
            isDragging = false;
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX);
            const walkY = (y - startY);
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });
    }

    zoom(factor) {
        this.scale *= factor;
        const container = document.getElementById('tree-visualization');
        container.style.transform = `scale(${this.scale})`;
        this.render();
    }

    resetZoom() {
        this.scale = 1;
        const container = document.getElementById('tree-visualization');
        container.style.transform = 'scale(1)';
        this.render();
    }

    createRootNode() {
        const input = document.getElementById('concept-input');
        const content = input.value.trim();
        if (!content) return;

        // Create root node with title
        fetch('/why', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                generate_title: true,
                is_root: true
            })
        })
        .then(response => response.json())
        .then(data => {
            this.root = new TreeNode(content);
            this.root.title = data.title;
            this.nodes.set(this.root.id, this.root);
            input.value = '';
            this.render();

            // After rendering, scroll to position above the root node
            const treeContainer = document.querySelector('.tree-container');
            
            // Calculate scroll position to center the root node
            // The root node's x position already accounts for node width
            const scrollX = Math.max(0, this.root.x - (treeContainer.clientWidth - this.nodeWidth) / 2);
            const scrollY = Math.max(0, this.root.y - 200); // Fixed amount of space above
            
            treeContainer.scrollTo({
                left: scrollX,
                top: scrollY,
                behavior: 'smooth'
            });
        })
        .catch(error => {
            console.error('Error creating root node:', error);
        });
    }

    async expandWhy(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        try {
            const response = await fetch('/why', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: node.content,
                    generate_title: true
                })
            });

            const data = await response.json();
            
            if (data.explanations) {
                for (const explanation of data.explanations) {
                    const childNode = new TreeNode(
                        explanation.content,
                        node.level + 1,
                        node
                    );
                    childNode.title = explanation.title;
                    node.children.push(childNode);
                    this.nodes.set(childNode.id, childNode);
                }
                this.calculateNodePositions();
                this.render();
            }
        } catch (error) {
            console.error('Error expanding why:', error);
        }
    }

    calculateNodePositions() {
        if (!this.root) return;

        // Start with root at exact center of the fixed container
        this.root.x = (this.containerSize) / 2;
        this.root.y = this.containerSize / 4; // Place root at 1/4 down to leave room for upward expansion

        const positionRelativeToParent = (node) => {
            if (node.children.length === 0) return this.nodeWidth;
            
            let totalChildrenWidth = 0;
            let childWidths = [];
            
            // Calculate widths for all children first
            node.children.forEach(child => {
                const childWidth = positionRelativeToParent(child);
                childWidths.push(childWidth);
                totalChildrenWidth += childWidth;
            });
            
            // Add spacing between children
            totalChildrenWidth += (node.children.length - 1) * (this.nodeWidth * 3);
            
            // Position children relative to parent's center
            let currentX = -(totalChildrenWidth / 2);
            node.children.forEach((child, index) => {
                child.x = node.x + currentX + (childWidths[index] / 2);
                child.y = node.y + this.levelHeight;
                currentX += childWidths[index] + (this.nodeWidth * 3);
            });
            
            return Math.max(this.nodeWidth, totalChildrenWidth);
        };

        // Position all nodes
        positionRelativeToParent(this.root);
    }

    createNodeElement(node) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = `tree-node${node.isMinimized ? ' minimized' : ''}`;
        nodeDiv.id = `node-${node.id}`;
        nodeDiv.style.left = `${node.x}px`;
        nodeDiv.style.top = `${node.y}px`;
        
        // Create header with title and minimize button
        const header = document.createElement('div');
        header.className = 'node-header';
        
        const title = document.createElement('div');
        title.className = 'node-title';
        title.textContent = node.title;
        
        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'minimize-button';
        minimizeButton.innerHTML = node.isMinimized ? '⊕' : '⊖';
        minimizeButton.onclick = (e) => {
            e.stopPropagation();
            this.toggleMinimize(node.id);
        };
        
        header.appendChild(title);
        header.appendChild(minimizeButton);
        nodeDiv.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'node-content';
        content.textContent = node.content;
        
        const buttons = document.createElement('div');
        buttons.className = 'node-buttons';
        
        const whyButton = document.createElement('button');
        whyButton.className = 'why-button';
        whyButton.innerHTML = '↓';
        whyButton.onclick = () => this.expandWhy(node.id);
        
        const howButton = document.createElement('button');
        howButton.className = 'how-button';
        howButton.innerHTML = '↑';
        howButton.onclick = () => console.log('How clicked - not implemented yet');
        
        buttons.appendChild(whyButton);
        buttons.appendChild(howButton);
        
        nodeDiv.appendChild(content);
        nodeDiv.appendChild(buttons);
        
        return nodeDiv;
    }

    drawConnections() {
        this.nodes.forEach(node => {
            if (node.parent) {
                const connection = document.createElement('div');
                connection.className = 'node-connection';
                
                // Calculate line position and dimensions
                const startX = node.parent.x + this.nodeWidth / 2;
                const startY = node.parent.y + this.nodeHeight;
                const endX = node.x + this.nodeWidth / 2;
                const endY = node.y;
                
                // Calculate line length and angle
                const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                const angle = Math.atan2(endY - startY, endX - startX);
                
                // Position and rotate line
                connection.style.width = `${length}px`;
                connection.style.height = '2px';
                connection.style.left = `${startX}px`;
                connection.style.top = `${startY}px`;
                connection.style.transform = `rotate(${angle}rad)`;
                connection.style.transformOrigin = '0 0';
                
                document.getElementById('tree-visualization').appendChild(connection);
            }
        });
    }

    render() {
        const container = document.getElementById('tree-visualization');
        container.innerHTML = '';
        
        if (!this.root) return;
        
        // Calculate positions
        this.calculateNodePositions();
        
        // Draw connections first (so they're behind nodes)
        this.drawConnections();
        
        // Create and position nodes
        this.nodes.forEach(node => {
            container.appendChild(this.createNodeElement(node));
        });
    }

    toggleMinimize(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        node.isMinimized = !node.isMinimized;
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.classList.toggle('minimized');
            const button = nodeElement.querySelector('.minimize-button');
            button.innerHTML = node.isMinimized ? '⊕' : '⊖';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.whyTree = new WhyTree();
}); 