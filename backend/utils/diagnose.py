import base64
from PIL import Image
import io
import requests
import json
import re

def encode_image_to_base64(uploaded_file):
    """Convert uploaded image file to base64 string."""
    image = Image.open(uploaded_file).convert("RGB")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def generate_diagnosis(data, image):
    OLLAMA_URL = "http://localhost:11434/api/chat"
    MODEL = "amsaravi/medgemma-4b-it:q6"
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
        
        message["content"] += f"\n\nThe following json depicts relevant information about the case: {data}"
        print(message["content"])
        message["images"] = [image]

        payload = {
            "model": MODEL,
            "messages": [message],
            "stream": False,
            "options": {
                "temperature": 0
            }
        }

        response = requests.post(OLLAMA_URL, json=payload)

        if response.status_code == 200:
            try:
                response_data = response.json()
                response_text = response_data.get("message", {}).get("content", "").strip()
                if not response_text:
                    return {"error": "No response received from the model. Please try again."}
                
                # Extract JSON from markdown code block if present
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    # Try to find JSON object directly in the response
                    json_match = re.search(r'\{.*"diagnosis".*"reasoning".*\}', response_text, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(0)
                    else:
                        json_str = response_text
                
                parsed_json = json.loads(json_str)
                
                if "diagnosis" not in parsed_json or "reasoning" not in parsed_json:
                    return {"error": "Invalid response format: missing 'diagnosis' or 'reasoning' field"}
                
                return parsed_json
            except json.JSONDecodeError as e:
                return {"error": f"Error parsing JSON response: {e}"}
            except ValueError as e:
                return {"error": f"Error parsing response: {e}"}
        else:
            return {"error": f"Error {response.status_code}: {response.text}"}
    except requests.exceptions.ConnectionError:
        return {"error": "Unable to connect to Ollama. Make sure Ollama is running locally."}
    except Exception as e:
        return {"error": f"An error occurred: {e}"}