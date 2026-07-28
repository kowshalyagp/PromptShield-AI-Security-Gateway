import re
from typing import Dict, Any, Tuple

# Pre-compiled regex patterns for prompt security threats
INJECTION_PATTERNS = [
    re.compile(r"(?i)\bignore\s+(?:any|all|previous)?\s*(?:instructions|rules|directives|prompts)\b"),
    re.compile(r"(?i)\bdisregard\s+(?:any|all|previous)?\s*(?:instructions|rules|directives|prompts)\b"),
    re.compile(r"(?i)\boverwrite\s+(?:system)?\s*(?:instructions|rules|directives)\b"),
    re.compile(r"(?i)\bforget\s+(?:what\s+you\s+were\s+told|previous\s+context|initial\s+rules)\b"),
    re.compile(r"(?i)\bclear\s+your\s+memory\b"),
    re.compile(r"(?i)\bnew\s+rule\s*:\b"),
    re.compile(r"(?i)\bdo\s+not\s+follow\s+instructions\b"),
    re.compile(r"(?i)\byou\s+are\s+now\s+free\s+from\b"),
]

JAILBREAK_PATTERNS = [
    re.compile(r"(?i)\bDAN\b"),  # Do Anything Now
    re.compile(r"(?i)\bdo\s+anything\s+now\b"),
    re.compile(r"(?i)\bdev\s*mode\b"),
    re.compile(r"(?i)\bdeveloper\s+mode\b"),
    re.compile(r"(?i)\bjailbreak\b"),
    re.compile(r"(?i)\bsplit\s+personality\b"),
    re.compile(r"(?i)\baim\s+mode\b"),  # Always Intelligent and Machiavellian
    re.compile(r"(?i)\bopposite\s+mode\b"),
    re.compile(r"(?i)\bunrestricted\s+mode\b"),
    re.compile(r"(?i)\bacting\s+as\s+a\s+harmful\b"),
]

ROLE_MANIPULATION_PATTERNS = [
    # Match mock dialogue roles that pretend to start a new chat turn or insert instructions
    re.compile(r"(?m)^system\s*:\s*", re.IGNORECASE),
    re.compile(r"(?m)^assistant\s*:\s*", re.IGNORECASE),
    re.compile(r"(?m)^user\s*:\s*", re.IGNORECASE),
    re.compile(r"(?m)^admin\s*:\s*", re.IGNORECASE),
    re.compile(r"(?m)^developer\s*:\s*", re.IGNORECASE),
    re.compile(r"(?m)^\[\s*system\s*\]", re.IGNORECASE),
    re.compile(r"(?m)^\[\s*assistant\s*\]", re.IGNORECASE),
]

LEAKAGE_PATTERNS = [
    re.compile(r"(?i)\breveal\s+(?:your|the)?\s*(?:system|initial|developer)?\s*(?:instructions|rules|prompt)\b"),
    re.compile(r"(?i)\bwhat\s+is\s+your\s+system\s+(?:prompt|instructions)\b"),
    re.compile(r"(?i)\boutput\s+the\s+text\s+above\b"),
    re.compile(r"(?i)\bprint\s+everything\s+before\s+this\b"),
    re.compile(r"(?i)\bhow\s+were\s+you\s+programmed\b"),
    re.compile(r"(?i)\bshow\s+your\s+initial\s+configuration\b"),
    re.compile(r"(?i)\bcopy\s+the\s+instructions\b"),
]

HARMFUL_PATTERNS = [
    re.compile(r"(?i)\bhow\s+to\s+(?:make|build|create)\s+(?:bomb|explosive|weapon|gun)\b"),
    re.compile(r"(?i)\bhow\s+to\s+hack\b"),
    re.compile(r"(?i)\bwrite\s+(?:malware|spyware|ransomware|keylogger|exploit)\b"),
    re.compile(r"(?i)\bhow\s+to\s+bypass\s+(?:authentication|antivirus|firewall)\b"),
    re.compile(r"(?i)\binstructions\s+for\s+(?:suicide|self-harm)\b"),
    re.compile(r"(?i)\bgenerate\s+(?:hate\s+speech|slurs|abusive\s+content)\b"),
]

class RulesEvaluator:
    """
    Evaluates prompts using pre-compiled regular expressions and keyword checkers.
    Extremely fast, local check (0ms overhead) to act as a first line of defense.
    """

    def evaluate_injection(self, prompt: str) -> Tuple[bool, float]:
        for pattern in INJECTION_PATTERNS:
            if pattern.search(prompt):
                return True, 1.0
        return False, 0.0

    def evaluate_jailbreak(self, prompt: str) -> Tuple[bool, float]:
        for pattern in JAILBREAK_PATTERNS:
            if pattern.search(prompt):
                return True, 1.0
        return False, 0.0

    def evaluate_role_manipulation(self, prompt: str) -> Tuple[bool, float]:
        for pattern in ROLE_MANIPULATION_PATTERNS:
            if pattern.search(prompt):
                return True, 1.0
        return False, 0.0

    def evaluate_system_leakage(self, prompt: str) -> Tuple[bool, float]:
        for pattern in LEAKAGE_PATTERNS:
            if pattern.search(prompt):
                return True, 1.0
        return False, 0.0

    def evaluate_harmful_content(self, prompt: str) -> Tuple[bool, float]:
        for pattern in HARMFUL_PATTERNS:
            if pattern.search(prompt):
                return True, 1.0
        return False, 0.0

    def scan(self, prompt: str) -> Dict[str, Any]:
        """
        Scans all threat categories and calculates score profiles.
        """
        injection_flag, injection_score = self.evaluate_injection(prompt)
        jailbreak_flag, jailbreak_score = self.evaluate_jailbreak(prompt)
        role_flag, role_score = self.evaluate_role_manipulation(prompt)
        leakage_flag, leakage_score = self.evaluate_system_leakage(prompt)
        harm_flag, harm_score = self.evaluate_harmful_content(prompt)

        is_threat = any([injection_flag, jailbreak_flag, role_flag, leakage_flag, harm_flag])
        
        # Max score is 1.0 if any category is flagged
        max_score = float(max([injection_score, jailbreak_score, role_score, leakage_score, harm_score]))

        return {
            "is_threat": is_threat,
            "max_score": max_score,
            "details": {
                "prompt_injection": injection_score,
                "jailbreak": jailbreak_score,
                "role_manipulation": role_score,
                "system_leakage": leakage_score,
                "harmful_content": harm_score
            }
        }
