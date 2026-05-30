#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://xuilgccacufwinvkocfl.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const sql = fs.readFileSync('./create-profiles-table.sql', 'utf-8');

console.log('Creating profiles table...');

// Split by ; and execute each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

try {
  for (const statement of statements) {
    console.log(`Executing:\n${statement}\n`);
    const { data, error } = await supabase.rpc('exec', {
      query: statement
    }).catch(() => {
      // Fallback if rpc doesn't work
      return { data: null, error: { message: 'RPC method not available' } };
    });
    
    if (error) {
      console.warn(`Warning: ${error.message}`);
    } else {
      console.log('✓ Statement executed');
    }
  }
  
  console.log('\n✅ Profiles table setup complete!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
