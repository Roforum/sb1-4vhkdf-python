def generate_article(research_results, language):
    # Implement article generation logic here
    article = {
        "title": generate_title(research_results, language),
        "content": research_results.get('analysis', ''),  # Folosim analiza ca și conținut
        "keywords": get_top_keywords(research_results, language),
        "language": language,
    }
    return optimize_article(article)

def generate_title(research_results, language):
    # Implementăm logica de generare a titlului (max 100 caractere, stil clickbait)
    return f"Generated Title in {language} (based on {research_results['type']} content)"

def get_top_keywords(research_results, language):
    # Implementăm logica de cercetare a cuvintelor cheie
    return [f"{keyword} in {language}" for keyword in ['keyword1', 'keyword2', 'keyword3', 'keyword4', 'keyword5']]

def optimize_article(article):
    # Implementăm logica de optimizare SEO
    return article