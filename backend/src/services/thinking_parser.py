"""State machine that splits LLM text deltas into 'thinking' vs 'text' events.

The LLM wraps its reasoning in <thinking>...</thinking> tags. Because the text
arrives as a stream of small chunks, a tag like <thinking> can be split across
two consecutive chunks (e.g. "<think" then "ing>content"). This parser handles
that transparently by holding a lookahead buffer of at most len("</thinking>")
characters before emitting anything.
"""

from typing import Literal

DeltaKind = Literal["thinking", "text"]
DeltaEvent = tuple[DeltaKind, str]

_OPEN_TAG = "<thinking>"
_CLOSE_TAG = "</thinking>"


def _safe_prefix(text: str, tag: str) -> str:
    """Return the longest prefix of *text* that cannot be the start of *tag*.

    Any suffix of the returned prefix is guaranteed not to be a prefix of tag,
    so it is safe to emit without waiting for more input.
    """
    for i in range(len(text), 0, -1):
        if tag.startswith(text[len(text) - i :]):
            return text[: len(text) - i]
    return text


class ThinkingStreamParser:
    """Feed text chunks one at a time; get back typed delta events."""

    def __init__(self) -> None:
        self._buf: str = ""
        self._in_thinking: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def feed(self, chunk: str) -> list[DeltaEvent]:
        """Process a new chunk. Returns typed delta events ready to emit."""
        self._buf += chunk
        return self._drain()

    def flush(self) -> list[DeltaEvent]:
        """Flush remaining buffer at end of stream (no more chunks coming)."""
        if not self._buf:
            return []
        kind: DeltaKind = "thinking" if self._in_thinking else "text"
        events: list[DeltaEvent] = [(kind, self._buf)]
        self._buf = ""
        return events

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _drain(self) -> list[DeltaEvent]:
        events: list[DeltaEvent] = []
        while True:
            tag = _CLOSE_TAG if self._in_thinking else _OPEN_TAG
            idx = self._buf.find(tag)

            if idx == -1:
                # Tag not (yet) in buffer — emit only what's definitely safe.
                safe = _safe_prefix(self._buf, tag)
                if safe:
                    kind: DeltaKind = "thinking" if self._in_thinking else "text"
                    events.append((kind, safe))
                    self._buf = self._buf[len(safe):]
                break  # need more input before we can decide

            # Complete tag found: emit everything before it, then flip state.
            if idx > 0:
                kind = "thinking" if self._in_thinking else "text"
                events.append((kind, self._buf[:idx]))
            self._buf = self._buf[idx + len(tag):]
            self._in_thinking = not self._in_thinking

        return events
