from pydantic_ai import Agent

from src.agent.context import AgentContext
from src.agent.prompt import get_system_prompt
from src.agent.tools.query_data import query_data
from src.agent.tools.visualize import visualize
from src.config import get_settings


def create_agent(dataset_info: str) -> Agent[AgentContext]:
    """Create the data analysis agent with query and visualization tools."""
    settings = get_settings()

    agent: Agent[AgentContext] = Agent(
        model=settings.model,
        deps_type=AgentContext,
        system_prompt=get_system_prompt(dataset_info),
        retries=3,
    )

    agent.tool(query_data)
    agent.tool(visualize)

    return agent
