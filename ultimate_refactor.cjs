const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/workspace/paybands/ScenarioOptionsWizard.tsx',
  'src/pages/workspace/paybands/ScenarioWorkbench.tsx',
  'src/pages/workspace/paybands/MappingsUI.tsx',
  'src/pages/workspace/paybands/MarketDataUploader.tsx'
];

filesToFix.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Use Regex for more robust replacements to handle indentation/classes
  let updated = content;

  const regexReplacements = [
     // Wizard
     { regex: /Back to Dashboard/g, replace: "{t('paybands.dashboard.back_dashboard')}" },
     { regex: /">Global<\/button>/g, replace: `">{t('paybands.wizard.step2.mode_global')}</button>` },
     { regex: /">By Grade<\/button>/g, replace: `">{t('paybands.wizard.step2.mode_grade')}</button>` },
     { regex: /Weight<\/label>/g, replace: "{t('paybands.wizard.step2.weight_label')}</label>" },
     { regex: /Total Sum:/g, replace: "{t('paybands.wizard.step2.total_sum')}:" },
     { regex: /\(Must equal 1\.0\)/g, replace: "{t('paybands.wizard.step2.must_equal_1')}" },
     { regex: /No Market Mappings found for this Country Code\./g, replace: "{t('paybands.wizard.step2.no_mappings')}" },
     { regex: /Sum:/g, replace: "{t('paybands.wizard.step2.sum')}:" },
     { regex: /Manage<\/a>/g, replace: "{t('paybands.wizard.step3.manage')}</a>" },
     { regex: /Guidelines \(Tier Overrides\)/g, replace: "{t('paybands.wizard.step3.guidelines_title')}" },
     { regex: /Select Policy\.\.\./g, replace: "{t('paybands.wizard.step3.select_policy')}" },
     { regex: /placeholder="e\.g\. FY27 Annual Cycle CL"/g, replace: "placeholder={t('paybands.wizard.step1.scenario_name')}" },
     { regex: /placeholder="US, CL, UK"/g, replace: "placeholder={t('paybands.wizard.step1.country')}" },
     { regex: /<span className="text-slate-400 font-bold">to<\/span>/g, replace: `<span className="text-slate-400 font-bold">{t('paybands.wizard.common.to')}</span>` },
     { regex: /'File is empty or missing data'/g, replace: "t('paybands.imports.empty_error')" },

     // Workbench
     { regex: /Critical: Some providers are missing the exact requested basis_type column value\./g, replace: "{t('paybands.workbench.critical_basis_msg')}" },
     { regex: /\|\| 'Standard'/g, replace: "|| t('paybands.workbench.standard_guideline')" },

     // MappingsUI
     { regex: /placeholder="Global \(Leave empty\)"/g, replace: "placeholder={t('paybands.mappings.country_placeholder')}" },
     { regex: /placeholder="e\.g\. 53, M1"/g, replace: "placeholder={t('paybands.mappings.level_placeholder')}" },
     { regex: /placeholder="e\.g\. GRADE 3"/g, replace: "placeholder={t('paybands.mappings.grade_placeholder')}" },
     { regex: /text-right">Actions<\/th>/g, replace: "text-right\">{t('paybands.labels.actions')}</th>" },

     // MarketDataUploader
     { regex: /placeholder="e\.g\. High Tech All Orgs"/g, replace: "placeholder={t('paybands.imports.name_placeholder')}" },
     { regex: />Change File</g, replace: ">{t('paybands.imports.change_file')}<" },
     { regex: /Return to Dashboard/g, replace: "{t('paybands.dashboard.back_dashboard')}" },
     { regex: />Upload another file</g, replace: ">{t('paybands.imports.upload_another')}<" },
     { regex: /Required columns: provider, country_code, currency, vendor_level_code, market_effective_date/g, replace: "{t('paybands.imports.required_columns_hint')}" }
  ];

  regexReplacements.forEach(r => {
    updated = updated.replace(r.regex, r.replace);
  });

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[${relPath}] Updated.`);
  }
});
console.log('Ultimate refactor complete.');
