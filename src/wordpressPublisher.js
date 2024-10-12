import xmlrpc from 'xmlrpc';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function postToWordPress(article) {
  const client = xmlrpc.createSecureClient({
    host: process.env.WORDPRESS_HOST,
    port: 443,
    path: '/xmlrpc.php',
  });

  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_PASSWORD;

  try {
    const categories = await getCategories(client, username, password);
    const categoryId = findRelevantCategory(categories, article.keywords);

    let imageUrl = null;
    if (article.type === 'web' && article.contents.some(content => content.image)) {
      imageUrl = await uploadFeaturedImage(client, username, password, article.contents[0].image, article.title);
    }

    const post = {
      post_type: 'post',
      post_title: article.title,
      post_content: article.content,
      post_status: 'publish',
      terms: {
        category: [categoryId],
        post_tag: article.keywords,
      },
      post_thumbnail: imageUrl,
    };

    if (article.language) {
      post.post_language = article.language;
    }

    const postId = await new Promise((resolve, reject) => {
      client.methodCall('wp.newPost', [0, username, password, post], (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });

    console.log(`Article published successfully in ${article.language}. Post ID: ${postId}`);
  } catch (error) {
    console.error('Error publishing to WordPress:', error);
  }
}

async function getCategories(client, username, password) {
  return new Promise((resolve, reject) => {
    client.methodCall('wp.getTerms', [0, username, password, 'category'], (error, categories) => {
      if (error) reject(error);
      else resolve(categories);
    });
  });
}

function findRelevantCategory(categories, keywords) {
  // Implementăm logica de găsire a categoriei relevante bazată pe cuvintele cheie
  // Pentru simplitate, vom returna prima categorie găsită
  return categories[0].term_id;
}

async function uploadFeaturedImage(client, username, password, imageUrl, title) {
  const imageData = await fetch(imageUrl).then(res => res.buffer());
  const optimizedImageData = await sharp(imageData)
    .resize(1200, 630, { fit: 'inside' })
    .toBuffer();

  const base64Image = optimizedImageData.toString('base64');

  const uploadedImage = await new Promise((resolve, reject) => {
    client.methodCall('wp.uploadFile', [
      0,
      username,
      password,
      {
        name: `${title}.jpg`,
        type: 'image/jpeg',
        bits: base64Image,
      },
    ], (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  return uploadedImage.url;
}