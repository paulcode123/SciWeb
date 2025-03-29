// Particle system configuration
const particleConfig = {
    particleCount: 30,
    color: '#6366f1',
    minSize: 2,
    maxSize: 4,
    speed: 1,
    connected: true,
    lineColor: 'rgba(99, 102, 241, 0.1)'
};

class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * (particleConfig.maxSize - particleConfig.minSize) + particleConfig.minSize;
        this.speedX = (Math.random() - 0.5) * particleConfig.speed;
        this.speedY = (Math.random() - 0.5) * particleConfig.speed;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > this.canvas.width) this.x = 0;
        if (this.x < 0) this.x = this.canvas.width;
        if (this.y > this.canvas.height) this.y = 0;
        if (this.y < 0) this.y = this.canvas.height;
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fillStyle = particleConfig.color;
        this.ctx.fill();
    }
}

// Initialize particle system
function initParticles() {
    const container = document.querySelector('.whytree-container');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.5;
    `;
    container.insertBefore(canvas, container.firstChild);

    function resizeCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = Array.from({ length: particleConfig.particleCount }, () => new Particle(canvas));
    const ctx = canvas.getContext('2d');

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        if (particleConfig.connected) {
            particles.forEach((p1, i) => {
                particles.slice(i + 1).forEach(p2 => {
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = particleConfig.lineColor;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                });
            });
        }

        requestAnimationFrame(animate);
    }
    animate();
}

document.addEventListener('DOMContentLoaded', function() {
    const conceptInput = document.getElementById('concept-input');
    const classSelect = document.getElementById('class-select');
    const unitSelect = document.getElementById('unit-select');
    const startButton = document.getElementById('start-button');
    const explanationContainer = document.getElementById('explanation');
    const letsGoButton = document.getElementById('lets-go-button');
    
    // Initialize particle system
    initParticles();

    // Add hover effect to input containers
    document.querySelectorAll('.custom-input').forEach(container => {
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            container.style.background = `radial-gradient(circle at ${x}px ${y}px, 
                rgba(99, 102, 241, 0.1) 0%, 
                rgba(15, 23, 42, 0) 50%)`;
        });

        container.addEventListener('mouseleave', () => {
            container.style.background = 'none';
        });
    });

    // Typing effect for labels
    document.querySelectorAll('.custom-input label').forEach(label => {
        const text = label.textContent;
        label.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                label.textContent += text[i];
                i++;
            } else {
                clearInterval(interval);
            }
        }, 50);
    });

    let selectedClass = null;
    let selectedUnit = null;

    function updateStartButton() {
        const conceptFilled = conceptInput.value.trim().length > 0;
        const presetFilled = selectedClass && selectedUnit;
        
        if (conceptFilled || presetFilled) {
            startButton.disabled = false;
            startButton.classList.add('illuminated');
        } else {
            startButton.disabled = true;
            startButton.classList.remove('illuminated');
        }
    }

    // Handle concept input
    conceptInput.addEventListener('input', () => {
        if (conceptInput.value.trim().length > 0) {
            classSelect.disabled = true;
            unitSelect.disabled = true;
        } else {
            classSelect.disabled = false;
            unitSelect.disabled = !selectedClass;
        }
        updateStartButton();
        // Hide explanation if input changes
        explanationContainer.style.display = 'none';
        explanationContainer.classList.remove('visible');
    });

    // Handle class select input
    let classSearchTimeout;
    classSelect.addEventListener('input', function() {
        selectedClass = null;
        selectedUnit = null;
        unitSelect.value = '';
        unitSelect.disabled = true;
        updateStartButton();

        clearTimeout(classSearchTimeout);
        classSearchTimeout = setTimeout(async function() {
            startLoading();
            try {
                const response = await fetchRequest('/data', {
                    "data": "Classes",
                    "search": classSelect.value
                });
                updateClassResults(response);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                endLoading();
            }
        }, 300);
    });

    // Handle unit select input
    let unitSearchTimeout;
    unitSelect.addEventListener('input', function() {
        selectedUnit = null;
        updateStartButton();

        clearTimeout(unitSearchTimeout);
        unitSearchTimeout = setTimeout(async function() {
            startLoading();
            try {
                const response = await fetchRequest('/data', {
                    "data": "Units",
                    "class_id": selectedClass.id,
                    "search": unitSelect.value
                });
                updateUnitResults(response);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                endLoading();
            }
        }, 300);
    });

    function updateClassResults(data) {
        removeExistingResults(classSelect);

        if (data.Classes?.length > 0) {
            const resultsContainer = createResultsContainer();
            
            data.Classes.forEach((item, index) => {
                const resultItem = createResultItem(item, index);
                resultItem.addEventListener('click', () => {
                    selectedClass = item;
                    classSelect.value = item.name;
                    unitSelect.disabled = false;
                    unitSelect.value = '';
                    removeExistingResults(classSelect);
                    updateStartButton();
                });
                resultsContainer.appendChild(resultItem);
            });

            classSelect.parentElement.appendChild(resultsContainer);
        }
    }

    function updateUnitResults(data) {
        removeExistingResults(unitSelect);

        if (data.Units?.length > 0) {
            const resultsContainer = createResultsContainer();
            
            data.Units.forEach((item, index) => {
                const resultItem = createResultItem(item, index);
                resultItem.addEventListener('click', () => {
                    selectedUnit = item;
                    unitSelect.value = item.name;
                    removeExistingResults(unitSelect);
                    updateStartButton();
                });
                resultsContainer.appendChild(resultItem);
            });

            unitSelect.parentElement.appendChild(resultsContainer);
        }
    }

    function removeExistingResults(input) {
        const existingResults = input.parentElement.querySelector('.search-results');
        if (existingResults) {
            existingResults.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => existingResults.remove(), 200);
        }
    }

    function createResultsContainer() {
        const container = document.createElement('div');
        container.className = 'search-results';
        return container;
    }

    function createResultItem(item, index) {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.textContent = item.name;
        resultItem.style.cssText = `
            padding: 12px 16px;
            cursor: pointer;
            transition: all 0.3s;
            color: #e2e8f0;
            animation: slideIn 0.3s ease forwards ${index * 0.05}s;
            opacity: 0;
            transform: translateX(-20px);
        `;
        return resultItem;
    }

    // Handle start button click
    startButton.addEventListener('click', () => {
        // Show explanation with animation
        explanationContainer.style.display = 'block';
        // Trigger reflow
        explanationContainer.offsetHeight;
        explanationContainer.classList.add('visible');
        
        // Scroll to explanation
        explanationContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Handle lets-go button click
    letsGoButton.addEventListener('click', () => {
        const container = document.querySelector('.whytree-container');
        container.style.animation = 'fadeOut 0.5s ease forwards';
        
        setTimeout(() => {
            if (conceptInput.value.trim().length > 0) {
                // Handle concept path - direct redirect
                window.location.href = `/SetMap?topic=${encodeURIComponent(conceptInput.value.trim())}`;
            } else if (selectedClass && selectedUnit) {
                // Handle class+unit path - direct redirect
                const params = new URLSearchParams({
                    class: selectedClass.name,
                    unit: selectedUnit.name
                });
                window.location.href = `/SetMap?${params.toString()}`;
            }
        }, 500);
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        const searchBoxes = document.querySelectorAll('.search-box');
        searchBoxes.forEach(searchBox => {
            const searchResults = searchBox.querySelector('.search-results');
            if (searchResults && !searchBox.contains(e.target)) {
                searchResults.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => searchResults.remove(), 200);
            }
        });
    });
});
