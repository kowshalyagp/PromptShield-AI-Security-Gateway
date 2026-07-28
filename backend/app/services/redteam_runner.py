import json
import os
import time
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.redteam import RedTeamReport, RedTeamResult
from app.security.engine import SecurityEngine

logger = logging.getLogger("promptshield.redteam.runner")

class RedTeamRunner:
    """
    Executes red teaming prompts from the dataset against the SecurityEngine
    and persists detailed diagnostic logs and aggregates reports to SQLite.
    """

    DATASET_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "security",
        "redteam_dataset.json"
    )

    def __init__(self):
        self.engine = SecurityEngine()

    def load_dataset(self) -> list:
        try:
            with open(self.DATASET_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load redteam dataset: {str(e)}")
            return []

    async def execute_suite(self, db: AsyncSession, category_filter: str | None = None) -> RedTeamReport:
        dataset = self.load_dataset()
        if category_filter:
            dataset = [item for item in dataset if item["category"].lower() == category_filter.lower()]

        if not dataset:
            raise ValueError(f"No prompts found for red team suite execution (category: {category_filter})")

        # Create master report object
        report = RedTeamReport(
            timestamp=datetime.utcnow(),
            category=category_filter,
            total_tests=len(dataset),
            detected_count=0,
            blocked_count=0,
            false_positives=0,
            false_negatives=0,
            avg_latency_ms=0.0
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        total_latency = 0
        passed_count = 0
        
        # Category metrics tracking
        category_metrics = {}  # {category: {total: 0, passed: 0}}

        for item in dataset:
            cat = item["category"]
            if cat not in category_metrics:
                category_metrics[cat] = {"total": 0, "passed": 0}
            category_metrics[cat]["total"] += 1

            start_time = time.perf_counter()
            # Perform security engine prompt scan
            scan_result = await self.engine.scan_prompt(item["prompt"])
            latency = int((time.perf_counter() - start_time) * 1000)
            total_latency += latency

            verdict = scan_result["threat_category"]  # Malicious, Suspicious, Safe
            status = scan_result["status"]  # Allowed / Blocked
            risk_score = scan_result["risk_score"]

            # Map safety decision evaluation
            is_blocked = (status == "Blocked")
            expected_blocked = (item["expected_outcome"] == "Blocked")
            
            test_passed = (is_blocked == expected_blocked)
            test_status = "Passed" if test_passed else "Failed"

            if test_passed:
                passed_count += 1
                category_metrics[cat]["passed"] += 1

            # Metric counters
            if is_blocked:
                report.blocked_count += 1

            # If prompt is malicious/suspicious, we count it as "detected"
            if verdict in ["Malicious", "Suspicious"]:
                report.detected_count += 1

            # Detailed false positives / false negatives mapping
            if not expected_blocked and is_blocked:
                # Expected allowed but blocked -> False Positive
                report.false_positives += 1
            elif expected_blocked and not is_blocked:
                # Expected blocked but allowed -> False Negative
                report.false_negatives += 1

            # Log individual test result row
            result_row = RedTeamResult(
                report_id=report.id,
                attack_id=item["attack_id"],
                category=cat,
                prompt=item["prompt"],
                risk_score=risk_score,
                threat_classification=verdict,
                decision=status,
                gemini_called=(not is_blocked),
                latency_ms=max(latency, 1),
                detection_reason=scan_result.get("threat_type", "Safe"),
                status=test_status
            )
            db.add(result_row)

        # Compute summary averages
        report.avg_latency_ms = round(total_latency / len(dataset), 1)
        
        # Format category accuracy mapping
        accuracy_map = {}
        for cat, metrics in category_metrics.items():
            pct = round((metrics["passed"] / metrics["total"]) * 100, 1)
            accuracy_map[cat] = pct
        
        report.category_accuracy = json.dumps(accuracy_map)

        await db.commit()
        await db.refresh(report)
        return report
