"""FastAPI entrypoint.

Step 1 scaffold: minimal app with a health endpoint so `docker compose up` has
something to probe. Real routes (datasets, chat/stream) land in later steps.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="case-fullstack API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
