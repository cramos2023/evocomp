import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

translations = {
    "en": {
        "landing": {
            "actions": {
                "back_to_workspace": "Back to Workspace",
                "coming_soon": "Coming Soon"
            },
            "hero": {
                "badge": "Active Concept",
                "title": "ST. Job Description Intelligence",
                "subtitle": "Centralize and standardize your organization's job descriptions.",
                "strategy_text": "Strategic Architecture & Evaluation"
            },
            "capabilities": {
                "title": "Module Features",
                "ai_drafting": { "title": "AI-Powered Drafting", "desc": "Generate comprehensive descriptions using your internal data backbone." },
                "competency_mapping": { "title": "Competency Mapping", "desc": "Automatically link required skills to global job frameworks." },
                "version_control": { "title": "Version Control", "desc": "Track every structural change with deep forensic traceability." },
                "org_chart_alignment": { "title": "Strategic Alignment", "desc": "Ensure roles are correctly weighted against your organization structure." },
                "multilingual_support": { "title": "Global Support", "desc": "Manage descriptions across multiple territories with seamless translation." },
                "professional_export": { "title": "Executive Export", "desc": "Generate high-fidelity PDF or Word documents ready for distribution." }
            }
        },
        "repository": { "title": "JD Repository", "subtitle": "Manage and version all job descriptions." },
        "builder": { "title": "JD Builder", "subtitle": "Draft new descriptions with AI assistance." }
    },
    "es": {
        "landing": {
            "actions": {
                "back_to_workspace": "Volver al Workspace",
                "coming_soon": "Próximamente"
            },
            "hero": {
                "badge": "Concepto Activo",
                "title": "ST. Inteligencia de Descripciones de Puesto",
                "subtitle": "Centralice y estandarice las descripciones de puesto de su organización.",
                "strategy_text": "Arquitectura y Evaluación Estratégica"
            },
            "capabilities": {
                "title": "Funcionalidades del Módulo",
                "ai_drafting": { "title": "Redacción con IA", "desc": "Genere descripciones completas utilizando su base de datos interna." },
                "competency_mapping": { "title": "Mapeo de Competencias", "desc": "Vincule automáticamente las habilidades requeridas con marcos globales." },
                "version_control": { "title": "Control de Versiones", "desc": "Rastree cada cambio estructural con trazabilidad forense." },
                "org_chart_alignment": { "title": "Alineación Estratégica", "desc": "Asegure que los roles estén ponderados correctamente según su estructura." },
                "multilingual_support": { "title": "Soporte Global", "desc": "Gestione descripciones en múltiples territorios con traducción fluida." },
                "professional_export": { "title": "Exportación Ejecutiva", "desc": "Genere documentos PDF o Word de alta fidelidad listos para distribuir." }
            }
        },
        "repository": { "title": "Repositorio de JD", "subtitle": "Gestione y versione todas las descripciones." },
        "builder": { "title": "Constructor de JD", "subtitle": "Redacte nuevas descripciones con asistencia de IA." }
    },
    "fr": {
        "landing": {
            "actions": {
                "back_to_workspace": "Retour au Workspace",
                "coming_soon": "Prochainement"
            },
            "hero": {
                "badge": "Concept Actif",
                "title": "ST. Intelligence des Descriptions de Poste",
                "subtitle": "Centralisez et standardisez les descriptions de poste de votre organisation.",
                "strategy_text": "Architecture et Évaluation Stratégique"
            },
            "capabilities": {
                "title": "Fonctionnalités du Module",
                "ai_drafting": { "title": "Rédaction Assistée par IA", "desc": "Générez des descriptions complètes en utilisant vos données internes." },
                "competency_mapping": { "title": "Cartographie des Compétences", "desc": "Liez automatiquement les compétences requises aux référentiels mondiaux." },
                "version_control": { "title": "Contrôle des Versions", "desc": "Suivez chaque changement structurel avec une traçabilité précise." },
                "org_chart_alignment": { "title": "Alignement Stratégique", "desc": "Vérifiez que les rôles sont pondérés selon votre structure organisationnelle." },
                "multilingual_support": { "title": "Support Mondial", "desc": "Gérez les descriptions sur plusieurs territoires avec une traduction fluide." },
                "professional_export": { "title": "Exportation Executive", "desc": "Générez des documents PDF ou Word prêts pour la distribution." }
            }
        },
        "repository": { "title": "Référentiel JD", "subtitle": "Gérez les versions de toutes les descriptions." },
        "builder": { "title": "Générateur JD", "subtitle": "Rédigez de nouvelles descriptions avec l'IA." }
    },
    "it": {
        "landing": {
            "actions": {
                "back_to_workspace": "Torna al Workspace",
                "coming_soon": "Prossimamente"
            },
            "hero": {
                "badge": "Concetto Attivo",
                "title": "ST. Intelligenza delle Descrizioni del Lavoro",
                "subtitle": "Centralizza e standardizza le descrizioni del lavoro della tua organizzazione.",
                "strategy_text": "Architettura e Valutazione Strategica"
            },
            "capabilities": {
                "title": "Funzionalità del Modulo",
                "ai_drafting": { "title": "Redazione con IA", "desc": "Genera descrizioni complete utilizzando la tua base di dati interna." },
                "competency_mapping": { "title": "Mappatura delle Competenze", "desc": "Collega automaticamente le abilità richieste ai framework globali." },
                "version_control": { "title": "Controllo Versioni", "desc": "Traccia ogni cambiamento strutturale con tracciabilità forense." },
                "org_chart_alignment": { "title": "Allineamento Strategico", "desc": "Assicura che i ruoli siano ponderati correttamente rispetto alla struttura." },
                "multilingual_support": { "title": "Supporto Globale", "desc": "Gestisci descrizioni in più territori con traduzione fluida." },
                "professional_export": { "title": "Esportazione Esecutiva", "desc": "Genera documenti PDF o Word pronti per la distribuzione." }
            }
        },
        "repository": { "title": "Archivio JD", "subtitle": "Gestisci e versiona tutte le descrizioni." },
        "builder": { "title": "Creatore JD", "subtitle": "Redigi nuove descrizioni con l'assistenza dell'IA." }
    },
    "pt": {
        "landing": {
            "actions": {
                "back_to_workspace": "Voltar ao Workspace",
                "coming_soon": "Em Breve"
            },
            "hero": {
                "badge": "Conceito Ativo",
                "title": "ST. Inteligência de Descrições de Cargo",
                "subtitle": "Centralize e padronize as descrições de cargo de sua organização.",
                "strategy_text": "Arquitetura e Avaliação Estratégica"
            },
            "capabilities": {
                "title": "Recursos do Módulo",
                "ai_drafting": { "title": "Redação com IA", "desc": "Gere descrições completas usando sua base de dados interna." },
                "competency_mapping": { "title": "Mapeamento de Competências", "desc": "Vincule automaticamente habilidades necessárias a modelos globais." },
                "version_control": { "title": "Controle de Versão", "desc": "Rastreie cada mudança estrutural com rastreabilidade forense." },
                "org_chart_alignment": { "title": "Alinhamento Estratégico", "desc": "Garanta que os cargos estejam equilibrados com sua estrutura." },
                "multilingual_support": { "title": "Suporte Global", "desc": "Gerencie descrições em vários territórios com tradução fluida." },
                "professional_export": { "title": "Exportação Executiva", "desc": "Gere documentos PDF ou Word de alta fidelidade prontos para envio." }
            }
        },
        "repository": { "title": "Repositório de JD", "subtitle": "Gerencie versões de todas as descrições." },
        "builder": { "title": "Construtor de JD", "subtitle": "Redija novas descrições com assistência de IA." }
    },
    "de": {
        "landing": {
            "actions": {
                "back_to_workspace": "Zurück zum Workspace",
                "coming_soon": "Demnächst"
            },
            "hero": {
                "badge": "Aktives Konzept",
                "title": "ST. Intelligenz für Stellenbeschreibungen",
                "subtitle": "Zentralisieren und standardisieren Sie die Stellenbeschreibungen Ihrer Organisation.",
                "strategy_text": "Strategische Architektur & Bewertung"
            },
            "capabilities": {
                "title": "Modulfunktionen",
                "ai_drafting": { "title": "KI-gestützte Erstellung", "desc": "Erstellen Sie umfassende Beschreibungen mit Ihrer internen Datenbank." },
                "competency_mapping": { "title": "Kompetenz-Mapping", "desc": "Verknüpfen Sie erforderliche Fähigkeiten automatisch mit globalen Rahmenwerken." },
                "version_control": { "title": "Versionskontrolle", "desc": "Verfolgen Sie jede strukturelle Änderung mit forensischer Rückverfolgbarkeit." },
                "org_chart_alignment": { "title": "Strategische Ausrichtung", "desc": "Stellen Sie sicher, dass Rollen korrekt gewichtet sind." },
                "multilingual_support": { "title": "Globaler Support", "desc": "Verwalten Sie Beschreibungen für mehrere Gebiete mit nahtloser Übersetzung." },
                "professional_export": { "title": "Export für Führungskräfte", "desc": "Erstellen Sie PDF- oder Word-Dokumente in hoher Qualität." }
            }
        },
        "repository": { "title": "JD-Repository", "subtitle": "Verwalten und versionieren Sie alle Stellenbeschreibungen." },
        "builder": { "title": "JD-Builder", "subtitle": "Erstellen Sie neue Beschreibungen mit KI-Unterstützung." }
    }
}

for lang in languages:
    filepath = os.path.join(locales_dir, lang, "common.json")
    print(f"Applying fix to {lang}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'pages' not in data:
            data['pages'] = {}
        
        data['pages']['job_description'] = translations[lang]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Done.")
    except Exception as e:
        print(f"  Error: {e}")
