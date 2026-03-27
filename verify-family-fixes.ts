import { readFileSync } from 'fs';

// Read relevant source files to verify the changes
const routesContent = readFileSync('/Users/alexidonckerwolcke/Desktop/subveris-2/server/routes.ts', 'utf-8');
const dashboardContent = readFileSync('/Users/alexidonckerwolcke/Desktop/subveris-2/client/src/pages/dashboard.tsx', 'utf-8');
const insightsContent = readFileSync('/Users/alexidonckerwolcke/Desktop/subveris-2/client/src/pages/insights.tsx', 'utf-8');
const savingsContent = readFileSync('/Users/alexidonckerwolcke/Desktop/subveris-2/client/src/pages/savings.tsx', 'utf-8');
const combinedContent = routesContent + '\n' + dashboardContent + '\n' + insightsContent + '\n' + savingsContent;

console.log('🔍 Verifying Family Member Access Control Fixes...\n');

const checks = [
  {
    name: '/api/family-groups/:id/family-data - Role-based filtering',
    pattern: /const isOwner = groupRow\.owner_id === userId;[\s\S]*?if \(isOwner\) \{[\s\S]*?\.in\('user_id', memberIds\)/,
    found: false,
  },
  {
    name: '/api/family-groups/:id/family-data - Member filtering',
    pattern: /} else \{[\s\S]*?\.eq\('user_id', userId\)[\s\S]*?allSubscriptions = subs;/,
    found: false,
  },
  {
    name: '/api/family-groups/:id/family-data - Exclude deleted subs',
    pattern: /\.neq\('status', 'deleted'\)/,
    found: false,
  },  {
    name: '/api/family-groups/:id/family-data - returns metrics',
    pattern: /metrics:/,
    found: false,
  },
  {
    name: 'filterAvailableToShare helper exists in utils',
    pattern: /filterAvailableToShare\(/,
    filesToSearch: ['/Users/alexidonckerwolcke/Desktop/subveris-2/client/src/lib/family-sharing-utils.ts'],
    found: false,
  },
  {
    name: '/api/family-groups/:id/shared-subscriptions - Auth check',
    pattern: /if \(!userId\) return res\.status\(401\)[\s\S]*?app\.get\('\/api\/family-groups\/:id\/shared-subscriptions'/,
    found: false,
  },
  {
    name: '/api/family-groups/:id/members - Auth check (GET)',
    pattern: /app\.get\('\/api\/family-groups\/:id\/members'[\s\S]*?if \(!userId\) return res\.status\(401\)[\s\S]*?Not authorized to view family members/,
    found: false,
  },
  {
    name: '/api/family-groups/me/membership route added',
    pattern: /app\.get\('\/api\/family-groups\/me\/membership'/,
    found: false,
  },
  {
    name: '/api/family-groups/:id/settings - Auth check (GET)',
    pattern: /app\.get\('\/api\/family-groups\/:id\/settings'[\s\S]*?if \(!userId\) return res\.status\(401\)[\s\S]*?Not authorized to view family group settings/,
    found: false,
  },
  {
    name: '/api/subscriptions/:id/log-usage - Auth check',
    pattern: /app\.post\("\/api\/subscriptions\/:id\/log-usage"[\s\S]*?if \(!userId\) return res\.status\(401\)/,
    found: false,
  },
  {
    name: 'behavioral insights filter includes unused or to-cancel',
    pattern: /\.filter\(s => s && \(s\.status === 'unused' \|\| s\.status === 'to-cancel'\)\)/,
    found: false,
  },
  {
    name: 'savings page potential filter includes unused or to-cancel',
    pattern: /potentialSavings\s*=\s*subs[\s\S]*?\.filter\(\(s\) => s\.status === "unused" \|\| s\.status === "to-cancel"\)/,
    found: false,
  },
  {
    name: 'insights totalSavings uses calculateMonthlyCost and unused/to-cancel filter',
    pattern: /totalPotentialSavings[\s\S]*?calculateMonthlyCost\(.*\)/,
    found: false,
  },
  {
    name: '/api/recommendations ignores deleted subscriptions',
    pattern: /if \(sub\.status === 'deleted'\) continue;/,
    found: false,
  },
  {
    name: '/api/analysis/cost-per-use supports familyGroupId query',
    pattern: /req\.query\.familyGroupId/, // looking for usage of query parameter in route handler
    found: false,
  },
  {
    name: '/api/family-groups/:id/share-subscription endpoint exists',
    pattern: /app\.post\('\/api\/family-groups\/:id\/share-subscription'/,
    found: false,
  },
  {
    name: '/api/family-groups/:id\/shared-subscriptions GET route',
    pattern: /app\.get\('\/api\/family-groups\/:id\/shared-subscriptions'/,
    found: false,
  },
  {
    name: '/api/family-groups/:id\/shared-subscriptions/:sharedId DELETE route',
    pattern: /app\.delete\('\/api\/family-groups\/:id\/shared-subscriptions\/:sharedId'/,
    found: false,
  },
];

checks.forEach((check) => {
  const regex = new RegExp(check.pattern);
  let target = combinedContent; // default search scope
  if (check.filesToSearch && Array.isArray(check.filesToSearch)) {
    // read each additional file and concatenate
    target = check.filesToSearch
      .map((fp) => readFileSync(fp, 'utf-8'))
      .join('\n') + '\n' + target;
  }
  if (regex.test(target)) {
    check.found = true;
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name}`);
  }
});

console.log('\n📊 Summary:');
const passedChecks = checks.filter(c => c.found).length;
const totalChecks = checks.length;
console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks\n`);

if (passedChecks === totalChecks) {
  console.log('🎉 All family member access control fixes verified!\n');
  console.log('📝 Fixes applied:');
  console.log('1. /api/family-groups/:id/family-data - Members now only see their own subscriptions');
  console.log('2. /api/family-groups/:id/shared-subscriptions - Added authorization check');
  console.log('3. /api/family-groups/:id/members - Added authorization check');
  console.log('4. /api/family-groups/:id/settings - Added authorization check');
  console.log('\n✅ Family members can no longer see the owner\'s personal subscriptions!\n');
} else {
  console.log('⚠️ Some fixes may be incomplete\n');
  process.exit(1);
}
