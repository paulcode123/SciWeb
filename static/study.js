class QuestionRenderer {
    constructor() {
        this.mathJaxConfig();
    }

    mathJaxConfig() {
        window.MathJax = {
            tex: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']]
            }
        };
    }

    render(question) {
        const container = document.getElementById('question-container');
        container.innerHTML = '';
        
        // Add context if available
        if (question.context) {
            const context = document.createElement('div');
            context.className = 'question-context';
            context.textContent = question.context;
            container.appendChild(context);
        }
        
        // Render based on question type
        switch (question.type) {
            case 'fill_in_blank':
                this.renderFillInBlank(question.content);
                break;
            case 'matching':
                this.renderMatching(question.content);
                break;
            case 'ordering':
                this.renderOrdering(question.content);
                break;
            case 'multiple_choice':
                this.renderMultipleChoice(question.content);
                break;
            case 'equation':
                this.renderEquation(question.content);
                break;
        }
    }

    renderFillInBlank(content) {
        const container = document.getElementById('question-container');
        let text = content.text;
        let currentPos = 0;
        
        content.blank_positions.forEach((pos, index) => {
            // Add text before blank
            container.appendChild(document.createTextNode(text.slice(currentPos, pos)));
            
            // Add input field
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'blank-input';
            input.dataset.blankIndex = index;
            container.appendChild(input);
            
            currentPos = pos + 3; // Skip "___"
        });
        
        // Add remaining text
        container.appendChild(document.createTextNode(text.slice(currentPos)));
    }

    renderMatching(content) {
        const container = document.getElementById('question-container');
        const termsContainer = document.createElement('div');
        const defsContainer = document.createElement('div');
        
        termsContainer.className = 'matching-terms';
        defsContainer.className = 'matching-definitions';
        
        content.terms.forEach((term, index) => {
            const termDiv = document.createElement('div');
            termDiv.className = 'matching-item';
            termDiv.textContent = term;
            termDiv.draggable = true;
            termDiv.dataset.index = index;
            termsContainer.appendChild(termDiv);
        });
        
        content.definitions.forEach((def, index) => {
            const defDiv = document.createElement('div');
            defDiv.className = 'matching-item matching-target';
            defDiv.textContent = def;
            defDiv.dataset.index = index;
            defsContainer.appendChild(defDiv);
        });
        
        container.appendChild(termsContainer);
        container.appendChild(defsContainer);
        
        this.setupDragAndDrop();
    }

    // ... (I'll continue with the remaining render methods and thought process display)
} 