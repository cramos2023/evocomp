const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const languages = ['en', 'es', 'pt', 'fr', 'it', 'de'];

const paybandsKeys = {
    "en": {
      "dashboard": {
        "title": "Paybands Dashboard",
        "subtitle": "Active Compensation Structures & Market Imports",
        "active_structures": "Active Structures",
        "recent_activity": "Recent Activity",
        "no_structures": "No pay structures published yet.",
        "start_modeling": "Create Scenario",
        "manage_imports": "Manage Data",
        "market_coverage": "Market Data Coverage"
      },
      "imports": {
        "title": "Market Data Uploader",
        "subtitle": "Import external benchmark files and align grading.",
        "dragDropHint": "Drag & drop your market CSV here, or click to browse.",
        "uploading": "Processing market data securely...",
        "success": "Market data imported successfully.",
        "error": "Failed to parse market data. Check the CSV format.",
        "history": "Import History",
        "empty": "No market data imported yet.",
        "btn_upload": "Upload Benchmark"
      },
      "mappings": {
        "title": "Provider Mapping",
        "desc": "Map external vendor levels to internal job grades.",
        "add": "Add Rule",
        "btn_save": "Save Mappings",
        "empty_msg": "No mapping rules defined."
      },
      "wizard": {
        "step1": {
          "title": "Global Parameters",
          "desc": "Define scenario scope, target currency, and foundation settings.",
          "scenario_name": "Scenario Name",
          "country": "Country Code",
          "basis_type": "Basis Type",
          "pricing_date": "Pricing Date",
          "effective_dates": "Effective Dates (Start - End)"
        },
        "step2": {
          "title": "Market Weights & Aging",
          "desc": "Allocate vendor weights and configure data aging factors.",
          "weights": "Provider Weightings (%)",
          "aging_policy": "Aging Policy",
          "quality_policy": "Data Quality Controls",
          "range_policy": "Range Design Policy"
        },
        "step3": {
          "title": "Summary & Simulation",
          "desc": "Review settings before firing the intelligence engine.",
          "run": "Run Simulation Engine"
        },
        "common": {
          "next": "Continue",
          "back": "Back",
          "save": "Save Draft"
        }
      },
      "workbench": {
        "title": "Workbench Engine",
        "run_failed": "Simulation calculation failed. Review logs.",
        "run_success": "Simulation completed.",
        "btn_publish": "Publish Final Version",
        "btn_rerun": "Adjust & Re-Run",
        "min": "Min",
        "mid": "Mid",
        "max": "Max"
      },
      "validation": {
        "weightsMustSumOne": "Global weights must equal exactly 100%.",
        "requiredField": "This field is required.",
        "invalidDate": "End date must be after Start date."
      },
      "errors": {
        "unauthorized": "Security Error: Missing or invalid authentication token. Direct unverified engine access is strictly prohibited."
      },
      "actions": {
        "publish": "Publish",
        "run": "Run",
        "delete": "Delete",
        "import": "Import"
      },
      "status": {
        "draft": "Draft",
        "runnable": "Runnable",
        "published": "Published",
        "archived": "Archived",
        "completed": "Completed"
      },
      "basisType": {
        "baseSalary": "Base Salary",
        "annualTargetCash": "Annual Target Cash",
        "totalGuaranteed": "Total Guaranteed"
      },
      "providers": {
        "MERCER": "MERCER",
        "WTW": "WTW",
        "THIRD": "THIRD PARTY"
      }
    },
    "es": {
      "dashboard": {
        "title": "Panel de Tabuladores",
        "subtitle": "Estructuras de Compensación Activas e Importaciones de Mercado",
        "active_structures": "Estructuras Activas",
        "recent_activity": "Actividad Reciente",
        "no_structures": "Aún no hay estructuras publicadas.",
        "start_modeling": "Crear Escenario",
        "manage_imports": "Gestionar Datos",
        "market_coverage": "Cobertura de Mercado"
      },
      "imports": {
        "title": "Carga de Datos de Mercado",
        "subtitle": "Importa benchmarks externos y alinea grados.",
        "dragDropHint": "Arrastra tu CSV aquí o haz clic para buscar.",
        "uploading": "Procesando datos de mercado de forma segura...",
        "success": "Datos de mercado importados con éxito.",
        "error": "Error al leer datos. Revisa el formato CSV.",
        "history": "Historial de Importaciones",
        "empty": "Aún no se han importado datos.",
        "btn_upload": "Subir Benchmark"
      },
      "mappings": {
        "title": "Mapeos de Proveedor",
        "desc": "Vincula niveles de mercado externos con grados internos.",
        "add": "Agregar Regla",
        "btn_save": "Guardar Mapeos",
        "empty_msg": "No hay reglas de mapeo definidas."
      },
      "wizard": {
        "step1": {
          "title": "Parámetros Globales",
          "desc": "Define el alcance del escenario, moneda objetivo y base.",
          "scenario_name": "Nombre del Escenario",
          "country": "Código de País",
          "basis_type": "Tipo de Base",
          "pricing_date": "Fecha de Precio (Pricing)",
          "effective_dates": "Fechas de Vigencia (Inicio - Fin)"
        },
        "step2": {
          "title": "Pesos de Mercado y Envejecimiento",
          "desc": "Asigna pesos a proveedores y factores de proyección.",
          "weights": "Ponderación de Proveedores (%)",
          "aging_policy": "Política de Envejecimiento (Aging)",
          "quality_policy": "Controles de Calidad",
          "range_policy": "Diseño de Rango (Min/Max)"
        },
        "step3": {
          "title": "Resumen y Simulación",
          "desc": "Revisa la configuración antes de ejecutar el motor.",
          "run": "Ejecutar Motor"
        },
        "common": {
          "next": "Continuar",
          "back": "Atrás",
          "save": "Guardar Borrador"
        }
      },
      "workbench": {
        "title": "Workbench de Ejecución",
        "run_failed": "El cálculo del escenario falló. Revisa los logs.",
        "run_success": "Simulación completada.",
        "btn_publish": "Publicar Versión Final",
        "btn_rerun": "Ajustar y Re-ejecutar",
        "min": "Mín",
        "mid": "Medio",
        "max": "Máx"
      },
      "validation": {
        "weightsMustSumOne": "Los pesos globales deben sumar exactamente 100%.",
        "requiredField": "Este campo es obligatorio.",
        "invalidDate": "La fecha de fin debe ser posterior a la fecha de inicio."
      },
      "errors": {
        "unauthorized": "Error de Seguridad: Token nulo o inválido. El acceso no verificado al motor está estrictamente prohibido."
      },
      "actions": {
        "publish": "Publicar",
        "run": "Ejecutar",
        "delete": "Eliminar",
        "import": "Importar"
      },
      "status": {
        "draft": "Borrador",
        "runnable": "Listo",
        "published": "Publicado",
        "archived": "Archivado",
        "completed": "Completado"
      },
      "basisType": {
        "baseSalary": "Salario Base",
        "annualTargetCash": "Target Cash Anual",
        "totalGuaranteed": "Total Garantizado"
      },
      "providers": {
        "MERCER": "MERCER",
        "WTW": "WTW",
        "THIRD": "PROVEEDOR TERCERO"
      }
    },
    "pt": {
      "dashboard": { "title": "Painel de Bandas", "subtitle": "Estruturas de Remuneração Ativas", "active_structures": "Estruturas Ativas", "recent_activity": "Atividade Recente", "no_structures": "Nenhuma estrutura publicada ainda.", "start_modeling": "Criar Cenário", "manage_imports": "Gerenciar Dados", "market_coverage": "Cobertura de Mercado" },
      "imports": { "title": "Carga de Dados de Mercado", "subtitle": "Importar benchmarks globais.", "dragDropHint": "Arraste seu CSV aqui.", "uploading": "Processando...", "success": "Dados importados com sucesso.", "error": "Erro no formato CSV.", "history": "Histórico", "empty": "Nenhum dado importado.", "btn_upload": "Carregar Arquivo" },
      "mappings": { "title": "Mapeamento", "desc": "Vincular níveis externos a internos.", "add": "Adicionar", "btn_save": "Salvar", "empty_msg": "Sem regras." },
      "wizard": { "step1": { "title": "Parâmetros Globais", "desc": "Defina escopo e moeda.", "scenario_name": "Nome", "country": "País", "basis_type": "Tipo de Base", "pricing_date": "Data de Precificação", "effective_dates": "Datas Efetivas" }, "step2": { "title": "Pesos e Projeção", "desc": "Associe pesos e aging.", "weights": "Pesos (%)", "aging_policy": "Política (Aging)", "quality_policy": "Qualidade", "range_policy": "Rango (Range)" }, "step3": { "title": "Simulação", "desc": "Revise antes de executar.", "run": "Executar Motor" }, "common": { "next": "Continuar", "back": "Voltar", "save": "Salvar" } },
      "workbench": { "title": "Execução", "run_failed": "Falha na simulação.", "run_success": "Simulação completa.", "btn_publish": "Publicar Final", "btn_rerun": "Re-executar", "min": "Mín", "mid": "Médio", "max": "Máx" },
      "validation": { "weightsMustSumOne": "Pesos devem somar 100%.", "requiredField": "Campo obrigatório.", "invalidDate": "Data final inválida." },
      "errors": { "unauthorized": "Erro: Token inválido. Acesso não verificado proibido." },
      "actions": { "publish": "Publicar", "run": "Executar", "delete": "Excluir", "import": "Importar" },
      "status": { "draft": "Rascunho", "runnable": "Pronto", "published": "Publicado", "archived": "Arquivado", "completed": "Completo" },
      "basisType": { "baseSalary": "Salário Base", "annualTargetCash": "Target Cash", "totalGuaranteed": "Total Garantido" },
      "providers": { "MERCER": "MERCER", "WTW": "WTW", "THIRD": "TERCEIROS" }
    },
    "fr": {
      "dashboard": { "title": "Tableau de Bord des Grilles", "subtitle": "Structures de Rémunération Actives", "active_structures": "Structures Actives", "recent_activity": "Activité Récente", "no_structures": "Aucune structure publiée.", "start_modeling": "Créer un Scénario", "manage_imports": "Gérer les Données", "market_coverage": "Couverture de Marché" },
      "imports": { "title": "Import de Données", "subtitle": "Importer des benchmarks globaux.", "dragDropHint": "Glissez votre CSV ici.", "uploading": "Traitement...", "success": "Importation réussie.", "error": "Erreur de format CSV.", "history": "Historique", "empty": "Aucune donnée importée.", "btn_upload": "Télécharger Fichier" },
      "mappings": { "title": "Correspondances", "desc": "Lier les niveaux externes/internes.", "add": "Ajouter", "btn_save": "Sauvegarder", "empty_msg": "Aucune règle." },
      "wizard": { "step1": { "title": "Paramètres Globaux", "desc": "Définir la portée.", "scenario_name": "Nom", "country": "Pays", "basis_type": "Type de Base", "pricing_date": "Date de Valorisation", "effective_dates": "Dates Effectives" }, "step2": { "title": "Pondérations & Vieillissement", "desc": "Attribuer des poids.", "weights": "Pondérations (%)", "aging_policy": "Politique de Vieillissement", "quality_policy": "Qualité", "range_policy": "Politique de Fourchette" }, "step3": { "title": "Simulation", "desc": "Vérifier avant exécution.", "run": "Exécuter le Moteur" }, "common": { "next": "Continuer", "back": "Retour", "save": "Sauvegarder" } },
      "workbench": { "title": "Exécution", "run_failed": "Échec de la simulation.", "run_success": "Simulation terminée.", "btn_publish": "Publier la Finale", "btn_rerun": "Relancer", "min": "Min", "mid": "Médian", "max": "Max" },
      "validation": { "weightsMustSumOne": "Les poids doivent totaliser 100%.", "requiredField": "Champ requis.", "invalidDate": "Date de fin non valide." },
      "errors": { "unauthorized": "Erreur : Jeton invalide. Accès refusé." },
      "actions": { "publish": "Publier", "run": "Exécuter", "delete": "Supprimer", "import": "Importer" },
      "status": { "draft": "Brouillon", "runnable": "Prêt", "published": "Publié", "archived": "Archivé", "completed": "Terminé" },
      "basisType": { "baseSalary": "Salaire de Base", "annualTargetCash": "Cash Cible Annuel", "totalGuaranteed": "Total Garanti" },
      "providers": { "MERCER": "MERCER", "WTW": "WTW", "THIRD": "TIERS" }
    },
    "it": {
      "dashboard": { "title": "Dashboard Fasce", "subtitle": "Strutture Retributive Attive", "active_structures": "Strutture Attive", "recent_activity": "Attività Recente", "no_structures": "Nessuna struttura pubblicata.", "start_modeling": "Crea Scenario", "manage_imports": "Gestisci Dati", "market_coverage": "Copertura di Mercato" },
      "imports": { "title": "Importazione Dati", "subtitle": "Importa benchmark globali.", "dragDropHint": "Trascina qui il tuo CSV.", "uploading": "Elaborazione in corso...", "success": "Dati importati con successo.", "error": "Errore nel formato CSV.", "history": "Cronologia", "empty": "Nessun dato importato.", "btn_upload": "Carica File" },
      "mappings": { "title": "Mappatura", "desc": "Collega livelli esterni/interni.", "add": "Aggiungi", "btn_save": "Salva", "empty_msg": "Nessuna regola." },
      "wizard": { "step1": { "title": "Parametri Globali", "desc": "Definisci ambito e valuta.", "scenario_name": "Nome", "country": "Paese", "basis_type": "Tipo di Base", "pricing_date": "Data di Valutazione", "effective_dates": "Date Effettive" }, "step2": { "title": "Pesi e Proiezioni", "desc": "Assegna pesi.", "weights": "Pesi (%)", "aging_policy": "Politica di Aging", "quality_policy": "Qualità", "range_policy": "Politica di Fascia" }, "step3": { "title": "Simulazione", "desc": "Rivedi prima di eseguire.", "run": "Esegui Motore" }, "common": { "next": "Continua", "back": "Indietro", "save": "Salva" } },
      "workbench": { "title": "Esecuzione", "run_failed": "Simulazione fallita.", "run_success": "Simulazione completata.", "btn_publish": "Pubblica Finale", "btn_rerun": "Esegui di nuovo", "min": "Min", "mid": "Medio", "max": "Max" },
      "validation": { "weightsMustSumOne": "I pesi devono sommare 100%.", "requiredField": "Campo obbligatorio.", "invalidDate": "Data di fine non valida." },
      "errors": { "unauthorized": "Errore: Token non valido. Accesso negato." },
      "actions": { "publish": "Pubblica", "run": "Esegui", "delete": "Elimina", "import": "Importa" },
      "status": { "draft": "Bozza", "runnable": "Pronto", "published": "Pubblicato", "archived": "Archiviato", "completed": "Completato" },
      "basisType": { "baseSalary": "Salario Base", "annualTargetCash": "Cash Target Annuale", "totalGuaranteed": "Totale Garantito" },
      "providers": { "MERCER": "MERCER", "WTW": "WTW", "THIRD": "TERZE PARTI" }
    },
    "de": {
      "dashboard": { "title": "Gehaltsbänder Dashboard", "subtitle": "Aktive Vergütungsstrukturen", "active_structures": "Aktive Strukturen", "recent_activity": "Letzte Aktivität", "no_structures": "Noch keine veröffentlicht.", "start_modeling": "Szenario Erstellen", "manage_imports": "Daten Verwalten", "market_coverage": "Marktabdeckung" },
      "imports": { "title": "Daten-Import", "subtitle": "Globale Benchmarks laden.", "dragDropHint": "CSV hierher ziehen.", "uploading": "Wird verarbeitet...", "success": "Erfolgreich importiert.", "error": "CSV-Formatfehler.", "history": "Verlauf", "empty": "Keine Daten importiert.", "btn_upload": "Datei Hochladen" },
      "mappings": { "title": "Mapping", "desc": "Externe/Interne Level verbinden.", "add": "Hinzufügen", "btn_save": "Speichern", "empty_msg": "Keine Regeln." },
      "wizard": { "step1": { "title": "Globale Parameter", "desc": "Umfang definieren.", "scenario_name": "Name", "country": "Land", "basis_type": "Basistyp", "pricing_date": "Bewertungsdatum", "effective_dates": "Gültigkeitsdaten" }, "step2": { "title": "Gewichte & Alterung", "desc": "Gewichtungen zuweisen.", "weights": "Gewichtungen (%)", "aging_policy": "Alterungspolitik", "quality_policy": "Qualität", "range_policy": "Bandbreitenpolitik" }, "step3": { "title": "Simulation", "desc": "Vor Ausführung prüfen.", "run": "Motor Starten" }, "common": { "next": "Weiter", "back": "Zurück", "save": "Speichern" } },
      "workbench": { "title": "Ausführung", "run_failed": "Simulation fehlgeschlagen.", "run_success": "Simulation abgeschlossen.", "btn_publish": "Final Veröffentlichen", "btn_rerun": "Erneut Ausführen", "min": "Min", "mid": "Mitte", "max": "Max" },
      "validation": { "weightsMustSumOne": "Gewichte müssen 100% ergeben.", "requiredField": "Pflichtfeld.", "invalidDate": "Enddatum ungültig." },
      "errors": { "unauthorized": "Fehler: Ungültiges Token. Zugriff verweigert." },
      "actions": { "publish": "Veröffentlichen", "run": "Ausführen", "delete": "Löschen", "import": "Importieren" },
      "status": { "draft": "Entwurf", "runnable": "Bereit", "published": "Publiziert", "archived": "Archiviert", "completed": "Abgeschlossen" },
      "basisType": { "baseSalary": "Grundgehalt", "annualTargetCash": "Zielbonus", "totalGuaranteed": "Gesamtgarantie" },
      "providers": { "MERCER": "MERCER", "WTW": "WTW", "THIRD": "DRITTANBIETER" }
    }
};

async function updateLocales() {
    for (const lang of languages) {
        const filePath = path.join(localesDir, lang, 'common.json');
        if (fs.existsSync(filePath)) {
            let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            data.paybands = paybandsKeys[lang];
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ Updated ${lang}/common.json`);
        } else {
            console.warn(`⚠️ File not found: ${filePath}`);
        }
    }
}

updateLocales();
