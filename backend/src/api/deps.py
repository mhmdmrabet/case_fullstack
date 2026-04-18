from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from src.agent.datasets import DatasetRegistry, load_datasets
from src.config import get_settings
from src.services.agent_runner import AgentRunner
from src.services.sessions import SessionManager


@lru_cache(maxsize=1)
def get_dataset_registry() -> DatasetRegistry:
    settings = get_settings()
    return load_datasets(settings.data_dir)


@lru_cache(maxsize=1)
def get_agent_runner() -> AgentRunner:
    return AgentRunner(get_dataset_registry())


@lru_cache(maxsize=1)
def get_session_manager() -> SessionManager:
    return SessionManager()


DatasetsDep = Annotated[DatasetRegistry, Depends(get_dataset_registry)]
AgentRunnerDep = Annotated[AgentRunner, Depends(get_agent_runner)]
SessionManagerDep = Annotated[SessionManager, Depends(get_session_manager)]
