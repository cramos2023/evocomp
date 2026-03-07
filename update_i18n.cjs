const fs = require('fs');
const path = require('path');

const locales = {
  en: { all_years: "All Years", all_months: "All Months", current_period: "Current Period" },
  es: { all_years: "Todos los años", all_months: "Todos los meses", current_period: "Período actual" },
  pt: { all_years: "Todos os anos", all_months: "Todos os meses", current_period: "Período atual" },
  fr: { all_years: "Toutes les années", all_months: "Tous les mois", current_period: "Période actuelle" },
  it: { all_years: "Tutti gli anni", all_months: "Tutti i mesi", current_period: "Periodo attuale" },
  de: { all_years: "Alle Jahre", all_months: "Alle Monate", current_period: "Aktueller Zeitraum" }
};

const basePath = path.join(__dirname, 'src', 'i18n', 'locales');

for (const [lang, translations] of Object.entries(locales)) {
  const filePath = path.join(basePath, lang, 'common.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.pay_bands) data.pay_bands = {};
    Object.assign(data.pay_bands, translations);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated ${lang}`);
  } else {
    console.log(`Missing ${lang}`);
  }
}
