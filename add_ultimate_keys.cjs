const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'pt', 'fr', 'it', 'de'];
const basePath = 'src/locales';

const ultimateScope = {
  "paybands": {
    "imports": {
      "required_columns_hint": { "en": "Required columns: provider, country_code, currency, vendor_level_code, market_effective_date", "es": "Columnas requeridas: provider, country_code, currency, vendor_level_code, market_effective_date", "pt": "Colunas obrigatórias: provider, country_code, currency, vendor_level_code, market_effective_date", "fr": "Colonnes requises : provider, country_code, currency, vendor_level_code, market_effective_date", "it": "Colonne richieste: provider, country_code, currency, vendor_level_code, market_effective_date", "de": "Erforderliche Spalten: provider, country_code, currency, vendor_level_code, market_effective_date" },
      "empty_error": { "en": "File is empty or missing data", "es": "El archivo está vacío o falta información", "pt": "O arquivo está vazio ou com dados ausentes", "fr": "Le fichier est vide ou des données sont manquantes", "it": "Il file è vuoto o mancano dei dati", "de": "Datei ist leer oder es fehlen Daten" }
    },
    "workbench": {
      "standard_guideline": { "en": "Standard", "es": "Estándar", "pt": "Padrão", "fr": "Standard", "it": "Standard", "de": "Standard" }
    }
  }
};

locales.forEach(lang => {
  const filePath = path.join(basePath, lang, 'common.json');
  if (!fs.existsSync(filePath)) return;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const merge = (target, source, lang) => {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !source[key][lang]) {
        if (!target[key]) target[key] = {};
        merge(target[key], source[key], lang);
      } else {
        target[key] = source[key][lang] || source[key]['en'];
      }
    });
  };

  merge(data.paybands, ultimateScope.paybands, lang);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
});
console.log('Ultimate scope injected.');
