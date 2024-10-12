import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def process_input():
    input_source = os.getenv('INPUT_SOURCE', 'input_folder')
    if os.path.isdir(input_source):
        return process_folder_contents(input_source)
    else:
        return process_file(input_source)

def process_folder_contents(folder_path):
    results = []
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        file_content = process_file(file_path)
        if file_content:
            results.append(file_content)
    return results

def process_file(file_path):
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext == '.txt':
        return process_txt_file(file_path)
    elif ext == '.pdf':
        return process_pdf_file(file_path)
    else:
        print(f"Unsupported file type: {ext}. Skipping file: {file_path}")
        return None

def process_txt_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    urls = extract_urls(content)
    
    if urls:
        web_contents = [process_web_page(url) for url in urls]
        return {"type": "web", "file_path": file_path, "contents": web_contents}
    else:
        return {"type": "txt", "file_path": file_path, "content": content}

def extract_urls(text):
    import re
    url_regex = r'https?://[^\s]+'
    return re.findall(url_regex, text)

def process_web_page(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    return {
        "url": url,
        "title": soup.title.string if soup.title else "",
        "description": soup.find('meta', attrs={'name': 'description'})['content'] if soup.find('meta', attrs={'name': 'description'}) else "",
        "image": soup.find('meta', property='og:image')['content'] if soup.find('meta', property='og:image') else "",
        "content": soup.body.get_text() if soup.body else "",
    }

def process_pdf_file(file_path):
    # Placeholder for PDF processing
    return {"type": "pdf", "file_path": file_path, "content": "PDF content placeholder"}