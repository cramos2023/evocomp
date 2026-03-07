const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/workspace/paybands/ScenarioOptionsWizard.tsx',
  'src/pages/workspace/paybands/MarketDataUploader.tsx'
];

filesToFix.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  let updated = content;
  
  // High-precision regex for multi-line/indented tags
  updated = updated.replace(/>\s*Change File\s*</g, ">{t('paybands.imports.change_file')}<");
  updated = updated.replace(/>\s*Upload another file\s*</g, ">{t('paybands.imports.upload_another')}<");
  updated = updated.replace(/>\s*Return to Dashboard\s*</g, ">{t('paybands.dashboard.back_dashboard')}<");
  updated = updated.replace(/>\s*Global\s*</g, ">{t('paybands.wizard.step2.mode_global')}<");
  updated = updated.replace(/>\s*By Grade\s*</g, ">{t('paybands.wizard.step2.mode_grade')}<");

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[${relPath}] Precision cleaned.`);
  }
});
