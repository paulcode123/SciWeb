function showQuestion(index) {
    let question;
    const mcqCount = currentQuestions.multiple_choice.length;
    
    if (index < mcqCount) {
        // Multiple choice question
        question = currentQuestions.multiple_choice[index];
        document.getElementById('question').textContent = question.question;
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';

        question.answers.forEach((choice, i) => {
            const button = document.createElement('button');
            button.textContent = choice;
            button.classList.add('choice');
            button.addEventListener('click', () => handleAnswer(choice));
            choicesContainer.appendChild(button);
        });
    } else {
        // Short response question
        question = currentQuestions.short_response[index - mcqCount];
        document.getElementById('question').textContent = question;
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';

        const textarea = document.createElement('textarea');
        textarea.id = 'short-answer';
        textarea.rows = 4;
        textarea.cols = 50;
        choicesContainer.appendChild(textarea);

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Answer';
        submitButton.classList.add('submit-answer-button');
        submitButton.addEventListener('click', handleOpenAnswer);
        choicesContainer.appendChild(submitButton);
    }

    const totalQuestions = mcqCount + currentQuestions.short_response.length;
    document.getElementById('current-question').textContent = index + 1;
    document.getElementById('progress').textContent = `Question ${index + 1} of ${totalQuestions}`;
    document.getElementById('next-question').style.display = 'none';
}