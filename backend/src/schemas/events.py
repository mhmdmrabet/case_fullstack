"""Pydantic models for SSE events streamed to the frontend.

Each model maps to one SSE event:  event: <type>  data: <model_dump_json()>

The `seq` field is used as the SSE `id:` for client-side dedup / reconnect.
"""

from typing import Any, Literal

from pydantic import BaseModel


class UsageData(BaseModel):
    input_tokens: int
    output_tokens: int


# ---------------------------------------------------------------------------
# The 9 event types
# ---------------------------------------------------------------------------


class RunStartEvent(BaseModel):
    type: Literal["run.start"] = "run.start"
    seq: int = 0
    session_id: str
    message_id: str
    question: str


class ThinkingDeltaEvent(BaseModel):
    type: Literal["thinking.delta"] = "thinking.delta"
    seq: int = 0
    message_id: str
    delta: str


class TextDeltaEvent(BaseModel):
    type: Literal["text.delta"] = "text.delta"
    seq: int = 0
    message_id: str
    delta: str


class ToolCallStartEvent(BaseModel):
    type: Literal["tool.call.start"] = "tool.call.start"
    seq: int = 0
    tool_call_id: str
    tool_name: str


class ToolCallArgsDeltaEvent(BaseModel):
    type: Literal["tool.call.args.delta"] = "tool.call.args.delta"
    seq: int = 0
    tool_call_id: str
    delta: str


class ToolCallArgsDoneEvent(BaseModel):
    type: Literal["tool.call.args.done"] = "tool.call.args.done"
    seq: int = 0
    tool_call_id: str
    args: dict[str, Any] | str


class ToolResultEvent(BaseModel):
    type: Literal["tool.result"] = "tool.result"
    seq: int = 0
    tool_call_id: str
    tool_name: str
    status: Literal["success", "error"]
    summary: str
    payload: dict[str, Any] | None = None


class RunDoneEvent(BaseModel):
    type: Literal["run.done"] = "run.done"
    seq: int = 0
    usage: UsageData


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    seq: int = 0
    code: str
    message: str


SseEvent = (
    RunStartEvent
    | ThinkingDeltaEvent
    | TextDeltaEvent
    | ToolCallStartEvent
    | ToolCallArgsDeltaEvent
    | ToolCallArgsDoneEvent
    | ToolResultEvent
    | RunDoneEvent
    | ErrorEvent
)
