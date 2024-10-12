import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import epub from 'epub';

export async function processInput() {
  const inputSource = process.env.INPUT_SOURCE || 'input_folder';
  const isFolder = await isDirectory(inputSource);

  if (isFolder) {
    return await processFolderContents(inputSource);
  } else {
    return await processFile(inputSource);
  }
}

async function isDirectory(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch (error) {
    console.error(`Error checking if path is directory: ${error}`);
    return false;
  }
}

async function processFolderContents(folderPath) {
  const files = await fs.readdir(folderPath);
  const results = [];

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileContent = await processFile(filePath);
    if (fileContent) {
      results.push(fileContent);
    }
  }

  return results;
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
      return processTxtFile(filePath);
    case '.pdf':
      return processPdfFile(filePath);
    case '.epub':
      return processEpubFile(filePath);
    default:
      console.warn(`Unsupported file type: ${ext}. Skipping file: ${filePath}`);
      return null;
  }
}

async function processTxtFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const urls = extractUrls(content);
  
  if (urls.length > 0) {
    const webContents = await Promise.all(urls.map(processWebPage));
    return { type: 'web', filePath, contents: webContents.filter(Boolean) };
  } else {
    return { type: 'txt', filePath, content };
  }
}

function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

async function processWebPage(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    const $ = cheerio.load(content);

    const result = {
      url,
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      content: $('body').text(),
    };

    await browser.close();
    return result;
  } catch (error) {
    console.error(`Error processing web page ${url}:`, error);
    await browser.close();
    return null;
  }
}

async function processPdfFile(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return { type: 'pdf', filePath, content: data.text };
}

async function processEpubFile(filePath) {
  return new Promise((resolve, reject) => {
    const book = new epub(filePath);
    book.on('end', () => {
      let content = '';
      book.flow.forEach((chapter) => {
        book.getChapter(chapter.id, (error, text) => {
          if (error) {
            reject(error);
          } else {
            content += text;
          }
        });
      });
      resolve({ type: 'epub', filePath, content });
    });
    book.parse();
  });
}