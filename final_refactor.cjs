const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/workspace/paybands/ScenarioOptionsWizard.tsx',
  'src/pages/workspace/paybands/ScenarioWorkbench.tsx',
  'src/pages/workspace/paybands/MappingsUI.tsx'
];

filesToFix.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  const replacements = [
    // ScenarioOptionsWizard
    { target: 'Back to Dashboard', replace: "{t('paybands.dashboard.back_dashboard')}" },
    { target: '">Global</button>', replace: `">{t('paybands.wizard.step2.mode_global')}</button>` },
    { target: '">By Grade</button>', replace: `">{t('paybands.wizard.step2.mode_grade')}</button>` },
    { target: 'Weight</label>', replace: "{t('paybands.wizard.step2.weight_label')}</label>" },
    { target: 'Total Sum:', replace: "{t('paybands.wizard.step2.total_sum')}:" },
    { target: '(Must equal 1.0)', replace: "{t('paybands.wizard.step2.must_equal_1')}" },
    { target: 'No Market Mappings found for this Country Code.', replace: "{t('paybands.wizard.step2.no_mappings')}" },
    { target: 'Sum:', replace: "{t('paybands.wizard.step2.sum')}:" },
    { target: 'Manage</a>', replace: "{t('paybands.wizard.step3.manage')}</a>" },
    { target: 'Guidelines (Tier Overrides)', replace: "{t('paybands.wizard.step3.guidelines_title')}" },
    { target: 'Select Policy...', replace: "{t('paybands.wizard.step3.select_policy')}" },
    { target: 'placeholder="e.g. FY27 Annual Cycle CL"', replace: "placeholder={t('paybands.wizard.step1.scenario_name')}" }, // Reusing label as placeholder if suitable, or I can add specific ones
    { target: 'placeholder="US, CL, UK"', replace: "placeholder={t('paybands.wizard.step1.country')}" },
    
    // ScenarioWorkbench
    { target: 'Critical: Some providers are missing the exact requested basis_type column value.', replace: "{t('paybands.workbench.critical_basis_msg')}" },
    
    // MappingsUI
    { target: 'placeholder="Global (Leave empty)"', replace: "placeholder={t('paybands.mappings.country_placeholder')}" },
    { target: 'placeholder="e.g. 53, M1"', replace: "placeholder={t('paybands.mappings.level_placeholder')}" },
    { target: 'placeholder="e.g. GRADE 3"', replace: "placeholder={t('paybands.mappings.grade_placeholder')}" }
  ];

  let updated = content;
  replacements.forEach(r => {
    if (updated.includes(r.target)) {
      updated = updated.split(r.target).join(r.replace);
      console.log(`[${relPath}] Replaced: ${r.target}`);
    }
  });

  fs.writeFileSync(filePath, updated, 'utf8');
});

console.log('Final refactor complete.');
