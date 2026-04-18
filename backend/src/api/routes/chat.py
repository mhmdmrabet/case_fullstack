import uuid

from fastapi import APIRouter, Request
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel

from src.api.deps import AgentRunnerDep, SessionManagerDep

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None


# FastAPI 0.136+ SSE pattern: the endpoint IS an async generator.
# It yields ServerSentEvent directly — no EventSourceResponse wrapper needed.
@router.post("/stream", response_class=EventSourceResponse)
async def stream_chat(
    body: ChatRequest,
    request: Request,
    runner: AgentRunnerDep,
    sessions: SessionManagerDep,
):
    session_id = body.session_id or str(uuid.uuid4())
    async for event in runner.run_and_stream(
        question=body.question,
        session_id=session_id,
        request=request,
        session_manager=sessions,
    ):
        yield ServerSentEvent(
            event=event.type,
            data=event.model_dump_json(),
            id=str(event.seq),
        )
