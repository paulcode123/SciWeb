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
    score: int
    feedback: str
    correct_answer: str

class ResponseTypeNB(BaseModel):
    topic: str
    notes: list[str]
    practice_questions: list[str]

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