"""
MCP server for Research Desk.

Exposes the two existing tools (tools.py) over the Model Context Protocol.
The agents never import tools.py directly any more; they call these tools
through mcp_client.py.

IMPORTANT: with stdio transport, stdout IS the protocol channel.
Never print() in this file or in tools.py. Use stderr for logging.

Run standalone (for debugging):
    npx @modelcontextprotocol/inspector python mcp_server.py
"""
from mcp.server.fastmcp import FastMCP

import tools  # your existing tools.py, unchanged

mcp = FastMCP("research-desk")


@mcp.tool()
def tavily_search(query: str) -> str:
    """Search the web and return actual titles, exact URLs, and snippets from Tavily."""
    return tools.tavily_search.invoke({"query": query})


@mcp.tool()
def scrape_url(url: str) -> str:
    """Scrape clean text from one exact HTTP(S) URL and report retrieval status."""
    return tools.scrape_url.invoke({"url": url})


if __name__ == "__main__":
    mcp.run(transport="stdio")