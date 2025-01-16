export { typeOutText, await_enter, AI_response };

// if url is / (index.html), then we are in the main page, set isMainPage to true
const isMainPage = window.location.pathname === '/';
console.log("in counselor.js")

// function to type out text in a message div in chatLog
async function typeOutText(text, speed, targetDiv = document.getElementById('chat-log')) {
    console.log("typeOutText", text, speed, targetDiv);
    
    // Create message div
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    targetDiv.appendChild(messageDiv);
    
    // Type out text
    for (let i = 0; i < text.length; i++) {
        messageDiv.textContent += text[i];
        await new Promise(resolve => setTimeout(resolve, speed));
    }
    
    // Scroll chat area
    targetDiv.scrollTop = targetDiv.scrollHeight;
}

// Toggle sidebar visibility - only add event listener if sidebar exists
const toggleButton = document.getElementById('toggle-sidebar');
if (toggleButton) {
    toggleButton.addEventListener('click', function() {
        const chatArea = document.getElementById('chat-area');
        chatArea.style.display = chatArea.style.display === 'none' ? 'block' : 'none';
        // if the chat Log is empty, call main
        const chatLog = document.getElementById('chat-log');
        if (chatLog && chatLog.children.length === 0) {
            main_counselor();
        }
    });
}

async function main_counselor(){
    const chatLog = document.getElementById('chat-log');
    var prompts = [{"role": "system", "content": "You are the user's College Counselor. It's your responsibility to tell them their assignments, if they have any tests coming up, recent grades, their goals, etc. You can access any of their data at any time from the database with the get_data/get_grades function."}]
    var prompt = "Hello, I am your SciWeb Counselor. How can I help you today?"
    prompts.push({"role": "assistant", "content": prompt});
    typeOutText(prompt, 50, chatLog);
    while (true){
        var user_response = await await_enter(document.getElementById('user-input'), chatLog);
        prompts.push({"role": "user", "content": user_response});
        var ai_response = await AI_response(prompts);
        typeOutText(ai_response, 50, chatLog);
    }
}

function add_user_text(text, chatLog){
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    chatLog.appendChild(messageDiv);
    messageDiv.textContent = text;
}

async function await_enter(inputElement=document.getElementById('user-input'), chatLog=document.getElementById('chat-log')) {
    return new Promise(resolve => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter' && event.target === inputElement) {
                var input = inputElement.value;
                if (input.trim()) {  // Only process non-empty messages
                    add_user_text(input, chatLog);
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


