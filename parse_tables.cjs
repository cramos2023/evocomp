const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\carlo\\.gemini\\antigravity\\brain\\d419e2d4-375b-492a-b968-5d27bfcbf8a0\\.system_generated\\steps\\331\\output.txt', 'utf8'));
const tables = data.tables.filter(t => t.name === 'public.ai_consultations' || t.name === 'public.ai_reasoning_logs');
tables.forEach(t => {
  console.log(`Table: ${t.name}`);
  t.columns.forEach(c => {
    console.log(`- ${c.name} (${c.data_type})`);
  });
  console.log('---');
});
