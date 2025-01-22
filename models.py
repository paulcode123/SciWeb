from pydantic import BaseModel, Field
from typing import List, Union, Optional, Tuple

class MultipleChoiceQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str

class ShortResponseQuestion(BaseModel):
    question: str

class ResponseFormat(BaseModel):
    multiple_choice_questions: list[MultipleChoiceQuestion]
    short_response_questions: list[ShortResponseQuestion]

class QuestionEvaluation(BaseModel):
    understanding_level: str
    key_points: list[str]
    misconceptions: list[str]
    score: int

class FinalEvaluation(BaseModel):
    question_evaluations: list[QuestionEvaluation]
    overall_understanding: str
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    composite_score: int
    predicted_success: str

class BloomQuestion(BaseModel):
    question: str
    personalDifficulty: int

class ResponseTypeBloom(BaseModel):
    questions: list[BloomQuestion]

class ScoreBloom(BaseModel):
    correct: bool
    feedback: str
    correct_answer: str = "n/a"  # Default value for when answer is correct
    error_step: str = "n/a"      # The step in guide where error occurred
    new_step: str = "n/a"        # The rewritten step
    subpoints: list[str] = []    # How-to style subpoints
    mistake: str = "n/a"         # The mistake made on that step

class PracticeQuestion(BaseModel):
    question: str
    difficulty: str

class ResponseTypeNB(BaseModel):
    topic: str
    notes: list[str]
    practice_questions: list[PracticeQuestion]

class Explanation(BaseModel):
    style: str
    text: str
    score: int = 0

class ExplanationResponse(BaseModel):
    explanations: List[Explanation]

class FillInBlankQuestion(BaseModel):
    text: str
    blanks: List[str]
    blank_positions: List[int]
    explanation: str

class MatchingQuestion(BaseModel):
    terms: List[str]
    definitions: List[str]
    correct_pairs: List[Tuple[int, int]]
    explanation: str

class OrderingQuestion(BaseModel):
    items: List[str]
    correct_order: List[int]
    explanation: str

class MultipleChoiceQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str

class EquationQuestion(BaseModel):
    problem: str
    steps: List[str]
    final_answer: str
    latex: bool = True
    explanation: str

class Question(BaseModel):
    type: str
    content: Union[FillInBlankQuestion, MatchingQuestion, OrderingQuestion, MultipleChoiceQuestion, EquationQuestion]
    context: str
    difficulty: int

class ThoughtProcess(BaseModel):
    steps: List[str]
    misconceptions: List[str]
    comparison: Optional[List[Tuple[str, str]]]

class DeriveQuestion(BaseModel):
    question: str
    expected_answer: str
    category: str

class DeriveQuestions(BaseModel):
    questions: List[DeriveQuestion]

class DeriveResponse(BaseModel):
    status: str
    newLine: Optional[str] = None
    simplifiedQuestion: Optional[str] = None 

class ConceptMapNode(BaseModel):
    id: str
    label: str
    description: str
    prerequisites: List[str]
    starter_prompts: List[str]

class ConceptMap(BaseModel):
    classID: int
    unit: str
    nodes: List[ConceptMapNode]
    edges: List[Tuple[str, str]]  # (from_node_id, to_node_id)
    created_on: str
    updated_on: str

class UserNodeProgress(BaseModel):
    status: str  # "derived", "pending", "in_progress"
    date_derived: Optional[str]
    chat_history: List[str]
    user_notes: str
    mistake_history: List[dict]

class UserConceptMapProgress(BaseModel):
    OSIS: int
    classID: int
    unit: str
    node_progress: dict[str, UserNodeProgress]  # node_id -> progress
    last_accessed: str 

class ProblemMapping(BaseModel):
    problem_id: str
    required_concepts: list[str]

class ProblemMappingResponse(BaseModel):
    problem_mappings: list[ProblemMapping] 