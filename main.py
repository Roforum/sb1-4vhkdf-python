import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew
from ollama import Client as OllamaClient
from input_processor import process_input
from article_generator import generate_article
from wordpress_publisher import post_to_wordpress

load_dotenv()

ollama = OllamaClient(host=os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434'))

task_manager = Agent(
    name="Task Manager",
    goal="Coordinate and manage the overall process",
    backstory="An efficient AI coordinator that ensures smooth operation of the entire workflow.",
    llm=ollama.chat(model="llama3.2:1b")
)

researcher = Agent(
    name="Researcher",
    goal="Gather and analyze information from various sources",
    backstory="A meticulous AI researcher with a keen eye for detail and fact-checking abilities.",
    llm=ollama.chat(model="llama3.1:latest")
)

writer = Agent(
    name="Writer",
    goal="Create well-structured, SEO-optimized articles in the specified language",
    backstory="A multilingual AI writer with expertise in crafting engaging and informative content.",
    llm=ollama.chat(model="taozhiyuai/llama-3-8b-lexi-uncensored:f16")
)

image_analyzer = Agent(
    name="Image Analyzer",
    goal="Analyze and describe images and media content",
    backstory="An AI expert in visual analysis and interpretation of images and media.",
    llm=ollama.chat(model="bakllava:latest")
)

crew = Crew(
    agents=[task_manager, researcher, writer, image_analyzer],
    tasks=[
        Task("Process input and gather data", lambda: process_input()),
        Task("Research and analyze data", lambda input_data: [
            {**item, "analysis": f"Analysis for {item['type']} content"}
            for item in input_data
        ]),
        Task("Generate article", lambda research_results: [
            generate_article(result, os.getenv('ARTICLE_LANGUAGE', 'en'))
            for result in research_results
        ]),
        Task("Analyze images", lambda articles: [
            {**article, "image_analysis": "Image analysis placeholder"}
            for article in articles
        ]),
        Task("Post to WordPress", lambda analyzed_articles: [
            post_to_wordpress(article) for article in analyzed_articles
        ]),
    ]
)

if __name__ == "__main__":
    crew.run()
    print("Process completed successfully.")