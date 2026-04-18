"""Tests for SSE event schemas.

Each of the 9 events must:
- serialize to JSON via model_dump_json() with the right `type` discriminator
- reject missing required fields
"""

import json

import pytest
from pydantic import ValidationError

from src.schemas.events import (
    ErrorEvent,
    RunDoneEvent,
    RunStartEvent,
    TextDeltaEvent,
    ThinkingDeltaEvent,
    ToolCallArgsDeltaEvent,
    ToolCallArgsDoneEvent,
    ToolCallStartEvent,
    ToolResultEvent,
    UsageData,
)

# ---------------------------------------------------------------------------
# type discriminator: every event must expose the right "type" string
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("cls", "expected_type", "kwargs"),
    [
        (RunStartEvent, "run.start", {"session_id": "s", "message_id": "m", "question": "q"}),
        (ThinkingDeltaEvent, "thinking.delta", {"message_id": "m", "delta": "d"}),
        (TextDeltaEvent, "text.delta", {"message_id": "m", "delta": "d"}),
        (
            ToolCallStartEvent,
            "tool.call.start",
            {"tool_call_id": "t", "tool_name": "query_data"},
        ),
        (
            ToolCallArgsDeltaEvent,
            "tool.call.args.delta",
            {"tool_call_id": "t", "delta": '{"sql"'},
        ),
        (
            ToolCallArgsDoneEvent,
            "tool.call.args.done",
            {"tool_call_id": "t", "args": {"sql": "SELECT 1"}},
        ),
        (
            ToolResultEvent,
            "tool.result",
            {
                "tool_call_id": "t",
                "tool_name": "query_data",
                "status": "success",
                "summary": "ok",
            },
        ),
        (RunDoneEvent, "run.done", {"usage": UsageData(input_tokens=10, output_tokens=20)}),
        (ErrorEvent, "error", {"code": "x", "message": "msg"}),
    ],
)
def test_event_type_discriminator(cls, expected_type, kwargs):
    event = cls(**kwargs)
    assert event.type == expected_type
    dumped = json.loads(event.model_dump_json())
    assert dumped["type"] == expected_type
    assert dumped["seq"] == 0  # default


# ---------------------------------------------------------------------------
# required fields: missing them must raise ValidationError
# ---------------------------------------------------------------------------


def test_run_start_requires_session_message_question():
    with pytest.raises(ValidationError):
        RunStartEvent()  # type: ignore[call-arg]


def test_tool_result_requires_status_in_literal():
    with pytest.raises(ValidationError):
        ToolResultEvent(
            tool_call_id="t",
            tool_name="x",
            status="maybe",  # type: ignore[arg-type]  # not in Literal
            summary="ok",
        )


# ---------------------------------------------------------------------------
# payload: tool.result payload is an optional structured dict
# ---------------------------------------------------------------------------


def test_tool_result_payload_roundtrip():
    payload = {
        "kind": "table",
        "columns": ["a", "b"],
        "rows": [[1, 2], [3, 4]],
        "total_rows": 2,
        "truncated": False,
    }
    event = ToolResultEvent(
        tool_call_id="t",
        tool_name="query_data",
        status="success",
        summary="2 rows",
        payload=payload,
    )
    dumped = json.loads(event.model_dump_json())
    assert dumped["payload"] == payload


def test_tool_result_payload_is_optional():
    event = ToolResultEvent(
        tool_call_id="t",
        tool_name="query_data",
        status="error",
        summary="failed",
    )
    assert event.payload is None
