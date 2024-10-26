let userInputField = document.getElementById('user-input-field');
let conversation = [
    { role: "system", content: "Your role is to help the user break down their goal into parts, set a deadline for each step, identify why it is important, and choose notification text and time. Ask the user several specific questions, one question at a time, then return a the word 'COMPLETE'" }
];
var aspirations = [];

document.getElementById('send-response').addEventListener('click', function() { // when the button is clicked
    var userInput = userInputField.value;
    userInputField.value = '';
    if (userInput) {
        // Add user input to the conversation
        conversation.push({ role: "user", content: userInput }); // add user input to the conversation
        
        // Display user input in chat log
        const chatLog = document.getElementById('chat-log-div');
        console.log(chatLog);
        chatLog.innerHTML += `<div class="user-message">${userInput}</div>`;
        
        // Send conversation to AI
        fetchRequest('/AI', { data: conversation })
        .then(data => {
            console.log(data);
            // Add AI response to conversation
            conversation.push({ role: "assistant", content: data });
            
            // Display AI response in chat log
            chatLog.innerHTML += `<div class="ai-message">${data}</div>`;
            // automatically scroll to the bottom of the chat log
            chatLog.scrollTop = chatLog.scrollHeight;

            if(data.includes('COMPLETE')){
                // add data extraction prompt
                conversation.push({ role: "system", content: "Return the goal name, description, each step and deadline, importance, and notification text and time." });
                fetchRequest('/set_aspirations', { data: conversation })
                .then(data => {
                    aspirations.push(data);
                    display_aspirations(aspirations);
                })
            }
        })
        .catch(error => console.error('Error:', error));
    } else {
        alert('Please enter a response.');
    }
});


// when key is pressed in userInput, send response
userInputField.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        document.getElementById('send-response').click();
        console.log("Enter key pressed");
    }
});

function get_aspirations(){
    fetchRequest('/data', { data: "Aspirations" })
    .then(data => {
        aspirations = data['Aspirations']
        // clear the aspirations div
        const aspirationsContainer = document.getElementById('aspirations-container');
        aspirationsContainer.innerHTML = '';
        
        display_aspirations(aspirations);
    })
}

function display_aspirations(data){
    console.log(data);
    const aspirationsContainer = document.getElementById('aspirations-container');
    aspirationsContainer.innerHTML = '';
    data.forEach(aspiration => {
        let stepsHtml = aspiration.steps.map((step, index) => `
            <li>
                <i class="fas fa-tasks"></i> ${step.text}
                <span class="deadline"><i class="far fa-calendar-alt"></i> ${step.time}</span>
            </li>
        `).join('');

        aspirationsContainer.innerHTML += `
            <div class="aspiration">
                <h3><i class="fas fa-star"></i> ${aspiration.goal}</h3>
                <p><i class="fas fa-info-circle"></i> ${aspiration.description}</p>
                <p><i class="fas fa-exclamation-circle"></i> Importance: ${aspiration.importance}</p>
                <ul class="steps">${stepsHtml}</ul>
            </div>
        `;
    });
}

get_aspirations();
