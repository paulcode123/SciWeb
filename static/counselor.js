export { typeOutText, await_enter, AI_response };

const chatLog = document.getElementById('chat-log');
console.log("in counselor.js")
// function to type out text in a message div in chatLog
async function typeOutText(text, speed, targetDiv = document.getElementById('chatLog')) {
    console.log("typeOutText", text, speed, targetDiv)
    // Create message for counselor sidebar
    const sidebarLog = document.getElementById('chat-log');
    if (sidebarLog) {
        const sidebarMessage = document.createElement('div');
        sidebarMessage.className = 'ai-message';
        sidebarLog.appendChild(sidebarMessage);
        sidebarLog.scrollTop = sidebarLog.scrollHeight;
    }
    
    // Create message for main chat
    const mainMessage = document.createElement('div');
    mainMessage.className = 'ai-message';
    targetDiv.appendChild(mainMessage);
    
    // Type out text in both locations
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (sidebarLog) {
            const sidebarMessage = sidebarLog.lastElementChild;
            sidebarMessage.textContent += char;
        }
        mainMessage.textContent += char;
        await new Promise(resolve => setTimeout(resolve, speed));
    }
    
    // Scroll both chat areas
    if (sidebarLog) sidebarLog.scrollTop = sidebarLog.scrollHeight;
    targetDiv.scrollTop = targetDiv.scrollHeight;
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
    var prompts = [{"role": "system", "content": "You are the user's College Counselor. It's your responsibility to tell them their assignments, if they have any tests coming up, recent grades, their goals, etc. You can access any of their data at any time from the database with the get_data/get_grades function."}]
    var prompt = "Hello, I am your SciWeb Counselor. How can I help you today?"
    prompts.push({"role": "assistant", "content": prompt});
    typeOutText(prompt, 50);
    while (true){
        var user_response = await await_enter();
        prompts.push({"role": "user", "content": user_response});
        var ai_response = await AI_response(prompts);
        typeOutText(ai_response, 50);
    }
}

function add_user_text(text){
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    chatLog.appendChild(messageDiv);
    messageDiv.textContent = text;
}

async function await_enter(inputElement=document.getElementById('userInput')) {
    return new Promise(resolve => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter' && event.target === inputElement) {
                var input = inputElement.value;
                if (input.trim()) {  // Only process non-empty messages
                    add_user_text(input);
                    // Also add to main chat log if it exists
                    const mainChatLog = document.getElementById('chatLog');
                    if (mainChatLog) {
                        const mainMessageDiv = document.createElement('div');
                        mainMessageDiv.className = 'user-message';
                        mainMessageDiv.textContent = input;
                        mainChatLog.appendChild(mainMessageDiv);
                        mainChatLog.scrollTop = mainChatLog.scrollHeight;
                    }
                    inputElement.value = '';
                    resolve(input);
                }
            }
        };

        // Add the event listener for keydown to the input element specifically
        inputElement.addEventListener('keydown', handleKeyDown);
        
        // Clean up function
        const cleanup = () => {
            inputElement.removeEventListener('keydown', handleKeyDown);
        };
        
        // Remove the event listener after 30 seconds (timeout) or when resolved
        setTimeout(cleanup, 30000);
        return cleanup;
    });
}

async function AI_response(prompt){
    var response = await fetchRequest('/AI_function_calling', {"data": prompt})
    return response;
}


