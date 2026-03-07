const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'pt', 'fr', 'it', 'de'];
const basePath = 'src/locales';

const finalScope = {
  "paybands": {
    "dashboard": {
      "back_dashboard": {
        "en": "Back to Dashboard",
        "es": "Volver al Panel",
        "pt": "Voltar ao Painel",
        "fr": "Retour au Tableau de Bord",
        "it": "Torna alla Dashboard",
        "de": "Zurück zum Dashboard"
      }
    },
    "wizard": {
      "step2": {
        "mode_global": { "en": "Global", "es": "Global", "pt": "Global", "fr": "Global", "it": "Globale", "de": "Global" },
        "mode_grade": { "en": "By Grade", "es": "Por Grado", "pt": "Por Grau", "fr": "Par Grade", "it": "Per Grado", "de": "Nach Gehaltsstufe" },
        "weight_label": { "en": "Weight", "es": "Peso", "pt": "Peso", "fr": "Poids", "it": "Peso", "de": "Gewichtung" },
        "total_sum": { "en": "Total Sum", "es": "Suma Total", "pt": "Soma Total", "fr": "Somme Totale", "it": "Somma Totale", "de": "Gesamtsumme" },
        "must_equal_1": { "en": "(Must equal 1.0)", "es": "(Debe ser igual a 1.0)", "pt": "(Deve ser igual a 1.0)", "fr": "(Doit être égal à 1,0)", "it": "(Deve essere uguale a 1.0)", "de": "(Muss 1,0 entsprechen)" },
        "no_mappings": { "en": "No Market Mappings found for this Country Code.", "es": "No se encontraron mapeos de mercado para este código de país.", "pt": "Nenhum mapeamento de mercado encontrado para este código de país.", "fr": "Aucune correspondance de marché trouvée pour ce code pays.", "it": "Nessuna mappatura di mercato trovata per questo codice paese.", "de": "Keine Marktzuordnungen für diesen Ländercode gefunden." },
        "sum": { "en": "Sum", "es": "Suma", "pt": "Soma", "fr": "Somme", "it": "Somma", "de": "Summe" }
      },
      "step3": {
        "manage": { "en": "Manage", "es": "Gestionar", "pt": "Gerenciar", "fr": "Gérer", "it": "Gestisci", "de": "Verwalten" },
        "guidelines_title": { "en": "Guidelines (Tier Overrides)", "es": "Pautas (Anulaciones de Nivel)", "pt": "Diretrizes (Substituições de Nível)", "fr": "Directives (Écarts de Niveau)", "it": "Linee Guida (Deroghe di Livello)", "de": "Richtlinien (Stufen-Overrides)" },
        "select_policy": { "en": "Select Policy...", "es": "Seleccionar Pauta...", "pt": "Selecionar Diretriz...", "fr": "Sélectionner une Politique...", "it": "Seleziona Linea Guida...", "de": "Richtlinie auswählen..." }
      }
    },
    "workbench": {
      "critical_basis_msg": {
        "en": "Critical: Some providers are missing the exact requested basis type column value.",
        "es": "Crítico: Algunos proveedores no tienen el valor exacto de la columna del tipo de base solicitado.",
        "pt": "Crítico: Alguns provedores estão perdendo o valor exato da coluna do tipo de base solicitado.",
        "fr": "Critique : Certains fournisseurs n'ont pas la valeur exacte de la colonne du tipo de base demandée.",
        "it": "Critico: Alcuni fornitori non hanno il valore esatto della colonna del tipo di base richiesto.",
        "de": "Kritisch: Bei einigen Anbietern fehlt der genaue Wert der angeforderten Basis-Typ-Spalte."
      }
    },
    "mappings": {
      "country_placeholder": { "en": "Global (Leave empty)", "es": "Global (Dejar vacío)", "pt": "Global (Deixe vazio)", "fr": "Global (Laisser vide)", "it": "Globale (Lascia vuoto)", "de": "Global (Leer lassen)" },
      "level_placeholder": { "en": "e.g. 53, M1", "es": "p.ej. 53, M1", "pt": "ex: 53, M1", "fr": "ex. 53, M1", "it": "es. 53, M1", "de": "z.B. 53, M1" },
      "grade_placeholder": { "en": "e.g. GRADE 3", "es": "p.ej. GRADO 3", "pt": "ex: GRAU 3", "fr": "ex. GRADE 3", "it": "es. GRADO 3", "de": "z.B. STUFE 3" }
    },
    "labels": {
       "actions": { "en": "Actions", "es": "Acciones", "pt": "Ações", "fr": "Actions", "it": "Azioni", "de": "Aktionen" }
    }
  }
};

locales.forEach(lang => {
  const filePath = path.join(basePath, lang, 'common.json');
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.paybands) data.paybands = {};
  
  // Merge deep helper (simplified for this structure)
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

  merge(data.paybands, finalScope.paybands, lang);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated final scope in ${lang}/common.json`);
});
