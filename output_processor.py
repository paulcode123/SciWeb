import json
from typing import Any, Dict, Union
from langchain.schema import BaseMessage

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

def create_llm_chain(llm, prompt, verbose=True):
    """Create a LangChain chain with standard configuration"""
    from langchain.chains import LLMChain
    return LLMChain(
        llm=llm,
        prompt=prompt,
        verbose=verbose
    ) 