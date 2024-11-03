let userInputField = document.getElementById('user-input-field');
let conversation = [
    { role: "system", content: "Your role is to help the user break down their goal into parts, set a deadline for each step, identify why it is important, and choose notification text and time. Ask the user several specific questions, one question at a time, then return a the word 'COMPLETE'" }
];
var aspirations = [];

// Add after existing variables
let timelineEvents = [];

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

// Add this function to update the timeline
function updateTimeline(step, deadline) {
    const timelineContainer = document.getElementById('timeline-events');
    const containerWidth = timelineContainer.parentElement.offsetWidth;
    
    // Convert all dates to timestamps
    const now = new Date().getTime();
    const deadlineDate = new Date(deadline).getTime();
    
    // Add new event to array and sort by date
    timelineEvents.push({ step, date: deadlineDate });
    timelineEvents.sort((a, b) => a.date - b.date);
    
    // Clear and rebuild timeline
    timelineContainer.innerHTML = '';
    
    // Find date range
    const earliestDate = Math.min(now, ...timelineEvents.map(e => e.date));
    const latestDate = Math.max(...timelineEvents.map(e => e.date));
    const timeRange = latestDate - earliestDate;
    
    timelineEvents.forEach(event => {
        const position = ((event.date - earliestDate) / timeRange) * (containerWidth - 100) + 50;
        const isPast = event.date < now;
        
        const eventEl = document.createElement('div');
        eventEl.className = `timeline-event ${isPast ? 'past' : 'future'} new`;
        eventEl.style.left = `${position}px`;
        
        eventEl.innerHTML = `
            <div class="timeline-label">
                ${event.step}
                <div class="timeline-date">${new Date(event.date).toLocaleDateString()}</div>
            </div>
            <div class="timeline-dot"></div>
        `;
        
        timelineContainer.appendChild(eventEl);
    });
}

// Modify the display_aspirations function to update timeline
function display_aspirations(data) {
    // Clear timeline events
    timelineEvents = [];
    
    console.log(data);
    const aspirationsContainer = document.getElementById('aspirations-container');
    aspirationsContainer.innerHTML = '';
    
    data.forEach(aspiration => {
        // Add each step to timeline
        aspiration.steps.forEach(step => {
            updateTimeline(step.text, step.time);
        });
        
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
