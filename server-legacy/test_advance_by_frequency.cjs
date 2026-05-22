// Quick test script for advanceByFrequency behavior
function advanceByFrequency(d, freq){
  const result = new Date(d);
  if(freq === 'monthly'){
    const day = result.getDate();
    result.setMonth(result.getMonth() + 1);
    if (result.getDate() !== day) {
      // clamp to last day of target month
      result.setDate(0);
    }
  } else if (freq === 'yearly'){
    result.setFullYear(result.getFullYear() + 1);
  } else if (freq === 'quarterly'){
    result.setMonth(result.getMonth() + 3);
  } else if (freq === 'weekly'){
    result.setDate(result.getDate() + 7);
  }
  // format local YYYY-MM-DD to avoid timezone shifts when printing
  const yyyy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, '0');
  const dd = String(result.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const examples = [
  ['2026-02-03','monthly'],
  ['2026-01-31','monthly'],
  ['2021-01-31','monthly'],
  ['2021-03-31','monthly'],
  ['2021-07-31','monthly'],
  ['2021-08-31','monthly'],
  ['2024-02-29','monthly'], // leap year case
  ['2026-02-28','monthly'],
];

console.log('advanceByFrequency examples:');
for (const [d,f] of examples){
  console.log(d, '->', advanceByFrequency(d,f));
}

// also show weekly/quarterly/yearly sample
console.log('\nother frequencies:');
console.log('2026-02-03 weekly ->', advanceByFrequency('2026-02-03','weekly'));
console.log('2026-02-03 quarterly ->', advanceByFrequency('2026-02-03','quarterly'));
console.log('2026-02-03 yearly ->', advanceByFrequency('2026-02-03','yearly'));
