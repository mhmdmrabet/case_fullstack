"""In-memory session management.

Each session_id maps to a deque of ModelMessage objects (capped at 50) and an
asyncio.Lock to prevent concurrent writes from multiple browser tabs.
"""

import asyncio
from collections import deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from pydantic_ai.messages import ModelMessage

MAX_HISTORY = 50


@dataclass
class SessionState:
    messages: deque[ModelMessage] = field(
        default_factory=lambda: deque(maxlen=MAX_HISTORY)
    )
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}

    @asynccontextmanager
    async def session(self, session_id: str) -> AsyncIterator[deque[ModelMessage]]:
        """Acquire the lock for *session_id* and yield its message deque."""
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionState()
        state = self._sessions[session_id]
        async with state.lock:
            yield state.messages
