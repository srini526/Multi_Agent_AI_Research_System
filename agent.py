from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_cloudflare import ChatCloudflareWorkersAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import tavily_search, scrape_url
from dotenv import load_dotenv
from mcp_client import tavily_search, scrape_url

load_dotenv()

# Model setup
llm = ChatCloudflareWorkersAI(
    model="@cf/meta/llama-3.1-8b-instruct",
    temperature=0,
)
llm3 = ChatCloudflareWorkersAI(
    model="@cf/meta/llama-3.1-8b-instruct",
    temperature=0,
)
llm2 = ChatGroq(model="openai/gpt-oss-120b", temperature=0)
llm4 = ChatGroq(model="openai/gpt-oss-20b", temperature=0)


def build_search_agent():
    return create_agent(
        model=llm,
        tools=[tavily_search],
        system_prompt="""
You are a web research agent.

- Use tavily_search to find relevant information.
- Treat the tool output as the only authoritative source of search-result URLs.
- Never invent, guess, reconstruct, or modify URLs.
- Preserve titles, URLs, and snippets as returned by the tool.
- Prefer primary and reputable sources.
- Do not claim a page was opened unless it was actually retrieved by a tool.
- If evidence is insufficient, say so explicitly.
""",
    )


def build_reader_agent():
    """Read evidence already scraped by Python; this agent cannot invent or fetch URLs."""
    return create_agent(
        model=llm2,
        tools=[],
        system_prompt="""
You are a careful research evidence analyst. The application has already
retrieved the source pages using URLs returned by Tavily. You only analyze
that supplied content; you do not browse or fetch additional pages.

- Use only facts present in the supplied search results and scraped content.
- Refer to sources only by the supplied IDs, such as [S1] and [S2].
- Never invent, guess, reconstruct, or output URLs.
- Preserve uncertainty and report when content is missing or inaccessible.
- Separate direct evidence from interpretation.
- Never invent facts, quotations, statistics, or source details.

Return concise, source-specific evidence notes for the report writer.
""",
    )


# Writer chain. The application, not the model, builds the final Sources section.
writer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert research writer. Write clear, structured,
professional reports grounded only in the supplied research context.

SOURCE RULES:
1. Do not invent facts, statistics, quotations, source titles, or URLs.
2. Use only evidence present in the supplied context.
3. Refer to sources using their provided IDs, such as [S1] and [S2].
4. Use an ID only when that source's supplied evidence supports the claim.
5. Do not write any URLs anywhere in the report.
6. Do not create a Sources or References section. The application adds
   that section from the actual Tavily search results.
7. Clearly acknowledge evidence gaps and retrieval failures.
8. Never treat a search snippet as if the entire page was read.
9. Prioritize accuracy and traceability over making the report sound complete.""",
    ),
    (
        "human",
        """Write a detailed research report on this topic:

Topic:
{topic}

Research and source registry:
{research}

Use this structure:
1. Introduction
2. Key Findings (at least three when evidence supports them)
3. Analysis and Limitations
4. Conclusion

Support claims with source IDs such as [S1]. Do not force unsupported
findings merely to reach a minimum. Do not include URLs or a Sources section.
Return well-formatted Markdown.""",
    ),
])

writer_chain = writer_prompt | llm2 | StrOutputParser()


# Critic chain
critic_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a strict research quality auditor.

Review factual support, source traceability, reasoning, completeness,
and professionalism. Compare the report with the original research.

- Flag claims not supported by the provided evidence.
- Flag source IDs that do not exist in the supplied source registry.
- Flag source IDs used for claims that the source does not support.
- The source registry is authoritative; do not invent replacement sources.
- Do not claim that a URL is live unless retrieval status confirms a successful fetch.
- Distinguish a failed fetch from a fabricated URL.

Use this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

Source Integrity:
- ...

Unsupported Claims:
- ...

One line verdict:
...""",
    ),
    (
        "human",
        """Audit the report against the original research evidence.

Original Research and Source Registry:
{research}

Report:
{report}

Evaluate only what the supplied evidence establishes. Do not treat a
source ID or a URL in the report as proof that a claim is supported.""",
    ),
])

critic_chain = critic_prompt | llm3 | StrOutputParser()
