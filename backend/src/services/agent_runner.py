"""AgentRunner: bridges PydanticAI agent.iter() to an async SSE event stream.

Architecture:
- run_and_stream() is an async generator that yields SseEvent objects.
- Internally it spawns two asyncio.Tasks: one that iterates the agent graph
  and one that watches for client disconnect. Events travel through an
  asyncio.Queue so the generator stays decoupled from both tasks.
- A cancelled outer task (Ctrl+C / Stop button) propagates cancellation to
  both inner tasks, stopping in-progress DuckDB queries cleanly.
"""

import asyncio
import itertools
import uuid
from collections.abc import AsyncIterator

from fastapi import Request
from pydantic_ai._agent_graph import CallToolsNode, ModelRequestNode
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    ToolReturnPart,
)

from src.agent.agent import create_agent
from src.agent.context import AgentContext
from src.agent.datasets import DatasetRegistry
from src.schemas.events import (
    ErrorEvent,
    RunDoneEvent,
    RunStartEvent,
    SseEvent,
    TextDeltaEvent,
    ThinkingDeltaEvent,
    ToolCallArgsDeltaEvent,
    ToolCallArgsDoneEvent,
    ToolCallStartEvent,
    ToolResultEvent,
    UsageData,
)
from src.services.sessions import SessionManager
from src.services.thinking_parser import ThinkingStreamParser

_SENTINEL = object()


class AgentRunner:
    def __init__(self, registry: DatasetRegistry) -> None:
        self._registry = registry
        # Lazy: agent validates API key on first instantiation, not at startup.
        self._agent = None

    async def run_and_stream(
        self,
        question: str,
        session_id: str,
        request: Request,
        session_manager: SessionManager,
    ) -> AsyncIterator[SseEvent]:
        message_id = str(uuid.uuid4())
        seq = itertools.count(1)
        queue: asyncio.Queue = asyncio.Queue()

        # One slot for the payload emitted by the currently running tool.
        # Tools run serially so a single slot is safe.
        current_payload: list[dict | None] = [None]

        def payload_sink(payload: dict) -> None:
            current_payload[0] = payload

        async def iterate() -> None:
            try:
                if self._agent is None:
                    self._agent = create_agent(self._registry.dataset_info)
                async with session_manager.session(session_id) as history:
                    ctx = AgentContext(
                        datasets=self._registry.datasets,
                        dataset_info=self._registry.dataset_info,
                        payload_sink=payload_sink,
                    )
                    await queue.put(
                        RunStartEvent(
                            seq=next(seq),
                            session_id=session_id,
                            message_id=message_id,
                            question=question,
                        )
                    )
                    thinking_parser = ThinkingStreamParser()
                    msg_history = list(history) if history else None

                    async with self._agent.iter(
                        question,
                        deps=ctx,
                        message_history=msg_history,
                    ) as run:
                        async for node in run:
                            if isinstance(node, ModelRequestNode):
                                await _stream_model_node(
                                    node, run.ctx, queue, seq, thinking_parser, message_id
                                )
                            elif isinstance(node, CallToolsNode):
                                await _stream_tools_node(
                                    node, run.ctx, queue, seq, current_payload
                                )

                        usage = run.usage()
                        new_msgs = run.new_messages()
                        history.extend(new_msgs)

                    await queue.put(
                        RunDoneEvent(
                            seq=next(seq),
                            usage=UsageData(
                                input_tokens=usage.input_tokens,
                                output_tokens=usage.output_tokens,
                            ),
                        )
                    )
            except asyncio.CancelledError:
                pass
            except Exception as exc:
                await queue.put(
                    ErrorEvent(
                        seq=next(seq),
                        code="agent_error",
                        message=str(exc),
                    )
                )
            finally:
                await queue.put(_SENTINEL)

        async def watch_disconnect() -> None:
            while True:
                if await request.is_disconnected():
                    await queue.put(_SENTINEL)
                    return
                await asyncio.sleep(0.1)

        iter_task = asyncio.create_task(iterate())
        disconnect_task = asyncio.create_task(watch_disconnect())

        try:
            while True:
                event = await queue.get()
                if event is _SENTINEL:
                    break
                yield event
        finally:
            iter_task.cancel()
            disconnect_task.cancel()
            await asyncio.gather(iter_task, disconnect_task, return_exceptions=True)


# ---------------------------------------------------------------------------
# Node handlers (private helpers)
# ---------------------------------------------------------------------------


async def _stream_model_node(node, run_ctx, queue, seq, thinking_parser, message_id) -> None:
    """Stream text and tool-call-args events from a ModelRequestNode."""

    async def emit_text(chunk: str) -> None:
        for kind, text in thinking_parser.feed(chunk):
            cls = ThinkingDeltaEvent if kind == "thinking" else TextDeltaEvent
            await queue.put(cls(seq=next(seq), message_id=message_id, delta=text))

    async with node.stream(run_ctx) as agent_stream:
        async for event in agent_stream:
            if isinstance(event, PartStartEvent):
                part = event.part
                if isinstance(part, ToolCallPart):
                    await queue.put(
                        ToolCallStartEvent(
                            seq=next(seq),
                            tool_call_id=part.tool_call_id,
                            tool_name=part.tool_name,
                        )
                    )
                elif isinstance(part, TextPart) and part.content:
                    # The first chunk of a TextPart carries content on the start
                    # event (Gemini sends its opening token this way). Don't drop it.
                    await emit_text(part.content)

            elif isinstance(event, PartDeltaEvent):
                delta = event.delta
                if isinstance(delta, TextPartDelta):
                    await emit_text(delta.content_delta)
                elif (
                    isinstance(delta, ToolCallPartDelta)
                    and isinstance(delta.args_delta, str)
                    and delta.args_delta
                ):
                    await queue.put(
                        ToolCallArgsDeltaEvent(
                            seq=next(seq),
                            tool_call_id=_resolve_tool_call_id(event, run_ctx),
                            delta=delta.args_delta,
                        )
                    )

    for kind, text in thinking_parser.flush():
        cls = ThinkingDeltaEvent if kind == "thinking" else TextDeltaEvent
        await queue.put(cls(seq=next(seq), message_id=message_id, delta=text))


async def _stream_tools_node(node, run_ctx, queue, seq, current_payload) -> None:
    """Stream tool-call-done and tool-result events from a CallToolsNode."""
    async with node.stream(run_ctx) as events:
        async for event in events:
            if isinstance(event, FunctionToolCallEvent):
                args = event.part.args
                args_value: dict | str = args if isinstance(args, dict) else (args or "")
                await queue.put(
                    ToolCallArgsDoneEvent(
                        seq=next(seq),
                        tool_call_id=event.tool_call_id,
                        args=args_value,
                    )
                )

            elif isinstance(event, FunctionToolResultEvent):
                result = event.result
                # ToolReturnPart: success path. RetryPromptPart: validation/retry
                # path (model will be asked to fix its args). Both surface here.
                if isinstance(result, ToolReturnPart):
                    status = "success" if result.outcome == "success" else "error"
                else:  # RetryPromptPart
                    status = "error"
                tool_name = result.tool_name or "unknown"
                summary = _truncate(str(result.content), 200)
                payload = current_payload[0]
                current_payload[0] = None

                await queue.put(
                    ToolResultEvent(
                        seq=next(seq),
                        tool_call_id=event.tool_call_id,
                        tool_name=tool_name,
                        status=status,
                        summary=summary,
                        payload=payload,
                    )
                )


def _resolve_tool_call_id(part_delta_event: PartDeltaEvent, run_ctx) -> str:
    """Try to get tool_call_id from the accumulated parts in run_ctx state."""
    try:
        parts = run_ctx.state.message_history[-1].parts  # type: ignore[attr-defined]
        idx = part_delta_event.index
        if idx < len(parts) and isinstance(parts[idx], ToolCallPart):
            return parts[idx].tool_call_id
    except (AttributeError, IndexError, TypeError):
        pass
    return f"tc-{part_delta_event.index}"


def _truncate(text: str, max_len: int) -> str:
    return text[:max_len] + "…" if len(text) > max_len else text
