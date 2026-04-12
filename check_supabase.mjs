import { createClient } from '@supabase/supabase-js';
const url = 'https://xuilgccacufwinvkocfl.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY4OTYsImV4cCI6MjA4MTU1Mjg5Nn0.f0xa0hY6VDht7Qeqfbc0UaKpZLzCB43CXwOlfxDJ93M';
const supabase = createClient(url, anonKey);
const { data, error } = await supabase.from('subscriptions').select('id,user_id,name,status').limit(1);
console.log('anon query error:', error);
console.log('anon data sample:', data);
