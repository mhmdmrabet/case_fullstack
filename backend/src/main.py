from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.deps import get_dataset_registry, get_session_manager
from src.api.routes import chat, datasets, health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Warm up dataset registry (reads CSVs) and session manager at startup.
    # Agent runner is lazy: it validates the API key only on the first /chat/stream call.
    get_dataset_registry()
    get_session_manager()
    yield


app = FastAPI(
    title="case-fullstack API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(datasets.router)
app.include_router(chat.router)
