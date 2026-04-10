
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

async function verify() {
  const baseUrl = 'http://localhost:5000';
  
  // 1. Find "my family" group
  // We'll use a direct fetch to the backend if we can, but since we need auth, 
  // let's try to find the group ID from the database first using a simple script that doesn't import broken files.
  console.log('Verifying via API...');
  
  // We'll use the group ID we saw earlier in the logs: 696b1121-6972-4601-8386-499317070188
  const groupId = '696b1121-6972-4601-8386-499317070188';
  
  try {
    const response = await fetch(`${baseUrl}/api/family-groups/${groupId}/family-data`, {
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}` // This might not work if the backend expects a user token, but let's try.
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log('Successfully fetched family data.');
    console.log(`Subscriptions found: ${data.subscriptions?.length || 0}`);
    console.log(`Recommendations found: ${data.recommendations?.length || 0}`);
    
    if (data.recommendations && data.recommendations.length > 0) {
      console.log('✅ AI Recommendations are present in the family data API response.');
      data.recommendations.forEach((r: any) => {
        console.log(`- [${r.type}] ${r.title}`);
      });
    } else {
      console.log('⚠️ No recommendations found in the API response.');
    }
  } catch (err) {
    console.error('Error during API verification:', err);
  }
}

verify();
