from langchain.prompts import ChatPromptTemplate

# Derive
DERIVE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at creating Socratic questions that help students discover concepts through inductive reasoning."""),
    ("human", """Given this maximally diverse sample of problems from this unit:
                 {synthesis}
                 
                 Create a sequence of 30 questions where each answer should naturally lead to 
                 discovering an important concept. Each question's expected answer should be a clear, 
                 concise statement that could be added to a study guide. Questions should lead to deriving key formulas, theorems, etc.

                 Do not ask sample questions, but instead ask questions that will help students 
                 derive the concepts. Don't quiz the user on formulas either
     
                 All questions should fall into the same 6-8 categories, which signify the question type, spelled identically between questions in the same category.
                 
                 Return in this exact format:
                 {{"questions": [
                     {{"question": "question text", 
                       "expected_answer": "expected response",
                       "category": "category of the question"}}
                 ]}}""")
])


DERIVE_EVAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at evaluating student responses and guiding them toward understanding.
                 If their answer shows understanding, accept it as a study guide point.
                 If not, provide a simpler question to guide them to the concept."""),
    ("human", """Question: {question}
                 Expected Answer: {expected}
                 Student's Answer: {answer}
                 
                 If the answer demonstrates understanding (even if worded differently), return:
                 {{"status": "correct",
                    "newLine": "concise study guide point (under 10 words)"}}
                 
                 If not, return:
                 {{"status": "incorrect",
                    "simplifiedQuestion": "simpler follow-up question"}}""")
])

DERIVE_HELP_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a calm, laid-back physics teacher who fosters learning by saying less and encouraging the student to say more. Your teaching philosophy is rooted in minimal intervention, letting students drive the conversation through their reasoning and curiosity.

For each concept:

Start with a simple, open-ended question that relates to the student’s personal experience.
Respond with short prompts or follow-up questions to nudge the student toward deeper reflection, without providing direct answers.
Your responses should generally be shorter than the student's responses, max 10 words. This should encourage the student to articulate their own understanding.
Let pauses and moments of silence create space for the student to think critically and connect ideas independently.
Provide validation and subtle guidance only when necessary to keep the conversation on track.
Use a conversational and approachable tone, ensuring the student feels comfortable exploring their thoughts and ideas freely.

If this is the start of the conversation (no conversation history), begin with an engaging real-world scenario that relates to the concept, followed by a thought-provoking question."""),
    ("human", """The student is trying to understand this concept: {question}

The expected understanding is: {expected_answer}

Conversation history:
{conversation_history}

Student's message: {student_message}""")
]) 

# Explanation(GuideBuilder)
EXPLANATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert tutor trying to explain material in various ways that will reveal what sorts of explanations will make sense to the student. Return only valid JSON without markdown."),
    ("human", """Diverse sample of example problems from the unit:
    {notebook_content}
    
    Create three different explanations that:
    1. Start with concepts towards the more challenging end of the material
    2. Try both technical and intuitive explanations
    3. Differ in style from each other, but are explaining the same concept
    4. Use LaTeX for equations
    
    Return in JSON format:
    {{"explanations": [
        {{"text": "first explanation here", "target": "To explain momentum in terms of force and acceleration"}},
        {{"text": "second explanation here", "target": "To explain impulse in terms of momentum"}},
        {{"text": "third explanation here", "target": "To explain conservation of momentum in terms of collisions"}}
    ]}}""")
])

ITERATIVE_EXPLANATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert tutor trying to understand how the student perceives the material and explaining in ways that will make sense to them. Return only valid JSON without markdown."),
    ("human", """explanations that resonate with the student (highlighted in green):
    {green_highlights}
    
    explanations that the student found confusing (highlighted in red):
    {red_highlights}
    
    Diverse sample of example problems from the unit:
    {notebook_content}
    
    Student's request/feedback:
    {user_input}
    
    Create three new explanations that build on what they understood and address their feedback.
    
    Return in JSON format:
    {{"explanations": [
        {{"text": "first explanation here", "target": "Clarify the concept"}},
        {{"text": "second explanation here", "target": "Build on related concepts"}},
        {{"text": "third explanation here", "target": "Demonstrate applications"}}
    ]}}""")
])

# Unused
QUESTION_TYPE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at creating educational assessments.
                 Analyze the content and previous answers to determine the most effective
                 question type for testing understanding."""),
    ("human", """Content: {content}
                 Previous Q&A: {previous}
                 
                 Choose the most appropriate question type from:
                 - fill_in_blank
                 - matching
                 - ordering
                 - multiple_choice
                 - equation
                 
                 Return only the type as a single word.""")
])

# Notebooks
IMAGE_ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at analyzing educational worksheets. Given a {file_type} file with the following content:

{image_content}

Analyze the content and respond in the following JSON format:
{{
    "topic": "Main topic of the worksheet (derived from content)",
    "notes": ["Key point 1", "Key point 2", ...],
    "practice_questions": ["Question 1", "Question 2", ...]
}}""")
])

WORKSHEET_ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert tutor helping students understand educational content. Number your steps and use LaTeX for equations."),
    ("user", """Please answer this question about the worksheet: {question}
    data:{file_type};base64,{image_content}""")
])

SYNTHESIZE_UNIT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a test writer making a list containing as diverse of a sample of problems as possible from the notebook data. Should be 10-15 problems, maximum 800 characters.
    Plain list format, get at least 1 problem for each topic covered in the notebook."""),
    ("user", """Worksheet Data:
    {notebook_data}
    
    Synthesis:""")
])

# Levels
LEVELS_GENERATE_PROMPT = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at creating practice questions of varying difficulty levels. Return only valid JSON without markdown."),
        ("human", """Here is a maximally diverse sample of questions from the unit: {content}
         
         Create 3 {level} level questions ({level} = single step for Rookie, multi-step for Challenger, AP level for Scholar, hard AP level for Master, college level for Samurai).

Previous questions to avoid: {previous}

Return exactly this JSON structure:
{{
    "questions": [
        {{
            "question": "Question text here (use \\\\( \\\\) for LaTeX math)",
            "personalDifficulty": 3
        }}
    ]
}}

Requirements:
1. Questions must match the difficulty level description
2. Vary difficulty within the level (1-5 scale)
3. Use LaTeX for math: \\\\(x^2\\\\)
4. Questions should be applied and practical, requiring reasoning and appropriate number of steps for the level""")
])

LEVELS_EVAL_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at evaluating student responses based on difficulty level.
                     You must respond with ONLY a JSON object. Do not include markdown formatting."""),
        ("human", """For this {level}-level question ({level} = single step for Rookie, multi-step for Challenger, AP level for Scholar, hard AP level for Master, college level for Samurai): {question}
                     Evaluate this answer: {answer}. 
                     And consider how to modify this Study guide to mitigate any error: {guide}
                     
                     Return this exact JSON structure:
                     {{
                         "correct": true/false,
                         "feedback": "Detailed feedback evaluating the answer",
                        (if correct==true, the following fields are all n/a)
                         "correct_answer": "The complete correct answer",
                         "error_step": "The number/letter of the step in the guide that the student made an error on, ex. A1",
                         "new_step": "The rewritten step text",
                         "subpoints": ["How-to style subpoint 1", "How-to style subpoint 2", "..."],
                         "mistake": "The mistake the student made on that step"
                     }}""")
    ])

# Evaluate
EVALUATE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert educational assessment designer."),
    ("human", """Generate {mcq_count} multiple-choice and {written_count} short-response questions 
                 based on these topics: {topics} and examples: {examples}.""")
])

EVALUATE_FOLLOWUP_PROMPT = ChatPromptTemplate.from_messages([
        ("system", "You are an educational AI conducting a Socratic dialogue."),
        ("human", "Original question and answer: {qa_pair}\nGenerate a single follow-up question.")
    ])
    
EVALUATE_EVAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert at evaluating student understanding and providing detailed feedback."),
    ("human", """Analyze the following conversation history and provide a final evaluation:
                 {history}
                 
                 Return this exact JSON structure:
                 {{
                     "question_evaluations": [
                         {{
                             "understanding_level": "Level of understanding",
                             "key_points": ["Key point 1", "Key point 2", "..."],
                             "misconceptions": ["Misconception 1", "Misconception 2", "..."],
                             "score": integer score
                         }}
                     ],
                     "overall_understanding": "Overall understanding level",
                     "strengths": ["Strength 1", "Strength 2", "..."],
                     "weaknesses": ["Weakness 1", "Weakness 2", "..."],
                     "recommendations": ["Recommendation 1", "Recommendation 2", "..."],
                     "composite_score": integer score,
                     "predicted_success": "Predicted success level"
                 }}""")
])
