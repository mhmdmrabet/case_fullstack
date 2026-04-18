import json
from typing import Literal

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pydantic_ai import RunContext

from src.agent.context import MAX_PLOT_ROWS, MAX_TABLE_ROWS, AgentContext


async def visualize(
    ctx: RunContext[AgentContext],
    code: str,
    title: str,
    result_type: Literal["figure", "table"],
    description: str,
) -> str:
    """Create a visualization from the last query result.

    Args:
        ctx: Injected context with current DataFrame.
        code: Python code to create the visualization.
              Use `df` for the data, `px` for plotly.express,
              `go` for plotly.graph_objects, `pd` for pandas.
              Must create a `fig` variable (for figures) or `result` variable (for tables).
        title: Title of the visualization.
        result_type: Either "figure" (Plotly chart) or "table" (formatted DataFrame).
        description: Description of what this visualization shows.
    """
    if ctx.deps.current_dataframe is None:
        return "Error: No data available. Call query_data first."

    # Cap rows before plot to avoid multi-MB SSE payloads
    df = ctx.deps.current_dataframe.head(MAX_PLOT_ROWS)

    try:
        namespace = {"df": df.copy(), "pd": pd, "px": px, "go": go}
        exec(code, namespace)  # noqa: S102

        if result_type == "figure":
            fig = namespace.get("fig")
            if fig is None:
                return "Error: Code must create a 'fig' variable (plotly Figure)."

            # validate=False → compact JSON (no newlines) — critical for SSE framing
            ctx.deps.emit_payload(
                {
                    "kind": "figure",
                    "title": title,
                    "plotly": json.loads(fig.to_json(validate=False)),
                }
            )
            return (
                f"Figure created: {title}\n"
                f"Type: {type(fig).__name__}\n"
                f"Traces: {len(fig.data)}"
            )

        if result_type == "table":
            result: pd.DataFrame = namespace.get("result", df)
            total_rows = len(result)
            truncated = total_rows > MAX_TABLE_ROWS
            display_df = result.head(MAX_TABLE_ROWS)

            ctx.deps.emit_payload(
                {
                    "kind": "table",
                    "title": title,
                    "columns": result.columns.tolist(),
                    "rows": display_df.values.tolist(),
                    "total_rows": total_rows,
                    "truncated": truncated,
                }
            )
            return (
                f"Table created: {title}\n"
                f"Shape: {result.shape[0]} rows x {result.shape[1]} columns\n"
                f"Preview:\n{display_df.head(5).to_string(index=False)}"
            )

        return f"Error: Unknown result_type '{result_type}'. Use 'figure' or 'table'."

    except Exception as e:
        return f"Error creating visualization: {e}"
