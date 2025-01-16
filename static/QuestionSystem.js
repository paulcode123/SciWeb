export class QuestionSystem {
    constructor(scene, questions) {
        this.scene = scene;
        this.questions = questions || [];
        this.currentQuestionIndex = 0;
        this.activeElements = [];
        this.domElements = [];
    }

    getRandomQuestion() {
        if (this.questions.length === 0) {
            console.error('No questions available');
            return null;
        }
        // Get the next question in sequence
        const question = this.questions[this.currentQuestionIndex];
        this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.questions.length;
        return question;
    }

    displayQuestion() {
        const question = this.getRandomQuestion();
        if (!question) return;
        
        // Create question container with better positioning
        const container = this.scene.add.rectangle(400, 450, 700, 200, 0x000000, 0.7);
        this.activeElements.push(container);

        // Create DOM element for question text with LaTeX
        const questionDiv = document.createElement('div');
        questionDiv.style.position = 'absolute';
        questionDiv.style.left = '50%';
        questionDiv.style.top = '400px';  // Moved up
        questionDiv.style.transform = 'translate(-50%, -50%)';
        questionDiv.style.color = '#fff';
        questionDiv.style.fontSize = '28px';  // Increased size
        questionDiv.style.width = '600px';
        questionDiv.style.textAlign = 'center';
        questionDiv.innerHTML = question.question;
        document.body.appendChild(questionDiv);
        this.domElements.push(questionDiv);

        // Add answer buttons in a grid with better positioning
        const buttonWidth = 160;  // Slightly wider
        const buttonHeight = 50;  // Taller buttons
        const spacing = 30;       // More space between buttons
        const totalWidth = (buttonWidth + spacing) * question.answers.length;
        const startX = 400 - (totalWidth / 2) + (buttonWidth / 2);

        question.answers.forEach((answer, index) => {
            const button = this.scene.add.rectangle(
                startX + (index * (buttonWidth + spacing)),
                500,  // Moved up
                buttonWidth,
                buttonHeight,
                0x333333
            );
            
            // Create DOM element for answer text with LaTeX
            const answerDiv = document.createElement('div');
            answerDiv.style.position = 'absolute';
            answerDiv.style.left = `${button.x}px`;
            answerDiv.style.top = '500px';  // Moved up
            answerDiv.style.transform = 'translate(-50%, -50%)';
            answerDiv.style.color = '#fff';
            answerDiv.style.fontSize = '22px';  // Increased size
            answerDiv.style.width = `${buttonWidth}px`;
            answerDiv.style.textAlign = 'center';
            answerDiv.innerHTML = answer;
            document.body.appendChild(answerDiv);
            this.domElements.push(answerDiv);

            // Add hover effect with background
            const buttonBackground = this.scene.add.rectangle(
                button.x,
                button.y,
                buttonWidth,
                buttonHeight,
                0x333333
            ).setInteractive()
             .on('pointerover', () => buttonBackground.setFillStyle(0x666666))
             .on('pointerout', () => buttonBackground.setFillStyle(0x333333))
             .on('pointerdown', () => this.handleAnswer(index === question.correct));

            this.activeElements.push(button, buttonBackground);
        });
    }

    handleAnswer(isCorrect) {
        // Flash the screen green for correct, red for incorrect
        const flashColor = isCorrect ? 0x00ff00 : 0xff0000;
        const flash = this.scene.add.rectangle(400, 300, 800, 600, flashColor, 0.3);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });

        this.scene.handleAnswer(isCorrect);
        this.clearQuestion();
        
        // Display next question after a short delay
        setTimeout(() => this.displayQuestion(), 2000);
    }

    clearQuestion() {
        // Clear Phaser elements
        this.activeElements.forEach(element => element.destroy());
        this.activeElements = [];

        // Clear DOM elements
        this.domElements.forEach(element => element.remove());
        this.domElements = [];
    }
} 