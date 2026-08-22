import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, 'client/src/pages');

const pages = [
  'cancel-adobe',
  'cancel-audible',
  'cancel-canva-pro',
  'cancel-disney-plus',
  'cancel-duolingo',
  'cancel-hbo-max',
  'cancel-hellofresh',
  'cancel-icloud',
  'cancel-linkedin-premium',
  'cancel-microsoft-365',
  'cancel-nordvpn',
  'cancel-playstation-plus',
  'cancel-readly',
  'cancel-tinder-gold',
  'cancel-viaplay',
  'cancel-xbox-game-pass',
  'cancel-youtube-premium',
];

pages.forEach((pageName) => {
  const filePath = path.join(baseDir, `${pageName}.tsx`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Update pickMetaVariant to add SEO fields
  if (!content.includes('author: "Subveris"')) {
    content = content.replace(
      /image: "https:\/\/www\.subveris\.com\/assets\/logo\.png\?v=3",\s*\}\);/,
      `image: "https://subveris.com/assets/logo.png?v=3",
            author: "Subveris",
            type: "guide",
            publishedTime: "2024-01-01T00:00:00Z",
            modifiedTime: new Date().toISOString(),
          });`
    );
  }

  // Update CancelPageJsonLd to add steps parameter
  if (!content.includes('steps={steps}')) {
    content = content.replace(
      /(<CancelPageJsonLd productName="[^"]*" url="[^"]*" )\/>/g,
      `$1steps={steps} />`
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated: ${pageName}`);
});

console.log('Done updating all cancel pages!');
