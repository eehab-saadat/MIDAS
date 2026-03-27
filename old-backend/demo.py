import streamlit as st
import requests
import base64
from PIL import Image
import io
import json
import time

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "thiagomoraes/medgemma-4b-it:Q8_0"

st.set_page_config(page_title="MIDAS", page_icon="🧠", layout="centered")

st.title("🧠 MIDAS")
st.write("Upload a medical image and provide case notes for an AI-assisted probable diagnosis with reasoning.")

uploaded_file = st.file_uploader("📁 Upload a medical image", type=["jpg", "jpeg", "png"], accept_multiple_files=False)
text_input = st.text_area(
    "🩺 Enter observations, patient history, or symptoms",
    placeholder="Example: 60-year-old female, chest pain, shortness of breath, fatigue."
)

# Initialize session state for confirmation flow
if 'awaiting_image_confirm' not in st.session_state:
    st.session_state.awaiting_image_confirm = False
if 'awaiting_text_confirm' not in st.session_state:
    st.session_state.awaiting_text_confirm = False
if 'proceed_with_generation' not in st.session_state:
    st.session_state.proceed_with_generation = False
if 'image_confirmed' not in st.session_state:
    st.session_state.image_confirmed = False
if 'text_confirmed' not in st.session_state:
    st.session_state.text_confirmed = False

def encode_image_to_base64(uploaded_file):
    """Convert uploaded image file to base64 string."""
    image = Image.open(uploaded_file).convert("RGB")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

# Show image confirmation dialog
if st.session_state.awaiting_image_confirm:
    st.warning("Continue without image?")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("✅ Yes", key="yes_image"):
            st.session_state.image_confirmed = True
            st.session_state.awaiting_image_confirm = False
            # Check if text also needs confirmation
            if not text_input:
                st.session_state.awaiting_text_confirm = True
            else:
                st.session_state.proceed_with_generation = True
            st.rerun()
    with col2:
        if st.button("❌ No", key="no_image"):
            st.session_state.awaiting_image_confirm = False
            st.session_state.image_confirmed = False
            st.session_state.text_confirmed = False
            st.session_state.proceed_with_generation = False
            st.rerun()

# Show text confirmation dialog
if st.session_state.awaiting_text_confirm:
    st.warning("Continue without text?")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("✅ Yes", key="yes_text"):
            st.session_state.text_confirmed = True
            st.session_state.awaiting_text_confirm = False
            st.session_state.proceed_with_generation = True
            st.rerun()
    with col2:
        if st.button("❌ No", key="no_text"):
            st.session_state.awaiting_text_confirm = False
            st.session_state.text_confirmed = False
            st.session_state.proceed_with_generation = False
            st.rerun()

if st.button("🔍 Generate Diagnosis"):
    # Reset confirmation states
    st.session_state.image_confirmed = False
    st.session_state.text_confirmed = False
    st.session_state.proceed_with_generation = False
    
    # Check if both are missing
    if not uploaded_file and not text_input:
        st.error("⚠️ No medical image or case details provided. Please attach a file or enter case details.")
    # Check if image is missing
    elif not uploaded_file:
        st.session_state.awaiting_image_confirm = True
        st.rerun()
    # Check if text is missing
    elif not text_input:
        st.session_state.awaiting_text_confirm = True
        st.rerun()
    # Both present, proceed directly
    else:
        st.session_state.proceed_with_generation = True
        st.rerun()

# Proceed with generation if confirmed
if st.session_state.proceed_with_generation:
    # Reset the flag
    st.session_state.proceed_with_generation = False
    
    with st.spinner("Analyzing with MedGemma..."):
        try:
            start_time = time.time()
            
            # Store image data before encoding (for later display)
            uploaded_image = None
            if uploaded_file:
                uploaded_file.seek(0)  # Reset to beginning
                uploaded_image = Image.open(uploaded_file)
            
            message = {
                "role": "user",
                "content": (
                    "You are an expert medical AI assistant. "
                    "Analyze the provided case details and the medical image (if any) "
                    "to suggest a probable diagnosis with detailed reasoning. "
                    "Format your response EXACTLY as follows:\n\n"
                    "**Probable Diagnosis:** <diagnosis>\n\n"
                    "**Reasoning:**\n\n<detailed reasoning>\n\n"
                    "Be precise, evidence-based, and explain your reasoning clearly."
                )
            }

            if text_input:
                message["content"] += f"\n\nCase details: {text_input}"

            if uploaded_file:
                uploaded_file.seek(0)
                message["images"] = [encode_image_to_base64(uploaded_file)]

            payload = {
                "model": MODEL,
                "messages": [message],
                "stream": True
            }

            diagnosis_placeholder = st.empty()
            full_response = ""

            with requests.post(OLLAMA_URL, json=payload, stream=True) as response:
                if response.status_code != 200:
                    st.error(f"Error {response.status_code}: {response.text}")
                else:
                    for line in response.iter_lines():
                        if line:
                            try:
                                data = json.loads(line.decode("utf-8"))
                                chunk = data.get("message", {}).get("content", "")
                                full_response += chunk
                                diagnosis_placeholder.markdown(f"🩻 **Probable Diagnosis & Reasoning:**\n\n{full_response}")
                            except json.JSONDecodeError:
                                pass

            end_time = time.time()
            elapsed_time = end_time - start_time

            if not full_response.strip():
                st.warning("No content received from the model.")
            else:
                if uploaded_image:
                    st.markdown("---")
                    st.markdown("### 📷 Attached Image")
                    st.image(uploaded_image, caption="Medical image used for analysis", use_container_width=True)
                
                st.write("**Disclaimer:** This analysis is for informational purposes only and should not be considered a substitute for professional medical advice. A qualified healthcare provider should always be consulted for diagnosis and treatment.")
                minutes = int(elapsed_time) // 60
                seconds = int(elapsed_time) % 60
                st.success(f"✅ Analysis complete! ⏱️ Total time: {minutes}m {seconds}s")

        except requests.exceptions.ConnectionError:
            st.error("Unable to connect to Ollama. Make sure Ollama is running locally.")
        except Exception as e:
            st.error(f"An error occurred: {e}")