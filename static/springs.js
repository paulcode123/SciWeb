console.log("Springs.js loading...");

class SpringSimulation extends Simulation {
    constructor() {
        console.log("Initializing SpringSimulation...");
        super('simulationCanvas');
        
        // Spring properties
        this.springConstant = 50; // N/m
        this.restLength = 100; // pixels
        this.currentLength = this.restLength;
        this.pixelsToMeters = 0.01; // 1 pixel = 1cm
        
        // Mass properties
        this.mass = 1; // kg
        this.massRadius = 20;
        this.massX = 0;
        this.massY = 0;
        this.isDragging = false;
        
        // Anchor point (fixed end of spring)
        this.anchorX = 0;
        this.anchorY = 0;
        
        // Graph properties
        this.forceGraph = this.setupGraph('forceGraph', 'Force (N)', [-10, 10]);
        this.energyGraph = this.setupGraph('energyGraph', 'Energy (J)', [0, 5]);
        this.currentPoint = { x: 0, y: 0 };
        
        this.setupControls();
        this.setupEventListeners();
        this.resetPosition();
        this.start();
    }

    setupCanvas() {
        console.log("Setting up canvas");
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set actual canvas dimensions
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Set display size
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        
        // Scale context for retina displays
        this.ctx.scale(dpr, dpr);
        
        // Store the scale factor for mouse coordinate conversion
        this.scaleFactor = dpr;
        
        // Store canvas bounds for mouse coordinate conversion
        this.canvasBounds = this.canvas.getBoundingClientRect();
    }

    setupControls() {
        // Spring constant control
        this.kControl = document.getElementById('springConstant');
        this.kValue = document.getElementById('springConstantValue');
        this.kControl.addEventListener('input', () => {
            this.springConstant = parseFloat(this.kControl.value);
            this.kValue.textContent = `${this.springConstant} N/m`;
            this.updateInfo();
        });

        // Rest length control
        this.lengthControl = document.getElementById('restLength');
        this.lengthValue = document.getElementById('restLengthValue');
        this.lengthControl.addEventListener('input', () => {
            this.restLength = parseFloat(this.lengthControl.value);
            this.lengthValue.textContent = `${this.restLength} px`;
            this.resetPosition();
        });

        // Reset button
        document.getElementById('resetSimulation').addEventListener('click', () => {
            this.resetPosition();
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        
        // Update canvas bounds on resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.resetPosition();
        });
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width) / this.scaleFactor,
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height) / this.scaleFactor
        };
    }

    resetPosition() {
        const rect = this.canvas.getBoundingClientRect();
        this.anchorX = rect.width * 0.3;
        this.anchorY = rect.height * 0.5;
        this.massX = this.anchorX + this.restLength;
        this.massY = this.anchorY;
        this.currentLength = this.restLength;
        this.updateInfo();
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        const dx = pos.x - this.massX;
        const dy = pos.y - this.massY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.massRadius) {
            this.isDragging = true;
        }
    }

    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const pos = this.getMousePos(e);
        this.massX = pos.x;
        this.massY = pos.y;
        
        // Calculate current spring length
        const dx = this.massX - this.anchorX;
        const dy = this.massY - this.anchorY;
        this.currentLength = Math.sqrt(dx * dx + dy * dy);
        
        this.updateInfo();
    }

    onMouseUp() {
        this.isDragging = false;
    }

    updateInfo() {
        // Calculate force and energy
        const extension = (this.currentLength - this.restLength) * this.pixelsToMeters;
        const force = -this.springConstant * extension;
        const energy = 0.5 * this.springConstant * extension * extension;
        
        // Update display
        document.getElementById('currentForce').textContent = `${Math.abs(force).toFixed(2)} N`;
        document.getElementById('potentialEnergy').textContent = `${energy.toFixed(2)} J`;
        document.getElementById('extension').textContent = `${extension.toFixed(3)} m`;
        
        // Update graphs
        this.drawGraph(this.forceGraph, extension, force);
        this.drawGraph(this.energyGraph, extension, energy);
    }

    render() {
        this.clear();
        
        // Add a subtle grid background
        this.drawGrid();
        
        // Draw spring with glow effect
        this.ctx.shadowColor = '#4a90e2';
        this.ctx.shadowBlur = 10;
        
        // Draw spring
        this.ctx.beginPath();
        this.ctx.moveTo(this.anchorX, this.anchorY);
        
        // Draw spring coils with gradient
        const numCoils = 15;
        const dx = this.massX - this.anchorX;
        const dy = this.massY - this.anchorY;
        const angle = Math.atan2(dy, dx);
        const coilWidth = map(this.currentLength, 50, 200, 15, 8); // Coils get thinner as spring stretches
        
        // Create gradient for spring
        const gradient = this.ctx.createLinearGradient(this.anchorX, this.anchorY, this.massX, this.massY);
        gradient.addColorStop(0, '#4a90e2');
        gradient.addColorStop(0.5, '#64a5e8');
        gradient.addColorStop(1, '#4a90e2');
        
        for (let i = 0; i <= numCoils; i++) {
            const t = i / numCoils;
            const x = this.anchorX + dx * t;
            const y = this.anchorY + dy * t;
            const offset = Math.sin(i * Math.PI) * coilWidth;
            
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            
            this.ctx.lineTo(x + perpX, y + perpY);
        }
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Reset shadow for other elements
        this.ctx.shadowBlur = 0;
        
        // Draw anchor point with glow
        this.ctx.beginPath();
        this.ctx.arc(this.anchorX, this.anchorY, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw mass with gradient and glow
        const massGradient = this.ctx.createRadialGradient(
            this.massX, this.massY, 0,
            this.massX, this.massY, this.massRadius
        );
        massGradient.addColorStop(0, '#64a5e8');
        massGradient.addColorStop(1, '#4a90e2');
        
        this.ctx.beginPath();
        this.ctx.arc(this.massX, this.massY, this.massRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = massGradient;
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Add force vector visualization
        this.drawForceVector();
    }
    
    drawGrid() {
        const gridSize = 30;
        const gridColor = 'rgba(74, 144, 226, 0.1)';
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawForceVector() {
        const extension = (this.currentLength - this.restLength) * this.pixelsToMeters;
        const force = -this.springConstant * extension;
        
        // Draw equilibrium position marker (vertical dashed line)
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.anchorX + this.restLength, this.anchorY - 100);
        this.ctx.lineTo(this.anchorX + this.restLength, this.anchorY + 100);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw "Equilibrium" text
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Equilibrium', this.anchorX + this.restLength, this.anchorY - 110);
        
        // Draw force vector only if there's significant force
        if (Math.abs(force) > 0.1) {
            const dx = this.massX - this.anchorX;
            const dy = this.massY - this.anchorY;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) return;
            
            // Normalize direction and scale by force
            const scale = Math.min(Math.abs(force) * 2, 100);
            const dirX = dx / length;
            const dirY = dy / length;
            
            // Arrow properties
            const arrowLength = scale;
            const arrowWidth = 10;
            
            // Calculate arrow points
            const arrowX = this.massX - dirX * this.massRadius;
            const arrowY = this.massY - dirY * this.massRadius;
            const endX = arrowX - dirX * arrowLength;
            const endY = arrowY - dirY * arrowLength;
            
            // Draw arrow shaft
            this.ctx.beginPath();
            this.ctx.moveTo(arrowX, arrowY);
            this.ctx.lineTo(endX, endY);
            this.ctx.strokeStyle = '#ff4444';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Draw arrow head
            const angle = Math.atan2(dirY, dirX);
            this.ctx.beginPath();
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(
                endX + arrowWidth * Math.cos(angle + Math.PI * 3/4),
                endY + arrowWidth * Math.sin(angle + Math.PI * 3/4)
            );
            this.ctx.lineTo(
                endX + arrowWidth * Math.cos(angle - Math.PI * 3/4),
                endY + arrowWidth * Math.sin(angle - Math.PI * 3/4)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fill();
            
            // Draw "Force" text near the arrow
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#ff4444';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Force: ${Math.abs(force).toFixed(1)}N`, 
                (arrowX + endX) / 2, 
                (arrowY + endY) / 2 - 15);
        }
        
        // Draw potential energy scale at the bottom
        const energy = 0.5 * this.springConstant * extension * extension;
        const scaleY = this.canvas.height / this.scaleFactor - 40;
        const scaleWidth = 200;
        const scaleX = (this.canvas.width / this.scaleFactor - scaleWidth) / 2;
        
        // Draw scale background
        this.ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
        this.ctx.fillRect(scaleX, scaleY, scaleWidth, 20);
        
        // Draw energy level
        const energyWidth = Math.min((energy / 5) * scaleWidth, scaleWidth);
        const gradient = this.ctx.createLinearGradient(scaleX, 0, scaleX + energyWidth, 0);
        gradient.addColorStop(0, 'rgba(74, 144, 226, 0.8)');
        gradient.addColorStop(1, 'rgba(74, 144, 226, 0.4)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(scaleX, scaleY, energyWidth, 20);
        
        // Draw scale border
        this.ctx.strokeStyle = 'rgba(74, 144, 226, 0.4)';
        this.ctx.strokeRect(scaleX, scaleY, scaleWidth, 20);
        
        // Draw scale text
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Potential Energy: ${energy.toFixed(2)}J`, 
            scaleX + scaleWidth/2, 
            scaleY + 40);
    }

    setupGraph(canvasId, yLabel, yRange) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Set actual size in memory
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        
        // Scale context to ensure correct drawing operations
        ctx.scale(dpr, dpr);
        
        return {
            canvas,
            ctx,
            yLabel,
            yRange,
            points: [] // Store points for the line
        };
    }

    drawGraph(graph, x, y) {
        const ctx = graph.ctx;
        const canvas = graph.canvas;
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw axes
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 1;
        
        // X axis
        ctx.beginPath();
        ctx.moveTo(0, height/2);
        ctx.lineTo(width, height/2);
        ctx.stroke();
        
        // Y axis
        ctx.beginPath();
        ctx.moveTo(width/2, 0);
        ctx.lineTo(width/2, height);
        ctx.stroke();
        
        // Draw the function line
        ctx.beginPath();
        ctx.strokeStyle = '#64a5e8';
        ctx.lineWidth = 2;
        
        const points = [];
        const numPoints = 100;
        for (let i = 0; i < numPoints; i++) {
            const xPos = (i - numPoints/2) * 0.02; // Position in meters
            let yPos;
            
            if (graph === this.forceGraph) {
                yPos = -this.springConstant * xPos; // F = -kx
            } else {
                yPos = 0.5 * this.springConstant * xPos * xPos; // U = 1/2 * kx^2
            }
            
            // Convert to canvas coordinates
            const canvasX = (xPos + 0.5) * width;
            const canvasY = height - ((yPos - graph.yRange[0]) / (graph.yRange[1] - graph.yRange[0]) * height);
            
            if (i === 0) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
            points.push({ x: canvasX, y: canvasY });
        }
        ctx.stroke();
        
        // Draw current point
        const extension = (this.currentLength - this.restLength) * this.pixelsToMeters;
        const force = -this.springConstant * extension;
        const energy = 0.5 * this.springConstant * extension * extension;
        
        const currentX = (extension + 0.5) * width;
        const currentY = height - ((graph === this.forceGraph ? force : energy) - graph.yRange[0]) / (graph.yRange[1] - graph.yRange[0]) * height;
        
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    update(deltaTime) {
        // Currently only updates on user interaction
    }
}

// Initialize the simulation when the page loads
window.addEventListener('load', () => {
    console.log("Window loaded, creating SpringSimulation...");
    new SpringSimulation();
}); 