from wordpress_xmlrpc import Client, WordPressPost
from wordpress_xmlrpc.methods.posts import NewPost
from wordpress_xmlrpc.compat import xmlrpc_client
from PIL import Image
import io
import os
import requests

def post_to_wordpress(article):
    client = Client(
        os.getenv('WORDPRESS_HOST'),
        os.getenv('WORDPRESS_USERNAME'),
        os.getenv('WORDPRESS_PASSWORD')
    )

    post = WordPressPost()
    post.title = article['title']
    post.content = format_content(article)
    post.post_status = 'publish'
    post.terms_names = {
        'post_tag': article['keywords'],
        'category': ['Generated Content']  # You might want to adjust this
    }

    # Set the language if your WordPress setup supports it
    if 'language' in article:
        post.custom_fields = [{'key': 'lang', 'value': article['language']}]

    # Upload and set featured image if available
    if 'image' in article:
        image_id = upload_featured_image(client, article['image'], article['title'])
        if image_id:
            post.thumbnail = image_id

    post_id = client.call(NewPost(post))
    print(f"Article published successfully. Post ID: {post_id}")

def format_content(article):
    # You can implement more sophisticated formatting here
    return article['content']

def upload_featured_image(client, image_url, title):
    response = requests.get(image_url)
    if response.status_code != 200:
        print(f"Failed to download image from {image_url}")
        return None

    # Process and optimize the image
    img = Image.open(io.BytesIO(response.content))
    img.thumbnail((1200, 630))  # Resize image
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_data = img_byte_arr.getvalue()

    data = {
        'name': f'{title}.jpg',
        'type': 'image/jpeg',
        'bits': xmlrpc_client.Binary(img_data)
    }

    response = client.call(xmlrpc_client.methodcall('wp.uploadFile', [0, os.getenv('WORDPRESS_USERNAME'), os.getenv('WORDPRESS_PASSWORD'), data]))
    
    if 'id' in response:
        return response['id']
    else:
        print("Failed to upload image")
        return None