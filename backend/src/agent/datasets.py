import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd


@dataclass
class DatasetRegistry:
    datasets: dict[str, pd.DataFrame] = field(default_factory=dict)
    dataset_info: str = ""

    def __bool__(self) -> bool:
        return bool(self.datasets)


def load_datasets(data_dir: Path = Path("data")) -> DatasetRegistry:
    """Load all CSV files from data_dir into a DatasetRegistry."""
    if not data_dir.exists():
        return DatasetRegistry(dataset_info="No datasets available.")

    datasets: dict[str, pd.DataFrame] = {}
    info_lines: list[str] = []

    for csv_file in sorted(data_dir.glob("*.csv")):
        name = re.sub(r"[^a-zA-Z0-9_]", "_", csv_file.stem).strip("_").lower()
        df = pd.read_csv(csv_file)
        datasets[name] = df
        cols = ", ".join(df.columns.tolist())
        info_lines.append(
            f"- **{name}** ({df.shape[0]} rows, {df.shape[1]} columns)\n"
            f"  Columns: {cols}"
        )

    if not info_lines:
        msg = "No datasets available. Add CSV files to the data/ directory."
        return DatasetRegistry(dataset_info=msg)

    return DatasetRegistry(
        datasets=datasets,
        dataset_info="\n".join(info_lines),
    )
