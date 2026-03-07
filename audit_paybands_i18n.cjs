const fs = require('fs');
const path = require('path');

const modulePath = 'src/pages/workspace/paybands';
const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.tsx'));

const potentialHardcoded = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(modulePath, file), 'utf8');
  
  // Look for text between tags: >Text< or > Text <
  // This is a naive check but useful for manual verification
  const tagContentRegex = />\s*([A-Za-z0-9][^<{]*)\s*</g;
  let match;
  while ((match = tagContentRegex.exec(content)) !== null) {
     const text = match[1].trim();
     // Ignore numbers, punctuation-only, or very short strings if desired
     // But for a '0 hardcoded' audit, let's look at everything that isn't a { } block
     if (text && !text.includes('{') && !text.includes('}')) {
        potentialHardcoded.push({ file, text });
     }
  }

  // Look for attributes like placeholder="Text" or label="Text"
  const attrRegex = /(?:placeholder|label|title|description|alt)=["']([^"']+)["']/g;
  while ((match = attrRegex.exec(content)) !== null) {
     const text = match[1].trim();
     if (text && !text.startsWith('t(')) {
        potentialHardcoded.push({ file, attr: text });
     }
  }
});

console.log('--- POTENTIAL HARDCODED STRINGS AUDIT ---');
if (potentialHardcoded.length === 0) {
  console.log('0 hardcoded strings found.');
} else {
  console.log(JSON.stringify(potentialHardcoded, null, 2));
}
