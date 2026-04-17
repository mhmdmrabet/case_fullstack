"""Unit tests for ThinkingStreamParser.

The critical case is tag split across chunk boundaries — the parser must not
emit partial tags as text and must reconstruct them from successive chunks.
"""

from src.services.thinking_parser import ThinkingStreamParser

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def feed_all(chunks: list[str]) -> list[tuple[str, str]]:
    """Feed all chunks then flush; return the full list of (kind, text) events."""
    parser = ThinkingStreamParser()
    events: list[tuple[str, str]] = []
    for chunk in chunks:
        events.extend(parser.feed(chunk))
    events.extend(parser.flush())
    return events


def text_only(events):
    return "".join(t for k, t in events if k == "text")


def thinking_only(events):
    return "".join(t for k, t in events if k == "thinking")


# ---------------------------------------------------------------------------
# Basic cases
# ---------------------------------------------------------------------------


def test_plain_text_no_tags():
    events = feed_all(["Hello world"])
    assert text_only(events) == "Hello world"
    assert thinking_only(events) == ""


def test_thinking_only():
    events = feed_all(["<thinking>I think</thinking>"])
    assert thinking_only(events) == "I think"
    assert text_only(events) == ""


def test_text_then_thinking_then_text():
    events = feed_all(["Before <thinking>reasoning</thinking> after"])
    assert thinking_only(events) == "reasoning"
    assert text_only(events) == "Before  after"


def test_multiple_thinking_blocks():
    events = feed_all(["<thinking>A</thinking>text<thinking>B</thinking>end"])
    assert thinking_only(events) == "AB"
    assert text_only(events) == "textend"


# ---------------------------------------------------------------------------
# Tag split across chunk boundaries (core requirement)
# ---------------------------------------------------------------------------


def test_open_tag_split_across_two_chunks():
    # "<think" in chunk 1, "ing>content</thinking>" in chunk 2
    events = feed_all(["before <think", "ing>inside</thinking> after"])
    assert thinking_only(events) == "inside"
    assert text_only(events) == "before  after"


def test_close_tag_split_across_two_chunks():
    events = feed_all(["<thinking>inside</think", "ing> after"])
    assert thinking_only(events) == "inside"
    assert text_only(events) == " after"


def test_tag_fed_char_by_char():
    """Worst case: every character arrives in its own chunk."""
    full = "<thinking>reason</thinking>answer"
    chunks = list(full)  # one char per chunk
    events = feed_all(chunks)
    assert thinking_only(events) == "reason"
    assert text_only(events) == "answer"


def test_open_tag_split_at_every_position():
    """The open tag <thinking> must survive a split at any byte offset."""
    tag = "<thinking>"
    for split in range(1, len(tag)):
        chunks = [f"pre{tag[:split]}", f"{tag[split:]}content</thinking>post"]
        events = feed_all(chunks)
        assert thinking_only(events) == "content", f"Failed at split={split}"
        assert text_only(events) == "prepost", f"Failed at split={split}"


def test_close_tag_split_at_every_position():
    """The close tag </thinking> must survive a split at any byte offset."""
    tag = "</thinking>"
    for split in range(1, len(tag)):
        chunks = [f"<thinking>inside{tag[:split]}", f"{tag[split:]}after"]
        events = feed_all(chunks)
        assert thinking_only(events) == "inside", f"Failed at split={split}"
        assert text_only(events) == "after", f"Failed at split={split}"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_empty_chunk_ignored():
    events = feed_all(["hello", "", " world"])
    assert text_only(events) == "hello world"


def test_empty_thinking_block():
    events = feed_all(["<thinking></thinking>text"])
    assert thinking_only(events) == ""
    assert text_only(events) == "text"


def test_flush_on_empty_parser():
    parser = ThinkingStreamParser()
    assert parser.flush() == []


def test_no_close_tag_flushes_as_thinking():
    """Unclosed <thinking> block — flush emits remaining buffer as thinking."""
    events = feed_all(["<thinking>dangling"])
    assert thinking_only(events) == "dangling"


def test_angle_bracket_not_a_tag():
    """A lone '<' that is NOT the start of a thinking tag must be emitted."""
    events = feed_all(["a < b > c"])
    assert text_only(events) == "a < b > c"
