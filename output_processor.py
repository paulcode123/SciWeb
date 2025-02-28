import json
from typing import Any, Dict, Union, Type, TypeVar
from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
import re
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

def clean_llm_response(response: Union[str, Dict[str, Any], BaseMessage]) -> str:
    """Clean and standardize LLM response for JSON parsing"""
    if isinstance(response, dict):
        result = response.get('text', str(response))
    elif hasattr(response, 'content'):
        result = response.content
    else:
        result = str(response)
    
    # Clean the response string
    if isinstance(result, str):
        # Remove markdown formatting
        result = result.replace('```json', '').replace('```', '')
        # Double escape backslashes for LaTeX
        result = result.replace('\\', '\\\\')
        # Fix duplicate braces issue
        result = result.replace('{{{', '{').replace('}}}', '}')
        result = result.replace('{{', '{').replace('}}', '}')
        # Clean up whitespace
        result = result.strip()
    
    return result

def parse_json_response(response: Union[str, Dict[str, Any], BaseMessage], model_class=None) -> Union[Dict[str, Any], Any]:
    """Parse JSON response and optionally convert to Pydantic model"""
    try:
        cleaned_response = clean_llm_response(response)
        parsed_json = json.loads(cleaned_response)
        
        # If we got a list instead of a dict, wrap it
        if isinstance(parsed_json, list):
            parsed_json = {"items": parsed_json}
        
        if model_class:
            return model_class.parse_obj(parsed_json)
        return parsed_json
        
    except json.JSONDecodeError as je:
        print(f"JSON parsing error: {je}")
        print(f"Raw response: {cleaned_response}")
        raise
    except Exception as e:
        print(f"Error processing response: {str(e)}")
        raise

def create_llm_chain(llm, prompt, memory=None):
    """Create a chain with the given LLM and prompt"""
    if isinstance(prompt, str):
        # Convert string prompt to ChatPromptTemplate
        prompt = ChatPromptTemplate.from_messages([
            ("system", prompt)
        ])
    elif isinstance(prompt, list) and all(isinstance(m, (HumanMessage, AIMessage, SystemMessage)) for m in prompt):
        # If we have a list of message objects, create a template from them
        prompt = ChatPromptTemplate.from_messages(prompt)
    
    if memory:
        return LLMChain(
            llm=llm,
            prompt=prompt,
            memory=memory,
            verbose=True
        )
    else:
        return LLMChain(
            llm=llm,
            prompt=prompt,
            verbose=True
        )

def extract_json_from_text(text: str) -> str:
    """Extract JSON from a text response that may contain additional content"""
    # Try to find JSON between curly braces
    json_match = re.search(r'\{[^{]*\}', text)
    if json_match:
        return json_match.group(0)
    
    # If no JSON found, return original text
    return text

def parse_json_response(response: str, model_type: Type[T] = None) -> Any:
    """Parse a JSON response from the LLM, optionally validating against a Pydantic model"""
    try:
        # First clean the response
        cleaned_response = clean_llm_response(response)
        
        # Try to parse as JSON
        parsed = json.loads(cleaned_response)
        
        # If a model type is provided, validate against it
        if model_type:
            return model_type.model_validate(parsed)
            
        return parsed
        
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Response content: {response}")
        raise 