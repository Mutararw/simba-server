import fs from 'fs';
import path from 'path';

const dataPath = 'c:/Users/hp/OneDrive/Desktop/DAVID/simba-frontend/src/data/simba_products.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const categoryImages = {};

// Keywords to prefer for representative images
const preferences = {
  "Alcoholic Drinks": ["whisky", "beer", "wine", "gin", "vodka"],
  "Food Products": ["bread", "milk", "cheese", "flour", "rice"],
  "Cosmetics & Personal Care": ["shampoo", "soap", "cream", "lotion"],
  "Cleaning & Sanitary": ["detergent", "soap", "cleaner", "mop"],
  "Baby Products": ["diaper", "baby", "milk"],
  "Kitchenware & Electronics": ["kettle", "pan", "iron"],
};

data.products.forEach(p => {
  if (!categoryImages[p.category]) {
    categoryImages[p.category] = p.image;
  }
  
  const keywords = preferences[p.category] || [];
  const name = p.name.toLowerCase();
  
  if (keywords.some(k => name.includes(k))) {
    // If it matches a preferred keyword, use it (or stick with the first match if it also matches)
    if (!categoryImages[p.category].match(keywords.join('|'))) {
       categoryImages[p.category] = p.image;
    }
  }
});

console.log(JSON.stringify(categoryImages, null, 2));
