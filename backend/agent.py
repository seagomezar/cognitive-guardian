import os
import base64
from io import BytesIO
from PIL import Image
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

class CognitiveAgent:
    def __init__(self):
        # Initialize Gemini Client
        # We assume GEMINI_API_KEY is in the environment
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("WARNING: GEMINI_API_KEY environment variable not set. API calls will fail.")
            
        self.client = genai.Client(api_key=self.api_key)
        
        # State tracking (simple list for hackathon)
        self.history = []
        self.max_history = 10
        self.last_intervention_time = 0
        
    def _decode_image(self, data_url: str) -> Image.Image:
        """Helper to convert base64 data url to PIL Image"""
        # data:image/jpeg;base64,...
        try:
            if "," in data_url:
                base64_data = data_url.split(",")[1]
            else:
                base64_data = data_url
                
            image_bytes = base64.b64decode(base64_data)
            return Image.open(BytesIO(image_bytes))
        except Exception as e:
            print(f"Error decoding image: {e}")
            return None

    async def process_frame(self, image_data_url: str, metadata: dict, timestamp: int) -> dict:
        """
        Receives a frame from the extension, adds it to history, 
        and decides if an intervention is needed.
        """
        if not self.api_key:
            return {"action": "none"}
            
        # Update history
        self.history.append({
            "timestamp": timestamp,
            "metadata": metadata
        })
        if len(self.history) > self.max_history:
            self.history.pop(0)
            
        # Don't intervene too often (cooldown of 15 seconds)
        if timestamp - self.last_intervention_time < 15000:
             return {"action": "none"}

        image = self._decode_image(image_data_url)
        if not image:
            return {"action": "none"}

        # Perform analysis with Gemini
        result = self._analyze_with_gemini(image, metadata)
        
        # If Gemini suggests an action, update cooldown
        if result and result.get("action") != "none":
            self.last_intervention_time = timestamp
            
        return result or {"action": "none"}

    def _analyze_with_gemini(self, image: Image.Image, metadata: dict) -> dict:
        """Calls Gemini API to detect issues in the current frame"""
        try:
            # We want structured JSON output from the model
            schema = {
                "type": "OBJECT",
                "properties": {
                    "action": {"type": "STRING", "description": "Action to take: 'alert', 'voice', or 'none'"},
                    "type": {"type": "STRING", "description": "Type of issue detected: 'phishing', 'fakenews', 'manipulation', 'doomscrolling', 'burnout', or 'none'"},
                    "message": {"type": "STRING", "description": "Short message to display to the user in the UI overlay"},
                    "voice_message": {"type": "STRING", "description": "Message to be spoken via text-to-speech. If missing, 'message' will be used."},
                    "confidence": {"type": "NUMBER", "description": "Confidence score 0.0 to 1.0"}
                },
                "required": ["action", "type", "message", "confidence"]
            }

            prompt = f"""
            Eres el Cognitive Guardian, un sistema inmunitario digital.
            Estás analizando esta captura de pantalla de la pestaña actual del usuario.
            URL actual: {metadata.get('url')}
            Título actual: {metadata.get('title')}
            
            Busca señales de los siguientes 2 grandes problemas:
            
            1. Problemas Externos (Manipulación):
               - Phishing / Scams / Correos Falsos (especialmente si parece pedir credenciales o urgen pagos).
               - Fake News / Desinformación / Titulares Sensacionalistas.
               - Dark Patterns (Suscripciones confusas, falsas cuentas regresivas, etc).
               
            2. Problemas Internos (Bloqueos o Patrones Nocivos):
               - Si parece que el usuario está viendo contenido de procrastinación (TikTok, infinito scroll de Twitter) y deberías sugerirle volver al trabajo.
               - Si parece estar programando y atascado en el mismo error.
               
            REGLAS IMPORTANTES:
            - Sé riguroso, no lances falsos positivos todo el tiempo. Si la página parece normal, segura o de trabajo habitual, la acción DEBE SER 'none'.
            - Si detectas Phishing evidente o Fake News manipuladora, elige action: 'alert'.
            - Si el caso es crítico o de atención (ej. Doomscrolling o Phishing), puedes devolver una advertencia amigable y útil.
            """

            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=0.2 # Lower temp for more deterministic classification
                )
            )

            # Gemini SDK will parse JSON automatically if schema matches or return text
            import json
            try:
                result_json = json.loads(response.text)
                
                # Filter out low confidence
                if result_json.get("confidence", 0) < 0.7:
                    return {"action": "none"}
                    
                return result_json
            except json.JSONDecodeError:
                print("Failed to decode JSON from model:", response.text)
                return {"action": "none"}

        except Exception as e:
            print(f"Gemini API Error: {e}")
            return {"action": "none"}
