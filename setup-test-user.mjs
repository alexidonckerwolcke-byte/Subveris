#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Use the SERVICE ROLE key (this is admin-level access needed to create users)
const supabaseUrl = 'https://xuilgccacufwinvkocfl.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk3Njg5NiwiZXhwIjoyMDgxNTUyODk2fQ.34j0sSX9lWR5ujGFfXusv_zMt1VnFbzR59JZSdg1gKA';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const testEmail = 'test-user@example.com';
const testPassword = 'TestPassword123!';

console.log('Creating test user for API testing...');

try {
  // Create a new auth user
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true, // Mark as verified
  });

  if (createError) {
    // If user already exists, try to get it
    if (createError.message.includes('already exists')) {
      console.log('Test user already exists, logging in...');
    } else {
      throw createError;
    }
  }

  const userId = user?.id;
  console.log('Test user ID:', userId);

  // Now sign in as this user to get a valid JWT token
  const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY4OTYsImV4cCI6MjA4MTU1Mjg5Nn0.f0xa0hY6VDht7Qeqfbc0UaKpZLzCB43CXwOlfxDJ93M');
  
  const { data: { session }, error: loginError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError) {
    throw loginError;
  }

  if (session?.access_token) {
    console.log('Got JWT token!');
    console.log('\nYou can now use this token for testing:');
    console.log('USER_ID:', userId);
    console.log('TOKEN:', session.access_token);
    console.log('\nExample curl:');
    console.log(`curl -H "Authorization: Bearer ${session.access_token.substring(0, 20)}..." https://xuilgccacufwinvkocfl.supabase.co/functions/v1/api/subscriptions`);
  } else {
    throw new Error('No session received');
  }
} catch (err) {
  console.error('Error:', err.message || err);
  process.exit(1);
}
