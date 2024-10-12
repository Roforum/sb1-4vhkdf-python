import dotenv from 'dotenv';
import { Crew, Agent, Task } from 'crewai';
import { Ollama } from 'ollama';
import { processInput } from './inputProcessor.js';
import { generateArticle } from './articleGenerator.js';
import { postToWordPress } from './wordpressPublisher.js';

dotenv.config();

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
});

const taskManager = new Agent({
  name: 'Task Manager',
  goal: 'Coordinate and manage the overall process',
  backstory: 'An efficient AI coordinator that ensures smooth operation of the entire workflow.',
  llm: ollama,
});

const researcher = new Agent({
  name: 'Researcher',
  goal: 'Gather and analyze information from various sources',
  backstory: 'A meticulous AI researcher with a keen eye for detail and fact-checking abilities.',
  llm: ollama,
});

const writer = new Agent({
  name: 'Writer',
  goal: 'Create well-structured, SEO-optimized articles in the specified language',
  backstory: 'A multilingual AI writer with expertise in crafting engaging and informative content.',
  llm: ollama,
});

const imageAnalyzer = new Agent({
  name: 'Image Analyzer',
  goal: 'Analyze and describe images and media content',
  backstory: 'An AI expert in visual analysis and interpretation of images and media.',
  llm: ollama,
});

const crew = new Crew({
  agents: [taskManager, researcher, writer, imageAnalyzer],
  tasks: [
    new Task('Process input and gather data', async () => {
      const inputData = await processInput();
      return inputData;
    }),
    new Task('Research and analyze data', async (inputData) => {
      // Implement research and analysis logic
      const analyzedData = await Promise.all(inputData.map(async (item) => {
        if (item.type === 'web') {
          const analysis = await researcher.execute(`Analyze the following web content and provide a summary:
            ${item.contents.map(content => content.content).join('\n\n')}`);
          return { ...item, analysis };
        } else {
          const analysis = await researcher.execute(`Analyze the following ${item.type} content and provide a summary:
            ${item.content}`);
          return { ...item, analysis };
        }
      }));
      return analyzedData;
    }),
    new Task('Generate article', async (researchResults) => {
      const language = process.env.ARTICLE_LANGUAGE || 'en';
      const articles = await Promise.all(researchResults.map(async (result) => {
        const article = await writer.execute(`Generate an article based on the following analysis:
          ${result.analysis}
          
          The article should be in ${language} language.`);
        return { ...result, article };
      }));
      return articles;
    }),
    new Task('Analyze images', async (articles) => {
      const analyzedArticles = await Promise.all(articles.map(async (article) => {
        if (article.type === 'web' && article.contents.some(content => content.image)) {
          const imageAnalysis = await imageAnalyzer.execute(`Analyze the following images:
            ${article.contents.map(content => content.image).filter(Boolean).join('\n')}`);
          return { ...article, imageAnalysis };
        }
        return article;
      }));
      return analyzedArticles;
    }),
    new Task('Post to WordPress', async (analyzedArticles) => {
      for (const article of analyzedArticles) {
        await postToWordPress(article);
      }
    }),
  ],
});

async function main() {
  try {
    await crew.run();
    console.log('Process completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();