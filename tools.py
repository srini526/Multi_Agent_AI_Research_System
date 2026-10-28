import os

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from langchain.tools import tool
from tavily import TavilyClient

load_dotenv()

_tavily_api_key = os.getenv("TAVILY_API_KEY")
tavily = TavilyClient(api_key=_tavily_api_key) if _tavily_api_key else None


@tool
def tavily_search(query: str) -> str:
    """Search the web and return actual titles, exact URLs, and snippets from Tavily."""
    if tavily is None:
        raise RuntimeError("TAVILY_API_KEY is not configured.")

    results = tavily.search(query=query, max_results=5)
    output = []

    for result in results.get("results", []):
        title = str(result.get("title") or "Untitled search result").replace("\n", " ")
        url = str(result.get("url") or "").strip()
        snippet = str(result.get("content") or "").replace("\n", " ")[:300]

        # Only include records that actually have an HTTP(S) URL.
        if not url.startswith(("https://", "http://")):
            continue

        output.append(
            f"Title:{title}\nURL:{url}\nSnippet:{snippet}\n"
        )

    return "\n----------------------\n".join(output) or "No search results returned by Tavily."


@tool
def scrape_url(url: str) -> str:
    """Scrape clean text from one exact HTTP(S) URL and report retrieval status."""
    if not url.startswith(("https://", "http://")):
        return f"Source URL: {url}\nRetrieval status: Inaccessible\nError: Only HTTP(S) URLs are supported."

    try:
        response = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchDesk/1.0)"},
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        page_title = soup.title.get_text(" ", strip=True) if soup.title else "Untitled page"

        for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            tag.decompose()

        page_text = soup.get_text(separator=" ", strip=True)
        if not page_text:
            return (
                f"Source URL: {url}\n"
                f"Retrieval status: Inaccessible\n"
                "Error: The page loaded but no readable text was extracted."
            )

        return (
            f"Source URL: {url}\n"
            "Retrieval status: Successfully retrieved\n"
            f"Page title: {page_title}\n"
            f"Page content: {page_text[:6000]}"
        )
    except requests.RequestException as exc:
        return (
            f"Source URL: {url}\n"
            "Retrieval status: Inaccessible\n"
            f"Error: {type(exc).__name__}: {str(exc)[:250]}"
        )
    except Exception as exc:
        return (
            f"Source URL: {url}\n"
            "Retrieval status: Inaccessible\n"
            f"Error: {type(exc).__name__}: {str(exc)[:250]}"
        )
