import re
from typing import Dict, Any

# Patterns that might show up in LLM responses if system prompt leaked
LEAKAGE_INDICATORS = [
    re.compile(r"(?i)\bmy\s+instructions\s+are\s+to\b"),
    re.compile(r"(?i)\bi\s+am\s+programmed\s+to\b"),
    re.compile(r"(?i)\bunder\s+no\s+circumstances\b"),
    re.compile(r"(?i)\bthe\s+developer\s+guidelines\b"),
]

class ResponseGuardrail:
    """
    Checks outgoing responses from downstream models to prevent sensitive
    data leakage or harmful outputs.
    """

    def verify_response(self, response_text: str) -> Dict[str, Any]:
        """
        Inspects output text for leakage indicators.
        """
        leaked = False
        for indicator in LEAKAGE_INDICATORS:
            if indicator.search(response_text):
                leaked = True
                break

        return {
            "safe": not leaked,
            "leakage_detected": leaked,
            "remediation": "Security Policy Block: Output response contains system rules leakage." if leaked else None
        }
