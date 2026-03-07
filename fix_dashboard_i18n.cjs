const fs = require('fs');

const filePath = 'src/pages/workspace/paybands/ActiveStructuresView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  {
    target: '{isTesting ? "Resolving..." : "Test Resolution"}',
    replace: "{isTesting ? t('paybands.dashboard.resolving') : t('paybands.dashboard.btn_resolve')}"
  },
  {
    target: 'Match Found',
    replace: "{t('paybands.dashboard.match_found')}"
  },
  {
    target: 'Version:',
    replace: "{t('paybands.dashboard.version')}:"
  },
  {
    target: 'ID:',
    replace: "{t('paybands.labels.id')}:"
  },
  {
    target: 'Bands:',
    replace: "{t('paybands.labels.bands')}:"
  },
  {
    target: 'loaded',
    replace: "{t('paybands.dashboard.bands_loaded')}"
  }
];

let updated = content;
replacements.forEach(r => {
  if (updated.includes(r.target)) {
    updated = updated.split(r.target).join(r.replace);
    console.log(`Replaced: ${r.target}`);
  } else {
    console.log(`NOT FOUND: ${r.target}`);
  }
});

// Extra check for "Bands: ... loaded" specifically to avoid partial matches on common words
// But the target above for 'loaded' might be risky if used elsewhere.
// Looking at the file, 'loaded' appears only once in the dashboard result section.

fs.writeFileSync(filePath, updated, 'utf8');
console.log('Update complete.');
