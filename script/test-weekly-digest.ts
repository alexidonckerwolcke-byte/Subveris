import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set the environment variable explicitly
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY;
console.log('RESEND_API_KEY loaded:', process.env.RESEND_API_KEY ? 'YES' : 'NO');

import { emailService } from '../server/email.js';

async function testWeeklyDigest() {
  console.log('--- Testing Weekly Digest Email ---');

  // Test data - using real user from database
  const testUserId = '614bee7a-ad38-4127-a52e-2c09aa4d5679';
  const testUserEmail = 'alexidonckerwolcke2010@gmail.com';

  const testData = {
    monthlySpending: 45.99,
    currency: 'USD',
    topSubscriptions: [
      {
        name: 'Netflix',
        amount: 15.99,
        category: 'Entertainment'
      },
      {
        name: 'Spotify',
        amount: 9.99,
        category: 'Music'
      }
    ]
  };

  try {
    const result = await emailService.sendWeeklyDigest(testUserId, testUserEmail, testData);
    console.log('Weekly digest result:', result);
  } catch (error) {
    console.error('Error testing weekly digest:', error);
  }
}

testWeeklyDigest();