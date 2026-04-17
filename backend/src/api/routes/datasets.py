from fastapi import APIRouter
from pydantic import BaseModel

from src.api.deps import DatasetsDep

router = APIRouter(prefix="/datasets", tags=["datasets"])


class DatasetInfo(BaseModel):
    name: str
    row_count: int
    columns: list[str]
    dtypes: dict[str, str]


@router.get("", response_model=list[DatasetInfo])
async def list_datasets(registry: DatasetsDep) -> list[DatasetInfo]:
    return [
        DatasetInfo(
            name=name,
            row_count=len(df),
            columns=df.columns.tolist(),
            dtypes={col: str(dtype) for col, dtype in df.dtypes.items()},
        )
        for name, df in registry.datasets.items()
    ]
