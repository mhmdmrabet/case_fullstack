"""Integration tests for _stream_model_node.

Exercises the mapping from PydanticAI stream events to SSE events.
Regression-targeted: the initial text chunk that Gemini sends on a
PartStartEvent(TextPart(content=...)) used to be dropped.
"""

import asyncio
import itertools
from contextlib import asynccontextmanager
from unittest.mock import MagicMock

import pytest
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartStartEvent,
    RetryPromptPart,
    TextPart,
    TextPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    ToolReturnPart,
)

from src.schemas.events import (
    TextDeltaEvent,
    ThinkingDeltaEvent,
    ToolCallArgsDeltaEvent,
    ToolCallArgsDoneEvent,
    ToolCallStartEvent,
    ToolResultEvent,
)
from src.services.agent_runner import _stream_model_node, _stream_tools_node
from src.services.thinking_parser import ThinkingStreamParser

# ---------------------------------------------------------------------------
# Fake PydanticAI stream
# ---------------------------------------------------------------------------


class _FakeAgentStream:
    def __init__(self, events):
        self._events = events

    def __aiter__(self):
        return self._aiter()

    async def _aiter(self):
        for e in self._events:
            yield e


class _FakeNode:
    def __init__(self, events):
        self._events = events

    @asynccontextmanager
    async def stream(self, run_ctx):
        yield _FakeAgentStream(self._events)


async def _drive(events):
    """Run _stream_model_node against a scripted event list; return emitted SSE events."""
    queue: asyncio.Queue = asyncio.Queue()
    seq = itertools.count(1)
    parser = ThinkingStreamParser()
    await _stream_model_node(_FakeNode(events), MagicMock(), queue, seq, parser, "msg-1")
    out = []
    while not queue.empty():
        out.append(queue.get_nowait())
    return out


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_text_content_on_part_start_is_not_dropped():
    """Regression: PartStartEvent(TextPart(content='2')) must be forwarded to the parser."""
    events = [
        PartStartEvent(index=0, part=TextPart(content="2")),
        PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="00 rows")),
    ]
    emitted = await _drive(events)
    text = "".join(e.delta for e in emitted if isinstance(e, TextDeltaEvent))
    assert text == "200 rows"


@pytest.mark.asyncio
async def test_empty_text_part_start_is_skipped():
    """PartStartEvent(TextPart(content='')) should not emit an empty delta."""
    events = [
        PartStartEvent(index=0, part=TextPart(content="")),
        PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="hello")),
    ]
    emitted = await _drive(events)
    text_events = [e for e in emitted if isinstance(e, TextDeltaEvent)]
    assert len(text_events) == 1
    assert text_events[0].delta == "hello"


@pytest.mark.asyncio
async def test_tool_call_part_start_emits_tool_call_start():
    events = [
        PartStartEvent(
            index=0,
            part=ToolCallPart(tool_name="query_data", args="", tool_call_id="tc-1"),
        ),
    ]
    emitted = await _drive(events)
    assert len(emitted) == 1
    assert isinstance(emitted[0], ToolCallStartEvent)
    assert emitted[0].tool_call_id == "tc-1"
    assert emitted[0].tool_name == "query_data"


@pytest.mark.asyncio
async def test_thinking_tags_route_to_thinking_delta_events():
    """<thinking>...</thinking> text must surface as thinking.delta, not text.delta."""
    events = [
        PartStartEvent(index=0, part=TextPart(content="<thinking>reason</thinking>answer")),
    ]
    emitted = await _drive(events)
    thinking = "".join(e.delta for e in emitted if isinstance(e, ThinkingDeltaEvent))
    text = "".join(e.delta for e in emitted if isinstance(e, TextDeltaEvent))
    assert thinking == "reason"
    assert text == "answer"


@pytest.mark.asyncio
async def test_tool_call_args_delta_is_forwarded():
    events = [
        PartStartEvent(
            index=0,
            part=ToolCallPart(tool_name="query_data", args="", tool_call_id="tc-1"),
        ),
        PartDeltaEvent(
            index=0,
            delta=ToolCallPartDelta(args_delta='{"sql":"SEL'),
        ),
        PartDeltaEvent(
            index=0,
            delta=ToolCallPartDelta(args_delta='ECT 1"}'),
        ),
    ]
    emitted = await _drive(events)
    args_deltas = [e for e in emitted if isinstance(e, ToolCallArgsDeltaEvent)]
    assert len(args_deltas) == 2
    assert "".join(e.delta for e in args_deltas) == '{"sql":"SELECT 1"}'


# ---------------------------------------------------------------------------
# CallToolsNode: handle ToolReturnPart and RetryPromptPart
# ---------------------------------------------------------------------------


async def _drive_tools(events):
    queue: asyncio.Queue = asyncio.Queue()
    seq = itertools.count(1)
    payload_slot: list = [None]
    await _stream_tools_node(_FakeNode(events), MagicMock(), queue, seq, payload_slot)
    out = []
    while not queue.empty():
        out.append(queue.get_nowait())
    return out


@pytest.mark.asyncio
async def test_tool_return_part_emits_success_result():
    call = ToolCallPart(
        tool_name="query_data",
        args={"sql": "SELECT 1"},
        tool_call_id="tc-1",
    )
    ret = ToolReturnPart(
        tool_name="query_data",
        content="ok 1 row",
        tool_call_id="tc-1",
    )
    events = [FunctionToolCallEvent(part=call), FunctionToolResultEvent(result=ret)]
    emitted = await _drive_tools(events)
    args_done = [e for e in emitted if isinstance(e, ToolCallArgsDoneEvent)]
    results = [e for e in emitted if isinstance(e, ToolResultEvent)]
    assert len(args_done) == 1
    assert len(results) == 1
    assert results[0].status == "success"
    assert results[0].tool_name == "query_data"


@pytest.mark.asyncio
async def test_retry_prompt_part_does_not_crash():
    """Regression: RetryPromptPart has no .outcome attribute — must not blow up."""
    call = ToolCallPart(
        tool_name="visualize",
        args={"code": "bad"},
        tool_call_id="tc-1",
    )
    retry = RetryPromptPart(
        content="ValidationError: ...",
        tool_name="visualize",
        tool_call_id="tc-1",
    )
    events = [FunctionToolCallEvent(part=call), FunctionToolResultEvent(result=retry)]
    emitted = await _drive_tools(events)
    results = [e for e in emitted if isinstance(e, ToolResultEvent)]
    assert len(results) == 1
    assert results[0].status == "error"
    assert results[0].tool_name == "visualize"
