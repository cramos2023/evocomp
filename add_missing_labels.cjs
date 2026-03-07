const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'pt', 'fr', 'it', 'de'];
const basePath = 'src/locales';

const newLabels = {
  "vendor_level_code": {
    "en": "Vendor Level Code",
    "es": "Código de Nivel de Proveedor",
    "pt": "Código de Nível de Fornecedor",
    "fr": "Code de Niveau Fournisseur",
    "it": "Codice Livello Fornitore",
    "de": "Anbieter-Level-Code"
  },
  "internal_grade": {
    "en": "Internal Grade",
    "es": "Grado Interno",
    "pt": "Grau Interno",
    "fr": "Grade Interne",
    "it": "Grado Interno",
    "de": "Interne Gehaltsstufe"
  },
  "market_mid_aged": {
    "en": "Market Mid (Aged)",
    "es": "Punto Medio de Mercado (Ajustado)",
    "pt": "Ponto Médio de Mercado (Ajustado)",
    "fr": "Point Médian du Marché (Actualisé)",
    "it": "Punto Medio di Mercato (Rivalutato)",
    "de": "Markt-Mittelwert (Angepasst)"
  },
  "proposed_min": {
    "en": "Proposed Min",
    "es": "Mínimo Propuesto",
    "pt": "Mínimo Proposto",
    "fr": "Minimum Proposé",
    "it": "Minimo Proposto",
    "de": "Vorgeschlagenes Minimum"
  },
  "proposed_mid": {
    "en": "Proposed Mid",
    "es": "Medio Propuesto",
    "pt": "Médio Proposto",
    "fr": "Médian Proposé",
    "it": "Medio Proposto",
    "de": "Vorgeschlagener Mittelwert"
  },
  "proposed_max": {
    "en": "Proposed Max",
    "es": "Máximo Propuesto",
    "pt": "Máximo Proposto",
    "fr": "Maximum Proposé",
    "it": "Massimo Proposto",
    "de": "Vorgeschlagenes Maximum"
  },
  "spread": {
    "en": "Spread",
    "es": "Amplitud",
    "pt": "Amplitude",
    "fr": "Écart",
    "it": "Ampiezza",
    "de": "Spanne"
  },
  "explainability": {
    "en": "Explainability",
    "es": "Explicabilidad",
    "pt": "Explicabilidade",
    "fr": "Explicabilité",
    "it": "Spiegabilità",
    "de": "Erklärbarkeit"
  },
  "run_hash": {
    "en": "Run Hash",
    "es": "Hash de Ejecución",
    "pt": "Hash de Execução",
    "fr": "Hash d'Exécution",
    "it": "Hash di Esecuzione",
    "de": "Ausführungs-Hash"
  }
};

locales.forEach(lang => {
  const filePath = path.join(basePath, lang, 'common.json');
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.paybands) data.paybands = {};
  if (!data.paybands.labels) data.paybands.labels = {};

  Object.keys(newLabels).forEach(key => {
    data.paybands.labels[key] = newLabels[key][lang] || newLabels[key]['en'];
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated labels in ${lang}/common.json`);
});
