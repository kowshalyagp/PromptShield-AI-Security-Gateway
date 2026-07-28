import asyncio
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from google.api_core import exceptions
from app.config import settings

logger = logging.getLogger("promptshield.gemini")

class GeminiServiceError(Exception):
    """Base exception for Gemini service issues."""
    pass

class GeminiConfigError(GeminiServiceError):
    """Raised when API key is missing or invalid."""
    pass

class GeminiRateLimitError(GeminiServiceError):
    """Raised when API rate limits are hit."""
    pass

class GeminiTimeoutError(GeminiServiceError):
    """Raised when API requests time out."""
    pass

class GeminiNetworkError(GeminiServiceError):
    """Raised when network transport issues occur."""
    pass

class GeminiService:
    """
    Dedicated Service Layer for communicating with Google Gemini API.
    Handles client initialization, configuration checks, and API exceptions.
    """
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = "gemini-1.5-flash"
        self._initialized = False
        self._model = None
        self._bootstrap()

    def _bootstrap(self) -> None:
        """Initializes the Gemini client if the API key is configured."""
        if not self.api_key:
            logger.warning("Gemini API Key is not configured. Downstream calls will fail.")
            return
        
        try:
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(self.model_name)
            self._initialized = True
            logger.info(f"Gemini client initialized with model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to configure Gemini client: {str(e)}")
            self._initialized = False

    async def generate_response(self, prompt: str, timeout: float = 10.0) -> str:
        """
        Sends a prompt to Gemini model asynchronously and returns the response string.
        Executes synchronous SDK call inside a separate thread to prevent blocking event loop.
        """
        if not self._initialized or not self._model:
            raise GeminiConfigError("Gemini API client is not configured. Please check your VITE_API_KEY or .env file.")

        try:
            # Wrap synchronous SDK call in asyncio.to_thread for thread-safety in async environments
            response = await asyncio.wait_for(
                asyncio.to_thread(self._model.generate_content, prompt),
                timeout=timeout
            )
            
            if not response or not response.text:
                raise GeminiServiceError("Received empty response or prompt was blocked by safety filters.")
                
            return response.text

        except asyncio.TimeoutError:
            logger.error("Gemini API call timed out.")
            raise GeminiTimeoutError("Request to Gemini API timed out.")
            
        except exceptions.InvalidArgument as e:
            logger.error(f"Invalid argument or API key error: {str(e)}")
            raise GeminiConfigError("Invalid Gemini API Key or request parameters provided.")
            
        except exceptions.ResourceExhausted as e:
            logger.error(f"Gemini Rate limit hit: {str(e)}")
            raise GeminiRateLimitError("Rate limit exceeded for Gemini API. Please try again later.")
            
        except exceptions.ServiceUnavailable as e:
            logger.error(f"Gemini service unavailable: {str(e)}")
            raise GeminiNetworkError("Google Gemini service is temporarily unavailable.")
            
        except exceptions.GoogleAPICallError as e:
            logger.error(f"General Google API Call Error: {str(e)}")
            raise GeminiServiceError(f"Gemini API returned error: {str(e)}")
            
        except Exception as e:
            logger.error(f"Unexpected error in Gemini service: {str(e)}")
            raise GeminiServiceError(f"Unexpected downstream model error: {str(e)}")
