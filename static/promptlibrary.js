// General academic prompts that apply to any subject
const generalPrompts = [
    {
        title: "Concept Explanation",
        text: "Can you explain [concept] in simple terms and provide some real-world examples?",
        description: "Get a clear explanation of any academic concept"
    },
    {
        title: "Study Strategy",
        text: "What are the most effective ways to study [topic], and how should I structure my learning approach?",
        description: "Get personalized study strategies"
    },
    {
        title: "Practice Problems",
        text: "Can you generate practice problems for [topic] at my current understanding level?",
        description: "Get tailored practice problems"
    },
    {
        title: "Topic Connection",
        text: "How does [topic] connect to other concepts we've learned in this subject?",
        description: "Understand relationships between topics"
    },
    {
        title: "Exam Preparation",
        text: "What are the key points I should focus on when preparing for an exam on [topic]?",
        description: "Get exam preparation guidance"
    }
];

// Subject-specific prompts
const subjectPrompts = {
    "Mathematics": [
        {
            title: "Problem-Solving Steps",
            text: "Can you help me break down this math problem and show me the steps to solve it: [problem]?",
            description: "Get step-by-step problem solving help"
        },
        {
            title: "Proof Understanding",
            text: "Can you explain the logic and steps behind the proof of [theorem/concept]?",
            description: "Understand mathematical proofs"
        }
    ],
    "Science": [
        {
            title: "Scientific Method",
            text: "How would you design an experiment to test [hypothesis] about [topic]?",
            description: "Design scientific experiments"
        },
        {
            title: "Process Explanation",
            text: "Can you explain the process of [scientific process] step by step?",
            description: "Understand scientific processes"
        }
    ],
    "English": [
        {
            title: "Literary Analysis",
            text: "Can you help me analyze the [literary element] in [text/passage]?",
            description: "Analyze literary elements"
        },
        {
            title: "Writing Feedback",
            text: "Can you review this paragraph and suggest improvements: [paragraph]?",
            description: "Get writing feedback"
        }
    ],
    "History": [
        {
            title: "Event Analysis",
            text: "What were the causes and consequences of [historical event]?",
            description: "Analyze historical events"
        },
        {
            title: "Historical Context",
            text: "How did [historical factor] influence [event/period]?",
            description: "Understand historical context"
        }
    ]
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await initializePromptLibrary();
});

async function initializePromptLibrary() {
    // Load user's classes
    const classData = await fetchRequest('/data', {'data': 'Classes'});
    const classSelector = document.getElementById('class-selector');
    
    // Populate class selector
    if (classData && classData.Classes) {
        Object.values(classData.Classes).forEach(classInfo => {
            const option = document.createElement('option');
            option.value = classInfo.name;
            option.textContent = classInfo.name;
            classSelector.appendChild(option);
        });
    }

    // Display general prompts
    displayGeneralPrompts();

    // Set up class selector event listener
    classSelector.addEventListener('change', (e) => {
        displaySubjectPrompts(e.target.value);
    });
}

function displayGeneralPrompts() {
    const container = document.getElementById('general-prompts');
    container.innerHTML = ''; // Clear existing prompts

    generalPrompts.forEach(prompt => {
        const card = createPromptCard(prompt);
        container.appendChild(card);
    });
}

function displaySubjectPrompts(subject) {
    const container = document.getElementById('subject-prompts');
    container.innerHTML = ''; // Clear existing prompts

    // Get subject-specific prompts
    const prompts = subjectPrompts[getSubjectCategory(subject)] || [];
    
    prompts.forEach(prompt => {
        const card = createPromptCard(prompt);
        container.appendChild(card);
    });
}

function createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    
    card.innerHTML = `
        <h4>${prompt.title}</h4>
        <p>${prompt.description}</p>
    `;

    // Add click handler to start conversation
    card.addEventListener('click', () => {
        startPromptConversation(prompt.text);
    });

    return card;
}

function getSubjectCategory(className) {
    // Map class names to general subject categories
    const subjectMappings = {
        'math': 'Mathematics',
        'algebra': 'Mathematics',
        'geometry': 'Mathematics',
        'calculus': 'Mathematics',
        'physics': 'Science',
        'chemistry': 'Science',
        'biology': 'Science',
        'english': 'English',
        'literature': 'English',
        'history': 'History',
        'social studies': 'History'
    };

    const lowerClassName = className.toLowerCase();
    for (const [key, value] of Object.entries(subjectMappings)) {
        if (lowerClassName.includes(key)) {
            return value;
        }
    }
    return 'General';
}

function startPromptConversation(promptTemplate) {
    // Get the selected class if any
    const classSelector = document.getElementById('class-selector');
    const selectedClass = classSelector.value;

    // Replace [topic] or similar placeholders with the class name if selected
    let finalPrompt = promptTemplate;
    if (selectedClass) {
        finalPrompt = promptTemplate.replace(/\[(topic|concept|subject)\]/gi, selectedClass);
    }

    // Find the chat input area
    const chatInput = document.getElementById('user-input');
    if (chatInput) {
        // Set the prompt in the input area
        chatInput.value = finalPrompt;
        
        // Trigger the AI counselor sidebar to open
        const sidebar = document.getElementById('ai-counselor-sidebar');
        if (sidebar && !sidebar.classList.contains('active')) {
            document.getElementById('toggle-sidebar').click();
        }
        
        // Focus the input
        chatInput.focus();
    }
} 