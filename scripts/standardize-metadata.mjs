import { promises as fs } from 'fs';
import path from 'path';

const pagesDir = path.resolve(process.cwd(), 'client/src/pages');
const files = await fs.readdir(pagesDir);

const nameOverrides = {
  'hbo-max': 'HBO Max',
  'hello f resh': 'HelloFresh',
  'hellofresh': 'HelloFresh',
  'xbox-game-pass': 'Xbox Game Pass',
  'microsoft-365': 'Microsoft 365',
  'amazon-prime': 'Amazon Prime',
  'canva-pro': 'Canva Pro',
  'playstation-plus': 'PlayStation Plus',
  'youtube-premium': 'YouTube Premium',
  'tinder-gold': 'Tinder Gold',
  'netflix': 'Netflix',
  'nordvpn': 'NordVPN',
  'i-cloud': 'iCloud',
  'icloud': 'iCloud'
};

function humanize(slug) {
  const s = slug.replace(/\.tsx$/i, '').replace(/^cancel-/, '');
  if (nameOverrides[s]) return nameOverrides[s];
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

for (const f of files) {
  if (!f.startsWith('cancel-') || !f.endsWith('.tsx')) continue;
  const p = path.join(pagesDir, f);
  let text = await fs.readFile(p, 'utf8');

  const slug = f.replace(/\.tsx$/, '');
  const product = humanize(f);
  const productLower = product.replace(/\s+/g, ' ').toLowerCase();

  const title = `How to cancel ${product} subscription | Subveris`;
  const description = `How to cancel ${product} subscription, stop recurring ${productLower} charges, and avoid unexpected renewals.`;
  const keywords = `how to cancel ${product}, cancel ${product} subscription, stop ${product} recurring payment, ${product} cancellation guide`;
  const canonical = `https://www.subveris.com/${slug}`;
  const image = `https://www.subveris.com/assets/logo.png?v=3`;

  const metaBlock = `usePageMeta({\n    title: "${title}",\n    description: "${description}",\n    keywords: "${keywords}",\n    canonical: "${canonical}",\n    image: "${image}",\n  });`;

  // replace existing usePageMeta block
  const newText = text.replace(/usePageMeta\([\s\S]*?\);/m, metaBlock);

  if (newText !== text) {
    await fs.writeFile(p, newText, 'utf8');
    console.log(`Updated ${f}`);
  } else {
    console.log(`No change for ${f}`);
  }
}
