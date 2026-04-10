import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const resendKey = process.env.RESEND_API_KEY;

if (!resendKey || resendKey === 're_mock_key') {
  console.error('RESEND_API_KEY is not set or is using a mock value.');
  process.exit(1);
}

const resend = new Resend(resendKey);

async function testEmail() {
  console.log('--- Testing Resend Email ---');
  try {
    // We'll just try to list domains or something simple that doesn't send a real email
    // but verifies the API key is valid.
    const { data, error } = await resend.domains.list();
    
    if (error) {
      console.error('Resend API Key verification failed:', error.message);
    } else {
      console.log('Resend API Key is valid. Found domains:', data?.data?.length || 0);
    }
  } catch (e) {
    console.error('Exception testing Resend:', e);
  }
}

testEmail();
