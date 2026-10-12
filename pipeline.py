from agent import build_reader_agent, build_search_agent, writer_chain, critic_chain

def run_research_pipeline(topic: str) -> dict:

    state = {}

    # search agent working
    # print('\n'+ '='*50)
    print("Step 1 - Search agent is working...........")
    # print('\n'+ '='*50)

    search_agent = build_search_agent()
    search_result = search_agent.invoke({
        "messages" : [("user", f"Find recent, reliable and detailed information about: {topic}")]
    })
    state["search_results"] = search_result['messages'] [-1].content

    # print("\nsearch result", state['search_results'])

    #Step 2 reader agent
    # print('\n'+ '='*50)
    print("Step 2 - Reader agent is Scraping...........")
    # print('\n'+ '='*50)

    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages":[("user", 
            f'Based on following Search result about "{topic}",'
            f"Pick the most relevent URL and scrape it for deeper content.\n\n"
            f"Search Results:\n{state['search_results'][:1000]}" 
        )]
    })

    state["scraped_results"] = reader_result["messages"][-1].content
    # print("\nScraped Content: \n", state['scraped_results'])

    # Writer Chain
    # print('\n'+ '='*50)
    print("Step 3 - Writer is drafting the result...........")
    # print('\n'+ '='*50)

    research_combined = (
        f"SEARCH RESULTS : \n {state['search_results']} \n\n"
        f"DETAILED SCRAPED CONTENT : \n", {state['scraped_results']}
    )

    state['report'] = writer_chain.invoke({
        "topic" : topic,
        "research" : research_combined
    })

    # print("\n Final Report : \n", state['report'])

    # Critic Report

    # print('\n'+ '='*50)
    print("Step 4 - Critic is Reviewing the report...........")
    # print('\n'+ '='*50)

    state["feedback"] = critic_chain.invoke({
        "report":state['report']
    })

    # print("\n Critic Report: \n", state['feedback'])

    return state

if __name__ == "__main__":
    topic = input("\n Enter Recearch Topic: ")
    run_research_pipeline(topic)

