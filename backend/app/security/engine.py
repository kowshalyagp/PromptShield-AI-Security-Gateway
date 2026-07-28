from typing import Dict, Any
from app.config import settings
from app.security.rules import RulesEvaluator
from app.security.semantic import SemanticEvaluator
from app.security.classifier import ModelClassifier
from app.security.guardrails import ResponseGuardrail

class SecurityEngine:
    """
    Orchestrates the PromptShield safety pipeline.
    Combines rule validation, semantic overlap checks, and LLM classifiers
    to calculate threat risk categories.
    """

    def __init__(self):
        self.rules = RulesEvaluator()
        self.semantic = SemanticEvaluator()
        self.classifier = ModelClassifier()
        self.response_guard = ResponseGuardrail()

    async def scan_prompt(self, prompt: str, policies: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Runs complete inspection suite on user prompt.
        """
        # 1. Run Regex check (Fast)
        rules_report = self.rules.scan(prompt)

        # 2. Run Semantic match
        semantic_report = self.semantic.evaluate(prompt)

        # 3. Run Classifier model (Mocked)
        classifier_report = await self.classifier.classify(prompt)

        # Compute Category Scores (Max of all methods)
        sub_scores = {
            "prompt_injection": max(rules_report["details"]["prompt_injection"], classifier_report.scores.prompt_injection),
            "jailbreak": max(rules_report["details"]["jailbreak"], semantic_report["risk_score"], classifier_report.scores.jailbreak),
            "role_manipulation": max(rules_report["details"]["role_manipulation"], classifier_report.scores.role_manipulation),
            "system_leakage": max(rules_report["details"]["system_leakage"], classifier_report.scores.system_leakage),
            "harmful_content": max(rules_report["details"]["harmful_content"], classifier_report.scores.harmful_content)
        }

        # Calculate composite score (0-100)
        # Weights: Injection (30%), Jailbreak (30%), Leakage (20%), Harmful (15%), Role (5%)
        raw_composite = (
            sub_scores["prompt_injection"] * 30 +
            sub_scores["jailbreak"] * 30 +
            sub_scores["system_leakage"] * 20 +
            sub_scores["harmful_content"] * 15 +
            sub_scores["role_manipulation"] * 5
        )

        # Scale raw score. If any category is explicitly flagged via regex or model classifier, 
        # boost composite score to reflect the threat severity.
        composite_score = int(raw_composite)
        if rules_report["is_threat"] or classifier_report.is_malicious:
            composite_score = max(composite_score, 80)

        # Set threat classification
        if composite_score >= settings.RISK_THRESHOLD_MALICIOUS:
            classification = "Malicious"
            status = "Blocked"
        elif composite_score >= settings.RISK_THRESHOLD_SUSPICIOUS:
            classification = "Suspicious"
            status = "Allowed"  # Under standard policy, suspicious prompts can be flagged but permitted
        else:
            classification = "Safe"
            status = "Allowed"

        # Determine primary threat type
        primary_threat = "Safe"
        max_sub = 0.0
        for category, score in sub_scores.items():
            if score > max_sub:
                max_sub = score
                primary_threat = category.replace("_", " ").title()

        if classification == "Safe":
            primary_threat = "Safe"

        return {
            "risk_score": composite_score,
            "threat_category": classification,
            "threat_type": primary_threat,
            "status": status,
            "sub_scores": sub_scores,
            "details": {
                "rules": rules_report,
                "semantic": semantic_report,
                "classifier": classifier_report.model_dump()
            }
        }
