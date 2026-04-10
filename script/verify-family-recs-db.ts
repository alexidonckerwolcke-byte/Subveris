
import { createClient } from '@supabase/supabase-js';
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
    const keyTrimmed = key.trim();
    if (keyTrimmed) {
      env[keyTrimmed] = valueParts.join('=').trim();
    }
  }
});

// Helper to calculate monthly cost
function monthlyAmountFor(sub: any) {
  if (!sub) return 0;
  const amt = sub.amount || 0;
  const freq = sub.frequency || 'monthly';
  if (freq === 'yearly') return Math.round((amt / 12) * 100) / 100;
  if (freq === 'quarterly') return Math.round((amt / 3) * 100) / 100;
  if (freq === 'weekly') return Math.round((amt * 52) / 12) * 100 / 100;
  return Math.round(amt * 100) / 100;
}

// Re-implement the generation logic here to verify it works with the current DB data
function generateAIRecommendations(subs: any[]): any[] {
  const recommendations: any[] = [];
  if (!subs || subs.length === 0) return recommendations;

  const actionableSubs = subs.filter((sub: any) => 
    sub.status === 'unused' || 
    sub.status === 'to-cancel' || 
    monthlyAmountFor(sub) >= 15
  );

  for (const sub of actionableSubs) {
    try {
      const monthly = monthlyAmountFor(sub);
      const id = 'test-id-' + sub.id;

      if (sub.status === 'unused') {
        recommendations.push({ id, type: 'cancel', title: `Cancel ${sub.name}`, savings: monthly });
        continue;
      }

      if (sub.status === 'to-cancel') {
        recommendations.push({ id, type: 'cancel', title: `Complete cancellation of ${sub.name}`, savings: monthly });
        continue;
      }

      const nameLower = (sub.name || '').toLowerCase();
      if ((sub.category === 'software' || sub.category === 'productivity' || nameLower.includes('adobe')) && monthly > 15) {
        recommendations.push({ id, type: 'alternative', title: `Consider cheaper alternative for ${sub.name}`, savings: Math.round((monthly * 0.8) * 100) / 100 });
        continue;
      }

      if (monthly >= 20) {
        recommendations.push({ id, type: 'negotiate', title: `Negotiate or downgrade ${sub.name}`, savings: Math.round((monthly * 0.4) * 100) / 100 });
        continue;
      }
    } catch (e) {}
  }
  return recommendations;
}

async function verify() {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const groupId = '696b1121-6972-4601-8386-499317070188';
  
  // Get all members
  const { data: members } = await supabase
    .from('family_group_members')
    .select('user_id')
    .eq('family_group_id', groupId);

  const memberIds = members?.map(m => m.user_id) || [];
  
  // Get all subscriptions for these members
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .in('user_id', memberIds);

  console.log(`Total family subscriptions: ${subs?.length || 0}`);

  const recs = generateAIRecommendations(subs || []);
  console.log(`Generated ${recs.length} recommendations for the family.`);
  
  recs.forEach(r => {
    console.log(`- [${r.type}] ${r.title}: Savings: ${r.savings}`);
  });

  if (recs.length > 0) {
    console.log('✅ Logic verified: AI Recommendations will be generated for the family group.');
  } else {
    console.log('⚠️ No recommendations found. This is expected if subscriptions don\'t meet criteria.');
  }
}

verify();
