import time
import logging
from collections import defaultdict
from typing import Dict, List, Tuple
from app.config import settings

logger = logging.getLogger("promptshield.ratelimiter")

class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter to prevent API abuse.
    Tracks requests per client IP address. Thread-safe in single-process async loops.
    """
    def __init__(self, window_seconds: int = None, max_requests: int = None):
        self.window = window_seconds if window_seconds is not None else settings.RATE_LIMIT_WINDOW_SECONDS
        self.max_requests = max_requests if max_requests is not None else settings.RATE_LIMIT_MAX_REQUESTS
        # Map of client_ip -> list of float timestamps
        self.history: Dict[str, List[float]] = defaultdict(list)

    def check_limit(self, client_ip: str) -> Tuple[bool, int]:
        """
        Checks if the client has exceeded request limits.
        Returns:
            Tuple[bool, int]: (is_blocked, current_request_count)
        """
        now = time.time()
        client_history = self.history[client_ip]
        
        # Filter timestamps outside the sliding window
        clean_history = [t for t in client_history if now - t < self.window]
        self.history[client_ip] = clean_history

        # If count exceeds limits, do not register this attempt and return block
        if len(clean_history) >= self.max_requests:
            logger.warning(f"Rate limit hit for IP: {client_ip}. Limit: {self.max_requests}/{self.window}s.")
            return True, len(clean_history)

        # Otherwise register current request
        self.history[client_ip].append(now)
        return False, len(clean_history) + 1
