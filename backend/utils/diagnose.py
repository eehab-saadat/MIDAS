import base64
from PIL import Image
import io
import requests
import json
import re
import logging

logger = logging.getLogger(__name__)

def encode_image_to_base64(uploaded_file):
    """Convert uploaded image file to base64 string."""
    try:
        image = Image.open(uploaded_file).convert("RGB")
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        logger.info(f"  Image encoded to base64 (size: {len(encoded)} chars)")
        return encoded
    except Exception as e:
        logger.error(f"  Error encoding image: {str(e)}")
        raise

def generate_diagnosis(data, image):
    OLLAMA_URL = "http://localhost:11434/api/chat"
    MODEL = "amsaravi/medgemma-4b-it:q6"
    
    logger.info(f"  Calling MedGemma model: {MODEL}")
    logger.info(f"  Ollama URL: {OLLAMA_URL}")
    logger.info(f"  Image provided: {image is not None}")
    
    try:
        message = {
                    "role": "user",
                    "content": (
                        "You are an expert medical AI assistant. "
                        "Analyze the provided case details and the medical image (if any) "
                        "to suggest a probable diagnosis with detailed reasoning. "
                        "Format your response EXACTLY as follows, wrapped in triple backticks:\n\n"
                        "```\n"
                        '{"diagnosis": "<diagnosis>", "reasoning": "<detailed reasoning>"}\n'
                        "```\n\n"
                        "Be precise, evidence-based, and explain your reasoning clearly. "
                        "Return ONLY the JSON object wrapped in triple backticks."
                    )
                }
        
        # Only add data if it's not empty
        if data and any(data.values()):
            message["content"] += f"\n\nThe following json depicts relevant information about the case: {data}"
        else:
            message["content"] += "\n\nNote: Limited patient data available. Please provide a general assessment."
        
        logger.debug(f"  Prompt: {message['content'][:200]}...")
        
        # Only add images field if image exists (MedGemma fails if image is None)
        if image is not None:
            message["images"] = [image]

        payload = {
            "model": MODEL,
            "messages": [message],
            "stream": False,
            "options": {
                "temperature": 0
            }
        }

        logger.info("  Sending request to Ollama...")
        response = requests.post(OLLAMA_URL, json=payload, timeout=800)  # 5 minutes timeout

        if response.status_code == 200:
            logger.info("  ✅ Received response from Ollama")
            try:
                response_data = response.json()
                response_text = response_data.get("message", {}).get("content", "").strip()
                
                if not response_text:
                    logger.warning("  Empty response from model")
                    return {"error": "No response received from the model. Please try again."}
                
                logger.info(f"  Response length: {len(response_text)} chars")
                logger.debug(f"  Raw response: {response_text[:300]}...")
                
                # Extract JSON from markdown code block if present
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                    logger.info("  Found JSON in markdown code block")
                else:
                    # Try to find JSON object directly in the response
                    json_match = re.search(r'\{.*"diagnosis".*"reasoning".*\}', response_text, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(0)
                        logger.info("  Found JSON object in response")
                    else:
                        json_str = response_text
                        logger.warning("  No JSON structure found, using raw response")
                
                parsed_json = json.loads(json_str)
                
                if "diagnosis" not in parsed_json or "reasoning" not in parsed_json:
                    logger.error("  Invalid response format: missing required fields")
                    return {"error": "Invalid response format: missing 'diagnosis' or 'reasoning' field"}
                
                logger.info(f"  ✅ Successfully parsed diagnosis: {parsed_json['diagnosis'][:50]}...")
                return parsed_json
                
            except json.JSONDecodeError as e:
                logger.error(f"  JSON decode error: {str(e)}")
                logger.error(f"  Failed to parse: {response_text[:200]}...")
                return {"error": f"Error parsing JSON response: {e}"}
            except ValueError as e:
                logger.error(f"  Value error: {str(e)}")
                return {"error": f"Error parsing response: {e}"}
        else:
            logger.error(f"  ❌ Ollama returned error {response.status_code}")
            logger.error(f"  Response: {response.text[:200]}")
            return {"error": f"Error {response.status_code}: {response.text}"}
            
    except requests.exceptions.ConnectionError:
        logger.error("  ❌ Cannot connect to Ollama")
        return {"error": "Unable to connect to Ollama. Make sure Ollama is running locally on port 11434."}
    except requests.exceptions.Timeout:
        logger.error("  ❌ Request to Ollama timed out")
        return {"error": "Request timed out. The model may be processing. Please try again."}
    except Exception as e:
        logger.error(f"  ❌ Unexpected error: {str(e)}", exc_info=True)
        return {"error": f"An error occurred: {e}"}