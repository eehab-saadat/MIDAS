import os
import base64
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage


def get_mime_type(file_path):
    """Get MIME type based on file extension."""
    extension = os.path.splitext(file_path)[1].lower()
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.webm': 'audio/webm',
    }
    return mime_types.get(extension, 'audio/mpeg')


def transcribe_audio(audio_path):
    """Transcribe audio file to text using Gemini 2.0 Flash model."""
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyCEYPOWeK3Jgi1VM7466M4PSOWomeYkgwY"
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")
    
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0,
        google_api_key=api_key
    )
    
    with open(audio_path, "rb") as audio_file:
        audio_data = audio_file.read()
    
    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    mime_type = get_mime_type(audio_path)
    
    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": "Transcribe the following audio file accurately. Return only the transcription text without any additional commentary."
            },
            {
                "type": "file",
                "source_type": "base64",
                "mime_type": mime_type,
                "data": audio_base64
            }
        ]
    )
    response = model.invoke([message])
    return response.content