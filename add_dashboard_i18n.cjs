const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'pt', 'fr', 'it', 'de'];
const basePath = 'src/locales';

const newKeys = {
  "paybands": {
    "dashboard": {
      "active_resolution": {
        "en": "Active Resolution",
        "es": "Resolución Activa",
        "pt": "Resolução Ativa",
        "fr": "Résolution Active",
        "it": "Risoluzione Attiva",
        "de": "Aktive Auflösung"
      },
      "resolution_desc": {
        "en": "Verify how the Engine resolves structures for employees dynamically based on attributes.",
        "es": "Verifique cómo el motor resuelve las estructuras para los empleados de forma dinámica según sus atributos.",
        "pt": "Verifique como o mecanismo resolve estruturas para funcionários dinamicamente com base em atributos.",
        "fr": "Vérifiez comment le moteur résout les structures pour les employés de manière dynamique en fonction des attributs.",
        "it": "Verifica come il motore risolve le strutture per i dipendenti in modo dinamico in base agli attributi.",
        "de": "Überprüfen Sie, wie die Engine Strukturen für Mitarbeiter dynamisch auf der Grundlage von Attributen auflöst."
      },
      "target_country": {
        "en": "Target Country",
        "es": "País de Destino",
        "pt": "País de Destino",
        "fr": "Pays Cible",
        "it": "Paese di Destino",
        "de": "Zielland"
      },
      "as_of_date": {
        "en": "As Of Date",
        "es": "Fecha de Referencia",
        "pt": "Data de Referência",
        "fr": "Date de Référence",
        "it": "Data di Riferimento",
        "de": "Stichtag"
      },
      "btn_resolve": {
        "en": "Test Resolution",
        "es": "Probar Resolución",
        "pt": "Testar Resolução",
        "fr": "Tester la Résolution",
        "it": "Test Risoluzione",
        "de": "Auflösung testen"
      },
      "resolving": {
        "en": "Resolving...",
        "es": "Resolviendo...",
        "pt": "Resolvendo...",
        "fr": "Résolution en cours...",
        "it": "Risoluzione in corso...",
        "de": "Auflösung läuft..."
      },
      "match_found": {
        "en": "Match Found",
        "es": "Coincidencia Encontrada",
        "pt": "Correspondência Encontrada",
        "fr": "Correspondance Trouvée",
        "it": "Trovata Corrispondenza",
        "de": "Übereinstimmung gefunden"
      },
      "version": {
        "en": "Version",
        "es": "Versión",
        "pt": "Versão",
        "fr": "Version",
        "it": "Versione",
        "de": "Version"
      },
      "bands_loaded": {
        "en": "Bands Loaded",
        "es": "Bandas Cargadas",
        "pt": "Bandas Carregadas",
        "fr": "Bandes Chargées",
        "it": "Bande Caricate",
        "de": "Bands geladen"
      }
    },
    "labels": {
      "deployed": {
        "en": "Deployed",
        "es": "Desplegado",
        "pt": "Implantado",
        "fr": "Déployé",
        "it": "Distribuito",
        "de": "Bereitgestellt"
      },
      "source_scenario": {
        "en": "Source Scenario",
        "es": "Escenario de Origen",
        "pt": "Cenário de Origem",
        "fr": "Scénario Source",
        "it": "Scenario di Origine",
        "de": "Quellszenario"
      },
      "hash": {
        "en": "Hash",
        "es": "Hash",
        "pt": "Hash",
        "fr": "Hash",
        "it": "Hash",
        "de": "Hash"
      },
      "grades": {
        "en": "Grades",
        "es": "Grados",
        "pt": "Graus",
        "fr": "Grades",
        "it": "Gradi",
        "de": "Gehaltsstufen"
      },
      "bands": {
        "en": "Bands",
        "es": "Bandas",
        "pt": "Bandas",
        "fr": "Bandes",
        "it": "Bande",
        "de": "Bands"
      },
      "id": {
        "en": "ID",
        "es": "ID",
        "pt": "ID",
        "fr": "ID",
        "it": "ID",
        "de": "ID"
      }
    }
  }
};

locales.forEach(lang => {
  const filePath = path.join(basePath, lang, 'common.json');
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.paybands) data.paybands = {};
  if (!data.paybands.dashboard) data.paybands.dashboard = {};
  if (!data.paybands.labels) data.paybands.labels = {};

  // Fill dashboard keys
  Object.keys(newKeys.paybands.dashboard).forEach(key => {
    data.paybands.dashboard[key] = newKeys.paybands.dashboard[key][lang] || newKeys.paybands.dashboard[key]['en'];
  });

  // Fill label keys
  Object.keys(newKeys.paybands.labels).forEach(key => {
    data.paybands.labels[key] = newKeys.paybands.labels[key][lang] || newKeys.paybands.labels[key]['en'];
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${lang}/common.json`);
});
