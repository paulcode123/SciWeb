class BattleGraphics {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize animation properties
        this.animations = {
            scoreChanges: [],
            answers: [],
            effects: []
        };
        
        // Theme colors
        this.colors = {
            background: '#1a1a1a',
            player: '#4CAF50',
            score: '#FFD700',
            correct: '#4CAF50',
            incorrect: '#f44336',
            text: '#ffffff'
        };
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = window.innerHeight * 0.6; // 60% of viewport height
    }

    drawBackground() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add grid effect
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.canvas.width; i += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let i = 0; i < this.canvas.height; i += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }
    }

    drawPlayers(players) {
        const playerSize = 60;
        const padding = 20;
        let x = padding;
        
        Object.values(players).forEach((player, index) => {
            // Draw player avatar
            this.ctx.fillStyle = this.colors.player;
            this.ctx.beginPath();
            this.ctx.arc(
                x + playerSize/2,
                this.canvas.height - padding - playerSize/2,
                playerSize/2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // Draw player name
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                player.name,
                x + playerSize/2,
                this.canvas.height - padding - playerSize - 10
            );
            
            // Draw score
            this.ctx.fillStyle = this.colors.score;
            this.ctx.fillText(
                player.score,
                x + playerSize/2,
                this.canvas.height - padding - playerSize - 30
            );
            
            x += playerSize + padding;
        });
    }

    animateAnswer(isCorrect, position) {
        const animation = {
            type: 'answer',
            isCorrect,
            position,
            alpha: 1,
            scale: 1
        };
        
        this.animations.answers.push(animation);
        
        // Remove animation after 1 second
        setTimeout(() => {
            const index = this.animations.answers.indexOf(animation);
            if (index > -1) this.animations.answers.splice(index, 1);
        }, 1000);
    }

    showScoreChange(amount, position) {
        const animation = {
            type: 'score',
            amount,
            position,
            alpha: 1,
            y: position.y
        };
        
        this.animations.scoreChanges.push(animation);
        
        // Remove animation after 1.5 seconds
        setTimeout(() => {
            const index = this.animations.scoreChanges.indexOf(animation);
            if (index > -1) this.animations.scoreChanges.splice(index, 1);
        }, 1500);
    }

    drawAnimations() {
        // Draw answer animations
        this.animations.answers.forEach(anim => {
            this.ctx.globalAlpha = anim.alpha;
            this.ctx.fillStyle = anim.isCorrect ? this.colors.correct : this.colors.incorrect;
            this.ctx.beginPath();
            this.ctx.arc(
                anim.position.x,
                anim.position.y,
                30 * anim.scale,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // Update animation
            anim.alpha -= 0.02;
            anim.scale += 0.05;
        });
        
        // Draw score change animations
        this.animations.scoreChanges.forEach(anim => {
            this.ctx.globalAlpha = anim.alpha;
            this.ctx.fillStyle = this.colors.score;
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `+${anim.amount}`,
                anim.position.x,
                anim.y
            );
            
            // Update animation
            anim.alpha -= 0.02;
            anim.y -= 1;
        });
        
        this.ctx.globalAlpha = 1;
    }

    drawActiveEffects() {
        // Draw any active power-ups or special effects
        this.animations.effects.forEach(effect => {
            // Implementation depends on effect type
        });
    }

    renderGameScene(gameState) {
        requestAnimationFrame(() => {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw game elements
            this.drawBackground();
            if (gameState && gameState.players) {
                this.drawPlayers(gameState.players);
            }
            this.drawAnimations();
            this.drawActiveEffects();
            
            // Continue animation loop
            this.renderGameScene(gameState);
        });
    }
}

export { BattleGraphics }; 