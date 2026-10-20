from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_cloudflare import ChatCloudflareWorkersAI
from langchain_mistralai import ChatMistralAI
#from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import tavily_search, scrape_url
# import os
from dotenv import load_dotenv

load_dotenv()

# Model setup

llm = ChatCloudflareWorkersAI(model="@cf/meta/llama-3.1-8b-instruct", temperature=0)
llm3 = ChatCloudflareWorkersAI(model="@cf/meta/llama-3.1-8b-instruct", temperature=0)
llm2 = ChatGroq(model="openai/gpt-oss-120b", temperature=0)
llm4 = ChatGroq(model="openai/gpt-oss-20b", temperature=0)

# 1st Agent

def build_search_agent():
    return create_agent(
        model=llm,
        tools=[tavily_search]
    )

# 2nd Agent

def build_reader_agent():
    return create_agent(
        model=llm2,
        tools=[scrape_url]
    )

# Writer chain

writer_prompt = ChatPromptTemplate.from_messages([
     ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
])

writer_chain = writer_prompt | llm2 | StrOutputParser()

#Critic chain

critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
])

critic_chain = critic_prompt | llm3 | StrOutputParser()


