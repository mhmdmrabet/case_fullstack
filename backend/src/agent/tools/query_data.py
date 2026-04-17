import duckdb
from pydantic_ai import RunContext

from src.agent.context import MAX_TABLE_ROWS, AgentContext


async def query_data(
    ctx: RunContext[AgentContext],
    sql: str,
    description: str,
) -> str:
    """Execute a SQL query against the loaded datasets.

    Args:
        ctx: Injected context with loaded datasets.
        sql: SQL query to execute. Table names correspond to dataset names.
        description: Short description of what this query does.
    """
    if not ctx.deps.datasets:
        return "Error: No datasets loaded."

    try:
        # New connection per call: DuckDB in-memory connections are not thread-safe
        # when shared. Opening a fresh connection is cheap and avoids concurrency issues.
        with duckdb.connect(database=":memory:") as conn:
            for name, df in ctx.deps.datasets.items():
                conn.register(name, df)
            result_df = conn.execute(sql).fetchdf()

        ctx.deps.current_dataframe = result_df

        total_rows = len(result_df)
        truncated = total_rows > MAX_TABLE_ROWS
        display_df = result_df.head(MAX_TABLE_ROWS)

        ctx.deps.emit_payload(
            {
                "kind": "table",
                "columns": result_df.columns.tolist(),
                "rows": display_df.values.tolist(),
                "total_rows": total_rows,
                "truncated": truncated,
            }
        )

        preview = display_df.head(5).to_string(index=False)
        return (
            f"Query executed successfully.\n"
            f"Result: {total_rows} rows x {result_df.shape[1]} columns\n"
            f"Columns: {', '.join(result_df.columns.tolist())}\n"
            f"Preview:\n{preview}"
        )

    except Exception as e:
        return f"Error executing SQL query: {e}"
