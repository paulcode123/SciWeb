const chatLog = document.getElementById('chat-log');
console.log("in counselor.js")
// function to type out text in a message div in chatLog
async function typeOutText(text, speed) {
    // make a message div
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    chatLog.appendChild(messageDiv);
    // for each character in the text, add it to the message div
    for (let i = 0; i < text.length; i++) {
        messageDiv.textContent += text[i];
        await new Promise(resolve => setTimeout(resolve, speed));
    }
}

// Toggle sidebar visibility
document.getElementById('toggle-sidebar').addEventListener('click', function() {
    const chatArea = document.getElementById('chat-area');
    chatArea.style.display = chatArea.style.display === 'none' ? 'block' : 'none';
    // if the chat Log is empty, call main
    if (chatLog.children.length === 0) {
        main_counselor();
    }
});

async function main_counselor(){
    prompts = [{"role": "system", "content": "You are the user's College Counselor. It's your responsibility to tell them their assignments, if they have any tests coming up, recent grades, their goals, etc. You can access any of their data at any time from the database with the get_data/get_grades function."}]
    prompt = "Hello, I am your SciWeb Counselor. How can I help you today?"
    prompts.push({"role": "assistant", "content": prompt});
    typeOutText(prompt, 50);
    while (true){
        user_response = await await_enter();
        prompts.push({"role": "user", "content": user_response});
        ai_response = await AI_response(prompts);
        typeOutText(ai_response, 50);
    }
}

function add_user_text(text){
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    chatLog.appendChild(messageDiv);
    messageDiv.textContent = text;
}

async function await_enter() {
    return new Promise(resolve => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter') {
                // Get the input value and clear the input field
                const input = document.getElementById('user-input').value;
                add_user_text(input);
                document.getElementById('user-input').value = '';
                resolve(input);
                // Remove the event listener after capturing the input
                document.removeEventListener('keydown', handleKeyDown);
            }
        };

        // Add the event listener for keydown
        document.addEventListener('keydown', handleKeyDown);
    });
}

async function AI_response(prompt){
    response = await fetchRequest('/AI_function_calling', {"data": prompt})
    return response;
}


