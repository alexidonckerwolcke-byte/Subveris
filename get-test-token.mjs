#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xuilgccacufwinvkocfl.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Use admin API to create a user
const testEmail = 'test@example.com';
const testPassword = 'Test123456!';
const testUserId = '3c2085b7-de19-456a-8055-ffb22dd9cbb2';

console.log('Creating/updating test user...');

try {
  // Try to create the user
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    user_metadata: { test_user: true },
    email_confirm: true,
  });

  if (error && !error.message.includes('already exists')) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  }

  const userId = user?.id || testUserId;
  console.log('User ID:', userId);

  // Generate a JWT token manually for this user
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiresInSeconds = 3600;

  // Create a JWT payload
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const payload = {
    iss: 'https://xuilgccacufwinvkocfl.supabase.co/auth/v1',
    sub: userId,
    aud: 'authenticated',
    iat: nowInSeconds,
    exp: nowInSeconds +  expiresInSeconds,
  };

  const payloadStr = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // For testing, we'll just create a basic token without a real signature
  // In production, this needs to be properly signed
  const dummySignature = 'dummysignature';
  
  const token = `${header}.${payloadStr}.${dummySignature}`;
  console.log('TOKEN:', token);
  console.log('USER_ID:', userId);

} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
