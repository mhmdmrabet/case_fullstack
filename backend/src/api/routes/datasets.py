from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.deps import DatasetsDep

router = APIRouter(prefix="/datasets", tags=["datasets"])

PREVIEW_ROWS = 5


class DatasetInfo(BaseModel):
    name: str
    row_count: int
    columns: list[str]
    dtypes: dict[str, str]


class DatasetPreview(BaseModel):
    name: str
    row_count: int
    columns: list[str]
    dtypes: dict[str, str]
    rows: list[list[Any]]


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


@router.get("/{name}/preview", response_model=DatasetPreview)
async def preview_dataset(name: str, registry: DatasetsDep) -> DatasetPreview:
    df = registry.datasets.get(name)
    if df is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    head = df.head(PREVIEW_ROWS)
    return DatasetPreview(
        name=name,
        row_count=len(df),
        columns=df.columns.tolist(),
        dtypes={col: str(dtype) for col, dtype in df.dtypes.items()},
        rows=head.where(head.notna(), None).values.tolist(),
    )
