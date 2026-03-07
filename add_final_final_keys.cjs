const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'pt', 'fr', 'it', 'de'];
const basePath = 'src/locales';

const finalFinalScope = {
  "paybands": {
    "imports": {
      "change_file": { "en": "Change File", "es": "Cambiar Archivo", "pt": "Alterar Arquivo", "fr": "Modifier le Fichier", "it": "Cambia File", "de": "Datei ändern" },
      "upload_another": { "en": "Upload another file", "es": "Subir otro archivo", "pt": "Enviar outro arquivo", "fr": "Télécharger un autre fichier", "it": "Carica un altro file", "de": "Weitere Datei hochladen" },
      "name_placeholder": { "en": "e.g. High Tech All Orgs", "es": "p.ej. Alta Tecnología Todas las Orgs", "pt": "ex: Alta Tecnologia Todas as Orgs", "fr": "ex. High Tech Toutes Orgs", "it": "es. High Tech Tutte Orgs", "de": "z.B. High Tech Alle Orgs" }
    },
    "wizard": {
      "common": {
        "to": { "en": "to", "es": "a", "pt": "para", "fr": "à", "it": "a", "de": "bis" }
      }
    }
  }
};

locales.forEach(lang => {
  const filePath = path.join(basePath, lang, 'common.json');
  if (!fs.existsSync(filePath)) return;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.paybands) data.paybands = {};
  if (!data.paybands.imports) data.paybands.imports = {};
  if (!data.paybands.wizard) data.paybands.wizard = {};
  if (!data.paybands.wizard.common) data.paybands.wizard.common = {};

  Object.keys(finalFinalScope.paybands.imports).forEach(key => {
    data.paybands.imports[key] = finalFinalScope.paybands.imports[key][lang] || finalFinalScope.paybands.imports[key]['en'];
  });
  Object.keys(finalFinalScope.paybands.wizard.common).forEach(key => {
    data.paybands.wizard.common[key] = finalFinalScope.paybands.wizard.common[key][lang] || finalFinalScope.paybands.wizard.common[key]['en'];
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated final final scope in ${lang}/common.json`);
});
