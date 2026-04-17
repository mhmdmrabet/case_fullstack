"""Unit tests: tool executed → payload dict emitted via payload_sink."""

from unittest.mock import MagicMock

import pandas as pd
import pytest
from pydantic_ai import RunContext

from src.agent.context import AgentContext
from src.agent.tools.query_data import query_data
from src.agent.tools.visualize import visualize


def make_ctx(context: AgentContext) -> RunContext[AgentContext]:
    mock = MagicMock(spec=RunContext)
    mock.deps = context
    return mock


SALES_DF = pd.DataFrame(
    {
        "product": ["A", "B", "C"],
        "revenue": [100.0, 200.0, 150.0],
    }
)


@pytest.fixture()
def ctx_with_sink() -> tuple[RunContext[AgentContext], list[dict]]:
    emitted: list[dict] = []
    ctx = AgentContext(
        datasets={"sales": SALES_DF},
        payload_sink=emitted.append,
    )
    return make_ctx(ctx), emitted


@pytest.mark.asyncio
async def test_query_data_emits_table_payload(ctx_with_sink):
    ctx, emitted = ctx_with_sink
    result = await query_data(ctx, "SELECT * FROM sales", "all sales")

    assert "Query executed successfully" in result
    assert len(emitted) == 1
    payload = emitted[0]
    assert payload["kind"] == "table"
    assert payload["columns"] == ["product", "revenue"]
    assert len(payload["rows"]) == 3
    assert payload["total_rows"] == 3
    assert payload["truncated"] is False


@pytest.mark.asyncio
async def test_query_data_no_sink_does_not_crash(ctx_with_sink):
    ctx, _ = ctx_with_sink
    ctx.deps.payload_sink = None
    result = await query_data(ctx, "SELECT * FROM sales", "all sales")
    assert "Query executed successfully" in result


@pytest.mark.asyncio
async def test_visualize_figure_emits_payload(ctx_with_sink):
    ctx, emitted = ctx_with_sink
    # First run a query so current_dataframe is set
    await query_data(ctx, "SELECT * FROM sales", "all sales")
    emitted.clear()

    code = "fig = px.bar(df, x='product', y='revenue', title='Revenue')"
    result = await visualize(ctx, code, "Revenue by product", "figure", "bar chart")

    assert "Figure created" in result
    assert len(emitted) == 1
    payload = emitted[0]
    assert payload["kind"] == "figure"
    assert payload["title"] == "Revenue by product"
    assert "plotly" in payload
    assert "data" in payload["plotly"]


@pytest.mark.asyncio
async def test_visualize_table_emits_payload(ctx_with_sink):
    ctx, emitted = ctx_with_sink
    await query_data(ctx, "SELECT * FROM sales", "all sales")
    emitted.clear()

    code = "result = df[df['revenue'] > 100]"
    result = await visualize(ctx, code, "High revenue", "table", "filtered")

    assert "Table created" in result
    assert len(emitted) == 1
    payload = emitted[0]
    assert payload["kind"] == "table"
    assert payload["title"] == "High revenue"
    assert payload["columns"] == ["product", "revenue"]
