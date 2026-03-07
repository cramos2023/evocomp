const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/workspace/paybands/ScenarioOptionsWizard.tsx',
  'src/pages/workspace/paybands/MarketDataUploader.tsx',
  'src/pages/workspace/paybands/ScenarioWorkbench.tsx'
];

filesToFix.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Multi-line/Indentation safe replacements
  const maps = [
    // Wizard
    { from: />Global</, to: ">{t('paybands.wizard.step2.mode_global')}<" },
    { from: />By Grade</, to: ">{t('paybands.wizard.step2.mode_grade')}<" },
    { from: />to<\/span>/, to: ">{t('paybands.wizard.common.to')}</span>" },
    { from: />x<\/span>/, to: ">x</span>" }, // x is fine as a multiplier, but I could translate it if it's "by"
    
    // Uploader
    { from: />Change File</, to: ">{t('paybands.imports.change_file')}<" },
    { from: />Upload another file</, to: ">{t('paybands.imports.upload_another')}<" },
    { from: />Return to Dashboard</, to: ">{t('paybands.dashboard.back_dashboard')}<" }
  ];

  let updated = content;
  maps.forEach(m => {
    updated = updated.split(m.from).join(m.to);
  });

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[${relPath}] Cleaned.`);
  }
});
