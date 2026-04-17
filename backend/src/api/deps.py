from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from src.agent.datasets import DatasetRegistry, load_datasets
from src.config import get_settings


@lru_cache(maxsize=1)
def get_dataset_registry() -> DatasetRegistry:
    settings = get_settings()
    return load_datasets(settings.data_dir)


DatasetsDep = Annotated[DatasetRegistry, Depends(get_dataset_registry)]
