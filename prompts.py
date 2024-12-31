from langchain.prompts import ChatPromptTemplate

DERIVE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at creating Socratic questions that help students discover concepts.
                 Create questions that build upon each other to help students derive key concepts."""),
    ("human", """Given this maximally diverse sample of problems from this unit:
                 {synthesis}
                 
                 Create a sequence of 30 questions where each answer should naturally lead to 
                 discovering an important concept. Each question's expected answer should be a clear, 
                 concise statement that could be added to a study guide. Questions should lead to deriving key formulas, theorems, etc.
                 
                 Do not ask sample questions, but instead ask questions that will help students 
                 derive the concepts.
     
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