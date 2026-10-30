"""
MCP client for Research Desk.

Drop-in replacement for `from tools import tavily_search, scrape_url`.

Why a bridge? Your pipeline is synchronous and runs inside worker threads
(server.py), while the MCP SDK is async. This module keeps ONE long-lived MCP
session (stdio subprocess running mcp_server.py) on a background event loop and
exposes normal sync LangChain tools that forward calls to it. So pipeline.py,
agent.py and server.py keep working as-is.
"""
import asyncio
import os
import sys
import threading

from langchain_core.tools import tool
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_server.py")
CALL_TIMEOUT = 90  # seconds per tool call


class MCPBridge:
    def __init__(self):
        self._loop = asyncio.new_event_loop()
        threading.Thread(target=self._loop.run_forever, daemon=True, name="mcp-loop").start()
        self._session = None
        self._task = None
        self._lock = None  # created lazily on the loop thread

    async def _lifetime(self, ready):
        """Owns the subprocess + session for its whole life (same task enter/exit)."""
        try:
            params = StdioServerParameters(
                command=sys.executable,
                args=[SERVER_PATH],
                env=dict(os.environ),  # pass TAVILY_API_KEY etc. to the server
            )
            async with stdio_client(params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    self._session = session
                    ready.set_result(True)
                    await asyncio.Event().wait()  # keep alive until cancelled
        except Exception as exc:
            if not ready.done():
                ready.set_exception(exc)
            raise
        finally:
            self._session = None

    async def _ensure(self):
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            if self._session is None or (self._task is not None and self._task.done()):
                ready = self._loop.create_future()
                self._task = asyncio.ensure_future(self._lifetime(ready))
                await ready
        return self._session

    async def _call(self, name: str, args: dict) -> str:
        session = await self._ensure()
        result = await session.call_tool(name, args)
        text = "\n".join(c.text for c in result.content if getattr(c, "text", None))
        if result.isError:
            raise RuntimeError(text or f"MCP tool '{name}' failed")
        return text

    def call(self, name: str, args: dict) -> str:
        """Thread-safe, blocking."""
        fut = asyncio.run_coroutine_threadsafe(self._call(name, args), self._loop)
        return fut.result(timeout=CALL_TIMEOUT)


_bridge = MCPBridge()  # only starts a thread; the server subprocess starts on first call


# Same names + docstrings as tools.py, so agents and pipeline.py need no other change.
@tool
def tavily_search(query: str) -> str:
    """Search the web and return actual titles, exact URLs, and snippets from Tavily."""
    return _bridge.call("tavily_search", {"query": query})


@tool
def scrape_url(url: str) -> str:
    """Scrape clean text from one exact HTTP(S) URL and report retrieval status."""
    return _bridge.call("scrape_url", {"url": url})