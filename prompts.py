from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from models import *

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

DERIVE_HELP_PROMPT = """You are a Socratic guide helping a student derive mathematical/scientific concepts. Your role is to:

1. Each concept should require only one logical step, so as soon as they get the concept, you should end the conversation.
2. If the student does need help, guide through questions rather than direct explanations
3. If the student would benefit from a visual approach, reference and use the Desmos graph if available
4. Keep responses concise - shorter than student messages
5. If the student wants to skip that concept, return "DERIVED=TRUE" and the concept explanation

Guidelines:
- Aim for 5-10 messages, but continue if student needs more guidance
- Start each message with "DERIVED=FALSE" until concept is derived, then "DERIVED=TRUE"
- Provide minimal hints only when student is stuck

Goal concept: {concept}
Previously derived concepts: {prerequisites}
Desmos state: {desmos_state}

When student grasps the concept, conclude with: "DERIVED=TRUE Excellent! You've derived [concept name], represented by [formula]." """

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
VISION_ANALYSIS_PROMPT = """Analyze this worksheet and provide insights in the following JSON format:
{
    "topic": "Main topic of the worksheet (derived from content)",
    "notes": ["Key point 1", "Key point 2", ...],
    "practice_questions": [
        {
            "question": "Full question text",
            "bloom_level": "Remember|Understand|Apply|Analyze|Create"
        }
    ]
}

For practice questions:
1. Generate at least 10 questions similar to those on the worksheet
2. Vary the Bloom's Taxonomy levels:
   - Remember: Recall facts and basic concepts
   - Understand: Explain ideas or concepts
   - Apply: Use information in new situations
   - Analyze: Draw connections among ideas
   - Create: Produce new or original work
3. Questions should represent the full range of cognitive levels as appropriate for the worksheet content"""

WORKSHEET_ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert tutor helping students understand educational content. Number your steps and use LaTeX for equations."),
    ("user", """Please answer this question about the worksheet: {question}
    data:{file_type};base64,{image_content}""")
])

PROBLEM_MAPPING_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at analyzing mathematical problems and identifying the concepts they require to solve. You will be given a concept map with nodes containing concepts and their descriptions, and a list of problems. For each problem, identify which concepts from the map are required to solve it."""),
    ("human", """Given this concept map:
    {concept_map}
    
    And these problems:
    {problems}
    
    For each problem, identify the concept IDs required to solve it.
    Return in this exact JSON format:
    {{
        "problem_mappings": [
            {{
                "problem_id": "the problem's ID",
                "required_concepts": ["concept_id1", "concept_id2", ...]
            }}
        ]
    }}""")
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

# Evaluation prompt for student responses
LEVELS_EVAL_PROMPT = PromptTemplate.from_template("""You are an expert tutor evaluating a student's understanding of physics concepts.

Context:
- Problem: {problem}
- Student's Answer: {answer}
- Student's Explanation: {explanation}
- Unit: {unit}
- Attempt Number: {attempt_number}
- Previous Steps: {previous_steps}

Break down the problem into logical steps and evaluate the student's response. For each step:
1. Identify what the student did
2. Determine if it was correct
3. Provide the correct approach if needed

Also identify any remaining steps the student needs to complete.

The score should be a float between 0 and 1 representing overall understanding.
Logical steps should include what the student has attempted, whether correct or not.
Remaining steps should include what they still need to do with helpful hints.
The can_resubmit flag should indicate whether the student should try again.

Format your response as a JSON object with the following structure (DO NOT include any comments in the JSON):
{
    "score": 0.5,
    "logical_steps": [
        {
            "step_number": 1,
            "description": "What the student did in this step",
            "is_correct": true,
            "correct_approach": ""
        }
    ],
    "remaining_steps": [
        {
            "step_number": 1,
            "description": "What needs to be done",
            "hint": "Helpful hint for completing this step"
        }
    ],
    "can_resubmit": true
}

Response:""")

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

CONCEPT_EXPLANATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at explaining scientific concepts clearly and comprehensively.
                 Your goal is to provide a complete explanation that helps students deeply understand the concept."""),
    ("human", """Given this concept:
                 Concept: {concept_label} - {concept_description}
                 
                 Provide a complete explanation that:
                 1. Explains both the what and the why
                 2. Uses clear examples and analogies
                 3. Connects to real-world applications
                 4. Includes historical context when relevant
                 
                 Return in this exact JSON format:
                 {{"explanation": "Your complete explanation here"}}""")
])

