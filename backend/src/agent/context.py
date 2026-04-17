from collections.abc import Callable
from dataclasses import dataclass, field

import pandas as pd

PayloadSink = Callable[[dict], None]

MAX_TABLE_ROWS = 100
MAX_PLOT_ROWS = 1000


@dataclass
class AgentContext:
    """Context injected into all agent tools via PydanticAI dependency injection."""

    datasets: dict[str, pd.DataFrame] = field(default_factory=dict)
    dataset_info: str = ""
    current_dataframe: pd.DataFrame | None = None
    payload_sink: PayloadSink | None = field(default=None, repr=False)

    def emit_payload(self, payload: dict) -> None:
        if self.payload_sink is not None:
            self.payload_sink(payload)
