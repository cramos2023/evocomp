import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'

# Status enums match the REAL DB migration (draft, active, archived)
# UI i18n only — profile content is flat text in canonical language

translations = {
    "en": {
        "landing": {
            "actions": {
                "back_to_workspace": "Back to Workspace",
                "cta_repository": "Go to Repository",
                "cta_create": "Create New Profile"
            },
            "hero": {
                "badge": "Job Description Intelligence",
                "title": "Job Description Management",
                "subtitle": "Centralize and standardize your organization's job descriptions. Build, version, approve, and manage role profiles in a secure, unified enterprise repository.",
                "strategy_text": "Strategic Architecture & Evaluation"
            },
            "capabilities_title": "MODULE CAPABILITIES",
            "capabilities": {
                "ai_builder": { "title": "AI-Assisted Builder", "desc": "Create job descriptions with intelligent suggestions for responsibilities, requirements, and skills based on your career architecture." },
                "compliance": { "title": "Compliance & Governance", "desc": "Ensure regulatory compliance with versioned approvals, audit trails, and role-based access controls for every change." },
                "multilingual": { "title": "Multi-Language Support", "desc": "Manage job profiles across 6 languages simultaneously with integrated translation workflows." },
                "org_chart": { "title": "Organizational Integration", "desc": "Connect profiles to organizational positions, org charts, and compensation bands for a unified view." },
                "versioning": { "title": "Version Control", "desc": "Track every change with append-only versioning. Compare versions side by side and maintain full history." },
                "export": { "title": "Professional Export", "desc": "Generate Word and PDF documents from approved profiles with configurable corporate templates." }
            }
        },
        "repository": {
            "title": "Job Profiles Repository",
            "subtitle": "Enterprise library of standardized job descriptions",
            "search_placeholder": "Search by title, code...",
            "filter_function": "Career Function",
            "filter_family": "Job Family",
            "filter_level": "Career Level",
            "filter_status": "Status",
            "all": "All",
            "new_profile": "New Profile",
            "no_profiles": "No job profiles found",
            "no_profiles_desc": "Create your first job profile to start building your organizational repository.",
            "total_count": "{{count}} profiles",
            "columns": {
                "title": "Job Title",
                "reference": "Code",
                "career_function": "Career Function",
                "career_level": "Career Level",
                "status": "Status",
                "updated": "Updated"
            }
        },
        "builder": {
            "title_new": "Create Job Profile",
            "title_edit": "Edit Job Profile",
            "steps": {
                "key_details": "Key Details",
                "scope_purpose": "Scope & Purpose",
                "responsibilities": "Responsibilities",
                "requirements": "Requirements",
                "review": "Review"
            },
            "fields": {
                "job_title": "Job Title",
                "reference_code": "Reference Code",
                "career_function": "Career Function",
                "job_family": "Job Family",
                "career_level": "Career Level",
                "business_type": "Business Type",
                "business_support": "Business Support",
                "core_jobs": "Core Jobs",
                "select": "Select...",
                "job_purpose": "Job Purpose",
                "typical_titles": "Typical Business Titles",
                "budget_responsibility": "Budget Responsibility",
                "geographical_responsibility": "Geographical Responsibility",
                "team_size": "Team Size",
                "supervised_levels": "Career Level of Supervised Roles",
                "stakeholders": "Stakeholders Management",
                "education": "Educational Qualifications",
                "experience_min": "Min. Years Experience",
                "experience_max": "Max. Years Experience",
                "additional_info": "Additional Information",
                "provider_1": "1st Provider Unique Position Code",
                "provider_2": "2nd Provider Unique Position Code",
                "provider_3": "3rd Provider Unique Position Code"
            },
            "responsibilities": {
                "title": "Key Responsibilities",
                "add": "Add Responsibility",
                "total_label": "Total Time Allocation",
                "must_equal_100": "Must equal exactly 100%",
                "col_title": "Title",
                "col_description": "Description",
                "col_skills": "Skills / Competencies",
                "col_expertise": "Expertise Level",
                "col_time": "% Time",
                "col_category": "Category",
                "col_essential": "Essential",
                "col_criticality": "Criticality",
                "col_actions": "Actions",
                "expertise_levels": {
                    "ENTRY": "Entry",
                    "JUNIOR": "Junior",
                    "SENIOR": "Senior",
                    "SPECIALIST": "Specialist",
                    "EXPERT": "Expert"
                },
                "criticality_levels": {
                    "LOW": "Low",
                    "MEDIUM": "Medium",
                    "HIGH": "High",
                    "CRITICAL": "Critical"
                }
            },
            "actions": {
                "next": "Next",
                "previous": "Previous",
                "save_draft": "Save as Draft",
                "cancel": "Cancel",
                "back_to_list": "Back to Repository"
            },
            "validation": {
                "title_required": "Job title is required",
                "function_required": "Career function is required",
                "level_required": "Career level is required",
                "responsibilities_100": "Responsibilities must total exactly 100%"
            },
            "success": {
                "created": "Job profile created successfully",
                "updated": "Job profile updated successfully"
            }
        },
        "viewer": {
            "version": "Version",
            "status": "Status",
            "created": "Created",
            "edit": "Edit",
            "sections": {
                "key_details": "Key Job Details",
                "scope": "Scope of Job",
                "purpose": "Job Purpose",
                "responsibilities": "Key Responsibilities",
                "requirements": "Requirements",
                "stakeholders": "Stakeholders",
                "typical_titles": "Typical Business Titles",
                "hr_restricted": "HR / Compensation Restricted",
                "governance": "Governance"
            }
        },
        "statuses": {
            "draft": "Draft",
            "active": "Active",
            "archived": "Archived"
        },
        "budget_options": {
            "N/A": "N/A",
            "<1M": "< 1M",
            "1-10M": "1 - 10M",
            "10-50M": "10 - 50M",
            ">50M": "> 50M"
        },
        "geo_options": {
            "LOCAL": "Local",
            "COUNTRY": "Country",
            "SUB_REGION": "Sub-Region",
            "REGION": "Region",
            "GLOBAL": "Global"
        },
        "team_options": {
            "INDIVIDUAL": "Individual Contributor",
            "1_2": "1-2 Team Members",
            "3_PLUS": "3+ Team Members",
            "LEADER": "Team Leader with Members",
            "NO_DIRECT": "No Direct Reports"
        }
    },
    "es": {
        "landing": {
            "actions": {
                "back_to_workspace": "Volver al Workspace",
                "cta_repository": "Ir al Repositorio",
                "cta_create": "Crear Nuevo Perfil"
            },
            "hero": {
                "badge": "Inteligencia de Descripciones de Cargo",
                "title": "Gestión de Descripciones de Cargo",
                "subtitle": "Centralice y estandarice las descripciones de cargo de su organización. Construya, versione, apruebe y gestione perfiles de rol en un repositorio empresarial seguro y unificado.",
                "strategy_text": "Arquitectura Estratégica y Evaluación"
            },
            "capabilities_title": "FUNCIONES DEL MÓDULO",
            "capabilities": {
                "ai_builder": { "title": "Constructor Asistido por IA", "desc": "Cree descripciones de cargo con sugerencias inteligentes de responsabilidades, requisitos y habilidades basadas en su arquitectura de carrera." },
                "compliance": { "title": "Cumplimiento y Gobernanza", "desc": "Asegure el cumplimiento normativo con aprobaciones versionadas, pistas de auditoría y controles de acceso basados en roles." },
                "multilingual": { "title": "Soporte Multi-Idioma", "desc": "Gestione perfiles de cargo en 6 idiomas simultáneamente con flujos de traducción integrados." },
                "org_chart": { "title": "Integración Organizacional", "desc": "Conecte perfiles a posiciones organizacionales, organigramas y bandas salariales para una visión unificada." },
                "versioning": { "title": "Control de Versiones", "desc": "Rastree cada cambio con versionado append-only. Compare versiones lado a lado y mantenga el historial completo." },
                "export": { "title": "Exportación Profesional", "desc": "Genere documentos Word y PDF desde perfiles aprobados con plantillas corporativas configurables." }
            }
        },
        "repository": {
            "title": "Repositorio de Perfiles de Cargo",
            "subtitle": "Biblioteca empresarial de descripciones de cargo estandarizadas",
            "search_placeholder": "Buscar por título, código...",
            "filter_function": "Función de Carrera",
            "filter_family": "Familia de Cargo",
            "filter_level": "Nivel de Carrera",
            "filter_status": "Estado",
            "all": "Todos",
            "new_profile": "Nuevo Perfil",
            "no_profiles": "No se encontraron perfiles de cargo",
            "no_profiles_desc": "Cree su primer perfil de cargo para comenzar a construir su repositorio organizacional.",
            "total_count": "{{count}} perfiles",
            "columns": {
                "title": "Título del Cargo",
                "reference": "Código",
                "career_function": "Función de Carrera",
                "career_level": "Nivel de Carrera",
                "status": "Estado",
                "updated": "Actualizado"
            }
        },
        "builder": {
            "title_new": "Crear Perfil de Cargo",
            "title_edit": "Editar Perfil de Cargo",
            "steps": {
                "key_details": "Datos Clave",
                "scope_purpose": "Alcance y Propósito",
                "responsibilities": "Responsabilidades",
                "requirements": "Requisitos",
                "review": "Revisión"
            },
            "fields": {
                "job_title": "Título del Cargo",
                "reference_code": "Código de Referencia",
                "career_function": "Función de Carrera",
                "job_family": "Familia de Cargo",
                "career_level": "Nivel de Carrera",
                "business_type": "Tipo de Negocio",
                "business_support": "Soporte de Negocio",
                "core_jobs": "Puestos Base",
                "select": "Seleccionar...",
                "job_purpose": "Propósito del Cargo",
                "typical_titles": "Títulos de Negocio Típicos",
                "budget_responsibility": "Responsabilidad Presupuestaria",
                "geographical_responsibility": "Responsabilidad Geográfica",
                "team_size": "Tamaño del Equipo",
                "supervised_levels": "Nivel de Carrera de Roles Supervisados",
                "stakeholders": "Gestión de Stakeholders",
                "education": "Cualificaciones Educativas",
                "experience_min": "Años Mínimos de Experiencia",
                "experience_max": "Años Máximos de Experiencia",
                "additional_info": "Información Adicional",
                "provider_1": "1er Código Único de Posición de Proveedor",
                "provider_2": "2do Código Único de Posición de Proveedor",
                "provider_3": "3er Código Único de Posición de Proveedor"
            },
            "responsibilities": {
                "title": "Responsabilidades Clave",
                "add": "Agregar Responsabilidad",
                "total_label": "Asignación Total de Tiempo",
                "must_equal_100": "Debe ser exactamente 100%",
                "col_title": "Título",
                "col_description": "Descripción",
                "col_skills": "Habilidades / Competencias",
                "col_expertise": "Nivel de Expertise",
                "col_time": "% Tiempo",
                "col_category": "Categoría",
                "col_essential": "Esencial",
                "col_criticality": "Criticidad",
                "col_actions": "Acciones",
                "expertise_levels": {
                    "ENTRY": "Entrada",
                    "JUNIOR": "Junior",
                    "SENIOR": "Senior",
                    "SPECIALIST": "Especialista",
                    "EXPERT": "Experto"
                },
                "criticality_levels": {
                    "LOW": "Baja",
                    "MEDIUM": "Media",
                    "HIGH": "Alta",
                    "CRITICAL": "Crítica"
                }
            },
            "actions": {
                "next": "Siguiente",
                "previous": "Anterior",
                "save_draft": "Guardar como Borrador",
                "cancel": "Cancelar",
                "back_to_list": "Volver al Repositorio"
            },
            "validation": {
                "title_required": "El título del cargo es requerido",
                "function_required": "La función de carrera es requerida",
                "level_required": "El nivel de carrera es requerido",
                "responsibilities_100": "Las responsabilidades deben sumar exactamente 100%"
            },
            "success": {
                "created": "Perfil de cargo creado exitosamente",
                "updated": "Perfil de cargo actualizado exitosamente"
            }
        },
        "viewer": {
            "version": "Versión",
            "status": "Estado",
            "created": "Creado",
            "edit": "Editar",
            "sections": {
                "key_details": "Datos Clave del Cargo",
                "scope": "Alcance del Cargo",
                "purpose": "Propósito del Cargo",
                "responsibilities": "Responsabilidades Clave",
                "requirements": "Requisitos",
                "stakeholders": "Stakeholders",
                "typical_titles": "Títulos de Negocio Típicos",
                "hr_restricted": "HR / Compensación Restringido",
                "governance": "Gobernanza"
            }
        },
        "statuses": {
            "draft": "Borrador",
            "active": "Activo",
            "archived": "Archivado"
        },
        "budget_options": {
            "N/A": "N/A",
            "<1M": "< 1M",
            "1-10M": "1 - 10M",
            "10-50M": "10 - 50M",
            ">50M": "> 50M"
        },
        "geo_options": {
            "LOCAL": "Local",
            "COUNTRY": "País",
            "SUB_REGION": "Sub-Región",
            "REGION": "Región",
            "GLOBAL": "Global"
        },
        "team_options": {
            "INDIVIDUAL": "Contribuidor Individual",
            "1_2": "1-2 Miembros de Equipo",
            "3_PLUS": "3+ Miembros de Equipo",
            "LEADER": "Líder de Equipo con Miembros",
            "NO_DIRECT": "Sin Reportes Directos"
        }
    },
    "fr": {
        "landing": {
            "actions": { "back_to_workspace": "Retour au Workspace", "cta_repository": "Aller au Référentiel", "cta_create": "Créer un Nouveau Profil" },
            "hero": { "badge": "Intelligence des Descriptions de Poste", "title": "Gestion des Descriptions de Poste", "subtitle": "Centralisez et standardisez les descriptions de poste de votre organisation. Construisez, versionnez, approuvez et gérez les profils de rôle dans un référentiel sécurisé.", "strategy_text": "Architecture Stratégique et Évaluation" },
            "capabilities_title": "FONCTIONNALITÉS DU MODULE",
            "capabilities": {
                "ai_builder": { "title": "Constructeur Assisté par IA", "desc": "Créez des descriptions de poste avec des suggestions intelligentes basées sur votre architecture de carrière." },
                "compliance": { "title": "Conformité et Gouvernance", "desc": "Assurez la conformité réglementaire avec des approbations versionnées et des pistes d'audit." },
                "multilingual": { "title": "Support Multi-Langues", "desc": "Gérez les profils de poste en 6 langues simultanément avec des flux de traduction intégrés." },
                "org_chart": { "title": "Intégration Organisationnelle", "desc": "Connectez les profils aux positions organisationnelles et aux bandes salariales." },
                "versioning": { "title": "Contrôle des Versions", "desc": "Suivez chaque changement avec un versionnage append-only et un historique complet." },
                "export": { "title": "Exportation Professionnelle", "desc": "Générez des documents Word et PDF depuis les profils approuvés." }
            }
        },
        "repository": { "title": "Référentiel de Profils de Poste", "subtitle": "Bibliothèque de descriptions de poste standardisées", "search_placeholder": "Rechercher par titre, code...", "filter_function": "Fonction de Carrière", "filter_family": "Famille de Poste", "filter_level": "Niveau de Carrière", "filter_status": "Statut", "all": "Tous", "new_profile": "Nouveau Profil", "no_profiles": "Aucun profil trouvé", "no_profiles_desc": "Créez votre premier profil pour démarrer votre référentiel.", "total_count": "{{count}} profils", "columns": { "title": "Titre du Poste", "reference": "Code", "career_function": "Fonction", "career_level": "Niveau", "status": "Statut", "updated": "Mis à jour" } },
        "builder": { "title_new": "Créer un Profil de Poste", "title_edit": "Modifier le Profil de Poste", "steps": { "key_details": "Données Clés", "scope_purpose": "Périmètre et Objectif", "responsibilities": "Responsabilités", "requirements": "Prérequis", "review": "Révision" }, "fields": { "job_title": "Titre du Poste", "reference_code": "Code de Référence", "career_function": "Fonction de Carrière", "job_family": "Famille de Poste", "career_level": "Niveau de Carrière", "business_type": "Type de Business", "business_support": "Support Business", "core_jobs": "Postes Opérationnels", "select": "Sélectionner...", "job_purpose": "Objectif du Poste", "typical_titles": "Titres Commerciaux Typiques", "budget_responsibility": "Responsabilité Budgétaire", "geographical_responsibility": "Responsabilité Géographique", "team_size": "Taille de l'Équipe", "supervised_levels": "Niveaux Supervisés", "stakeholders": "Gestion des Parties Prenantes", "education": "Qualifications Éducatives", "experience_min": "Années Min. d'Expérience", "experience_max": "Années Max. d'Expérience", "additional_info": "Informations Complémentaires", "provider_1": "1er Code Fournisseur", "provider_2": "2ème Code Fournisseur", "provider_3": "3ème Code Fournisseur" }, "responsibilities": { "title": "Responsabilités Clés", "add": "Ajouter une Responsabilité", "total_label": "Allocation Totale du Temps", "must_equal_100": "Doit être exactement 100%", "col_title": "Titre", "col_description": "Description", "col_skills": "Compétences", "col_expertise": "Niveau d'Expertise", "col_time": "% Temps", "col_category": "Catégorie", "col_essential": "Essentiel", "col_criticality": "Criticité", "col_actions": "Actions", "expertise_levels": { "ENTRY": "Débutant", "JUNIOR": "Junior", "SENIOR": "Senior", "SPECIALIST": "Spécialiste", "EXPERT": "Expert" }, "criticality_levels": { "LOW": "Faible", "MEDIUM": "Moyen", "HIGH": "Élevé", "CRITICAL": "Critique" } }, "actions": { "next": "Suivant", "previous": "Précédent", "save_draft": "Enregistrer comme Brouillon", "cancel": "Annuler", "back_to_list": "Retour au Référentiel" }, "validation": { "title_required": "Le titre est requis", "function_required": "La fonction est requise", "level_required": "Le niveau est requis", "responsibilities_100": "Les responsabilités doivent totaliser 100%" }, "success": { "created": "Profil créé avec succès", "updated": "Profil mis à jour avec succès" } },
        "viewer": { "version": "Version", "status": "Statut", "created": "Créé", "edit": "Modifier", "sections": { "key_details": "Données Clés", "scope": "Périmètre", "purpose": "Objectif", "responsibilities": "Responsabilités", "requirements": "Prérequis", "stakeholders": "Parties Prenantes", "typical_titles": "Titres Typiques", "hr_restricted": "RH / Compensation Restreint", "governance": "Gouvernance" } },
        "statuses": { "draft": "Brouillon", "active": "Actif", "archived": "Archivé" },
        "budget_options": { "N/A": "N/A", "<1M": "< 1M", "1-10M": "1 - 10M", "10-50M": "10 - 50M", ">50M": "> 50M" },
        "geo_options": { "LOCAL": "Local", "COUNTRY": "Pays", "SUB_REGION": "Sous-Région", "REGION": "Région", "GLOBAL": "Mondial" },
        "team_options": { "INDIVIDUAL": "Contributeur Individuel", "1_2": "1-2 Membres", "3_PLUS": "3+ Membres", "LEADER": "Chef d'Équipe", "NO_DIRECT": "Sans Rapports Directs" }
    },
    "it": {
        "landing": {
            "actions": { "back_to_workspace": "Torna al Workspace", "cta_repository": "Vai all'Archivio", "cta_create": "Crea Nuovo Profilo" },
            "hero": { "badge": "Intelligenza delle Descrizioni del Lavoro", "title": "Gestione delle Descrizioni del Lavoro", "subtitle": "Centralizza e standardizza le descrizioni del lavoro della tua organizzazione. Costruisci, versiona, approva e gestisci profili di ruolo in un archivio sicuro e unificato.", "strategy_text": "Architettura Strategica e Valutazione" },
            "capabilities_title": "FUNZIONALITÀ DEL MODULO",
            "capabilities": {
                "ai_builder": { "title": "Costruttore Assistito da IA", "desc": "Crea descrizioni del lavoro con suggerimenti intelligenti basati sulla tua architettura di carriera." },
                "compliance": { "title": "Conformità e Governance", "desc": "Assicura la conformità normativa con approvazioni versionate e tracce di audit." },
                "multilingual": { "title": "Supporto Multi-Lingua", "desc": "Gestisci profili di lavoro in 6 lingue simultaneamente con flussi di traduzione integrati." },
                "org_chart": { "title": "Integrazione Organizzativa", "desc": "Collega profili a posizioni organizzative e bande retributive per una visione unificata." },
                "versioning": { "title": "Controllo Versioni", "desc": "Traccia ogni modifica con versionamento append-only e storico completo." },
                "export": { "title": "Esportazione Professionale", "desc": "Genera documenti Word e PDF da profili approvati con template aziendali." }
            }
        },
        "repository": { "title": "Archivio Profili di Lavoro", "subtitle": "Biblioteca di descrizioni del lavoro standardizzate", "search_placeholder": "Cerca per titolo, codice...", "filter_function": "Funzione di Carriera", "filter_family": "Famiglia di Lavoro", "filter_level": "Livello di Carriera", "filter_status": "Stato", "all": "Tutti", "new_profile": "Nuovo Profilo", "no_profiles": "Nessun profilo trovato", "no_profiles_desc": "Crea il tuo primo profilo per iniziare a costruire l'archivio.", "total_count": "{{count}} profili", "columns": { "title": "Titolo del Lavoro", "reference": "Codice", "career_function": "Funzione", "career_level": "Livello", "status": "Stato", "updated": "Aggiornato" } },
        "builder": { "title_new": "Crea Profilo di Lavoro", "title_edit": "Modifica Profilo di Lavoro", "steps": { "key_details": "Dati Chiave", "scope_purpose": "Ambito e Scopo", "responsibilities": "Responsabilità", "requirements": "Requisiti", "review": "Revisione" }, "fields": { "job_title": "Titolo del Lavoro", "reference_code": "Codice di Riferimento", "career_function": "Funzione di Carriera", "job_family": "Famiglia di Lavoro", "career_level": "Livello di Carriera", "business_type": "Tipo di Business", "business_support": "Supporto Business", "core_jobs": "Ruoli Operativi", "select": "Seleziona...", "job_purpose": "Scopo del Lavoro", "typical_titles": "Titoli Commerciali Tipici", "budget_responsibility": "Responsabilità di Budget", "geographical_responsibility": "Responsabilità Geografica", "team_size": "Dimensione del Team", "supervised_levels": "Livelli Supervisionati", "stakeholders": "Gestione Stakeholder", "education": "Qualifiche Educative", "experience_min": "Anni Min. di Esperienza", "experience_max": "Anni Max. di Esperienza", "additional_info": "Informazioni Aggiuntive", "provider_1": "1° Codice Fornitore", "provider_2": "2° Codice Fornitore", "provider_3": "3° Codice Fornitore" }, "responsibilities": { "title": "Responsabilità Chiave", "add": "Aggiungi Responsabilità", "total_label": "Allocazione Totale del Tempo", "must_equal_100": "Deve essere esattamente 100%", "col_title": "Titolo", "col_description": "Descrizione", "col_skills": "Competenze", "col_expertise": "Livello di Expertise", "col_time": "% Tempo", "col_category": "Categoria", "col_essential": "Essenziale", "col_criticality": "Criticità", "col_actions": "Azioni", "expertise_levels": { "ENTRY": "Base", "JUNIOR": "Junior", "SENIOR": "Senior", "SPECIALIST": "Specialista", "EXPERT": "Esperto" }, "criticality_levels": { "LOW": "Bassa", "MEDIUM": "Media", "HIGH": "Alta", "CRITICAL": "Critica" } }, "actions": { "next": "Avanti", "previous": "Indietro", "save_draft": "Salva come Bozza", "cancel": "Annulla", "back_to_list": "Torna all'Archivio" }, "validation": { "title_required": "Il titolo è obbligatorio", "function_required": "La funzione è obbligatoria", "level_required": "Il livello è obbligatorio", "responsibilities_100": "Le responsabilità devono totalizzare 100%" }, "success": { "created": "Profilo creato con successo", "updated": "Profilo aggiornato con successo" } },
        "viewer": { "version": "Versione", "status": "Stato", "created": "Creato", "edit": "Modifica", "sections": { "key_details": "Dati Chiave", "scope": "Ambito", "purpose": "Scopo", "responsibilities": "Responsabilità", "requirements": "Requisiti", "stakeholders": "Stakeholder", "typical_titles": "Titoli Tipici", "hr_restricted": "HR / Compensazione Riservato", "governance": "Governance" } },
        "statuses": { "draft": "Bozza", "active": "Attivo", "archived": "Archiviato" },
        "budget_options": { "N/A": "N/A", "<1M": "< 1M", "1-10M": "1 - 10M", "10-50M": "10 - 50M", ">50M": "> 50M" },
        "geo_options": { "LOCAL": "Locale", "COUNTRY": "Paese", "SUB_REGION": "Sub-Regione", "REGION": "Regione", "GLOBAL": "Globale" },
        "team_options": { "INDIVIDUAL": "Contributore Individuale", "1_2": "1-2 Membri", "3_PLUS": "3+ Membri", "LEADER": "Team Leader", "NO_DIRECT": "Nessun Report Diretto" }
    },
    "pt": {
        "landing": {
            "actions": { "back_to_workspace": "Voltar ao Workspace", "cta_repository": "Ir ao Repositório", "cta_create": "Criar Novo Perfil" },
            "hero": { "badge": "Inteligência de Descrições de Cargo", "title": "Gestão de Descrições de Cargo", "subtitle": "Centralize e padronize as descrições de cargo de sua organização. Construa, versione, aprove e gerencie perfis de função em um repositório seguro e unificado.", "strategy_text": "Arquitetura Estratégica e Avaliação" },
            "capabilities_title": "RECURSOS DO MÓDULO",
            "capabilities": {
                "ai_builder": { "title": "Construtor Assistido por IA", "desc": "Crie descrições de cargo com sugestões inteligentes baseadas na sua arquitetura de carreira." },
                "compliance": { "title": "Conformidade e Governança", "desc": "Assegure conformidade regulatória com aprovações versionadas e trilhas de auditoria." },
                "multilingual": { "title": "Suporte Multi-Idioma", "desc": "Gerencie perfis de cargo em 6 idiomas simultaneamente com fluxos de tradução integrados." },
                "org_chart": { "title": "Integração Organizacional", "desc": "Conecte perfis a posições organizacionais e faixas salariais para uma visão unificada." },
                "versioning": { "title": "Controle de Versão", "desc": "Rastreie cada mudança com versionamento append-only e histórico completo." },
                "export": { "title": "Exportação Profissional", "desc": "Gere documentos Word e PDF a partir de perfis aprovados com templates corporativos." }
            }
        },
        "repository": { "title": "Repositório de Perfis de Cargo", "subtitle": "Biblioteca corporativa de descrições de cargo padronizadas", "search_placeholder": "Buscar por título, código...", "filter_function": "Função de Carreira", "filter_family": "Família de Cargo", "filter_level": "Nível de Carreira", "filter_status": "Status", "all": "Todos", "new_profile": "Novo Perfil", "no_profiles": "Nenhum perfil encontrado", "no_profiles_desc": "Crie seu primeiro perfil para iniciar seu repositório organizacional.", "total_count": "{{count}} perfis", "columns": { "title": "Título do Cargo", "reference": "Código", "career_function": "Função", "career_level": "Nível", "status": "Status", "updated": "Atualizado" } },
        "builder": { "title_new": "Criar Perfil de Cargo", "title_edit": "Editar Perfil de Cargo", "steps": { "key_details": "Dados Chave", "scope_purpose": "Escopo e Propósito", "responsibilities": "Responsabilidades", "requirements": "Requisitos", "review": "Revisão" }, "fields": { "job_title": "Título do Cargo", "reference_code": "Código de Referência", "career_function": "Função de Carreira", "job_family": "Família de Cargo", "career_level": "Nível de Carreira", "business_type": "Tipo de Negócio", "business_support": "Suporte ao Negócio", "core_jobs": "Cargos Operacionais", "select": "Selecionar...", "job_purpose": "Propósito do Cargo", "typical_titles": "Títulos Comerciais Típicos", "budget_responsibility": "Responsabilidade Orçamentária", "geographical_responsibility": "Responsabilidade Geográfica", "team_size": "Tamanho da Equipe", "supervised_levels": "Níveis Supervisionados", "stakeholders": "Gestão de Stakeholders", "education": "Qualificações Educacionais", "experience_min": "Anos Mín. de Experiência", "experience_max": "Anos Máx. de Experiência", "additional_info": "Informações Adicionais", "provider_1": "1º Código de Fornecedor", "provider_2": "2º Código de Fornecedor", "provider_3": "3º Código de Fornecedor" }, "responsibilities": { "title": "Responsabilidades Chave", "add": "Adicionar Responsabilidade", "total_label": "Alocação Total de Tempo", "must_equal_100": "Deve ser exatamente 100%", "col_title": "Título", "col_description": "Descrição", "col_skills": "Competências", "col_expertise": "Nível de Expertise", "col_time": "% Tempo", "col_category": "Categoria", "col_essential": "Essencial", "col_criticality": "Criticidade", "col_actions": "Ações", "expertise_levels": { "ENTRY": "Entrada", "JUNIOR": "Junior", "SENIOR": "Sênior", "SPECIALIST": "Especialista", "EXPERT": "Especialista Sênior" }, "criticality_levels": { "LOW": "Baixa", "MEDIUM": "Média", "HIGH": "Alta", "CRITICAL": "Crítica" } }, "actions": { "next": "Próximo", "previous": "Anterior", "save_draft": "Salvar como Rascunho", "cancel": "Cancelar", "back_to_list": "Voltar ao Repositório" }, "validation": { "title_required": "O título é obrigatório", "function_required": "A função é obrigatória", "level_required": "O nível é obrigatório", "responsibilities_100": "As responsabilidades devem totalizar 100%" }, "success": { "created": "Perfil criado com sucesso", "updated": "Perfil atualizado com sucesso" } },
        "viewer": { "version": "Versão", "status": "Status", "created": "Criado", "edit": "Editar", "sections": { "key_details": "Dados Chave", "scope": "Escopo", "purpose": "Propósito", "responsibilities": "Responsabilidades", "requirements": "Requisitos", "stakeholders": "Stakeholders", "typical_titles": "Títulos Típicos", "hr_restricted": "RH / Compensação Restrito", "governance": "Governança" } },
        "statuses": { "draft": "Rascunho", "active": "Ativo", "archived": "Arquivado" },
        "budget_options": { "N/A": "N/A", "<1M": "< 1M", "1-10M": "1 - 10M", "10-50M": "10 - 50M", ">50M": "> 50M" },
        "geo_options": { "LOCAL": "Local", "COUNTRY": "País", "SUB_REGION": "Sub-Região", "REGION": "Região", "GLOBAL": "Global" },
        "team_options": { "INDIVIDUAL": "Contribuidor Individual", "1_2": "1-2 Membros", "3_PLUS": "3+ Membros", "LEADER": "Líder de Equipe", "NO_DIRECT": "Sem Relatórios Diretos" }
    },
    "de": {
        "landing": {
            "actions": { "back_to_workspace": "Zurück zum Workspace", "cta_repository": "Zum Repository", "cta_create": "Neues Profil erstellen" },
            "hero": { "badge": "Intelligenz für Stellenbeschreibungen", "title": "Stellenbeschreibungs-Management", "subtitle": "Zentralisieren und standardisieren Sie die Stellenbeschreibungen Ihrer Organisation. Erstellen, versionieren und verwalten Sie Rollenprofile in einem sicheren Repository.", "strategy_text": "Strategische Architektur & Bewertung" },
            "capabilities_title": "MODULFUNKTIONEN",
            "capabilities": {
                "ai_builder": { "title": "KI-gestützter Builder", "desc": "Erstellen Sie Stellenbeschreibungen mit intelligenten Vorschlägen basierend auf Ihrer Karrierearchitektur." },
                "compliance": { "title": "Compliance & Governance", "desc": "Sichern Sie regulatorische Compliance mit versionierten Genehmigungen und Audit-Trails." },
                "multilingual": { "title": "Mehrsprachiger Support", "desc": "Verwalten Sie Stellenprofile in 6 Sprachen gleichzeitig." },
                "org_chart": { "title": "Organisationsintegration", "desc": "Verbinden Sie Profile mit Positionen und Vergütungsbändern." },
                "versioning": { "title": "Versionskontrolle", "desc": "Verfolgen Sie jede Änderung mit append-only Versionierung." },
                "export": { "title": "Professioneller Export", "desc": "Erstellen Sie Word- und PDF-Dokumente aus genehmigten Profilen." }
            }
        },
        "repository": { "title": "Stellenprofil-Repository", "subtitle": "Unternehmensbibliothek für standardisierte Stellenbeschreibungen", "search_placeholder": "Suche nach Titel, Code...", "filter_function": "Karrierefunktion", "filter_family": "Jobfamilie", "filter_level": "Karrierestufe", "filter_status": "Status", "all": "Alle", "new_profile": "Neues Profil", "no_profiles": "Keine Stellenprofile gefunden", "no_profiles_desc": "Erstellen Sie Ihr erstes Profil.", "total_count": "{{count}} Profile", "columns": { "title": "Stellenbezeichnung", "reference": "Code", "career_function": "Funktion", "career_level": "Stufe", "status": "Status", "updated": "Aktualisiert" } },
        "builder": { "title_new": "Stellenprofil erstellen", "title_edit": "Stellenprofil bearbeiten", "steps": { "key_details": "Schlüsseldaten", "scope_purpose": "Umfang & Zweck", "responsibilities": "Verantwortlichkeiten", "requirements": "Anforderungen", "review": "Überprüfung" }, "fields": { "job_title": "Stellenbezeichnung", "reference_code": "Referenzcode", "career_function": "Karrierefunktion", "job_family": "Jobfamilie", "career_level": "Karrierestufe", "business_type": "Geschäftstyp", "business_support": "Business Support", "core_jobs": "Kernpositionen", "select": "Auswählen...", "job_purpose": "Stellenzweck", "typical_titles": "Typische Geschäftstitel", "budget_responsibility": "Budgetverantwortung", "geographical_responsibility": "Geographische Verantwortung", "team_size": "Teamgröße", "supervised_levels": "Beaufsichtigte Stufen", "stakeholders": "Stakeholder-Management", "education": "Bildungsqualifikationen", "experience_min": "Min. Jahre Erfahrung", "experience_max": "Max. Jahre Erfahrung", "additional_info": "Zusätzliche Informationen", "provider_1": "1. Anbietercode", "provider_2": "2. Anbietercode", "provider_3": "3. Anbietercode" }, "responsibilities": { "title": "Schlüsselverantwortlichkeiten", "add": "Verantwortlichkeit hinzufügen", "total_label": "Gesamte Zeitverteilung", "must_equal_100": "Muss genau 100% betragen", "col_title": "Titel", "col_description": "Beschreibung", "col_skills": "Kompetenzen", "col_expertise": "Expertise-Level", "col_time": "% Zeit", "col_category": "Kategorie", "col_essential": "Wesentlich", "col_criticality": "Kritikalität", "col_actions": "Aktionen", "expertise_levels": { "ENTRY": "Einstieg", "JUNIOR": "Junior", "SENIOR": "Senior", "SPECIALIST": "Spezialist", "EXPERT": "Experte" }, "criticality_levels": { "LOW": "Niedrig", "MEDIUM": "Mittel", "HIGH": "Hoch", "CRITICAL": "Kritisch" } }, "actions": { "next": "Weiter", "previous": "Zurück", "save_draft": "Als Entwurf speichern", "cancel": "Abbrechen", "back_to_list": "Zurück zum Repository" }, "validation": { "title_required": "Stellenbezeichnung ist erforderlich", "function_required": "Karrierefunktion ist erforderlich", "level_required": "Karrierestufe ist erforderlich", "responsibilities_100": "Verantwortlichkeiten müssen 100% ergeben" }, "success": { "created": "Stellenprofil erfolgreich erstellt", "updated": "Stellenprofil erfolgreich aktualisiert" } },
        "viewer": { "version": "Version", "status": "Status", "created": "Erstellt", "edit": "Bearbeiten", "sections": { "key_details": "Schlüsseldaten", "scope": "Umfang", "purpose": "Zweck", "responsibilities": "Verantwortlichkeiten", "requirements": "Anforderungen", "stakeholders": "Stakeholder", "typical_titles": "Typische Titel", "hr_restricted": "HR / Vergütung Vertraulich", "governance": "Governance" } },
        "statuses": { "draft": "Entwurf", "active": "Aktiv", "archived": "Archiviert" },
        "budget_options": { "N/A": "N/A", "<1M": "< 1M", "1-10M": "1 - 10M", "10-50M": "10 - 50M", ">50M": "> 50M" },
        "geo_options": { "LOCAL": "Lokal", "COUNTRY": "Land", "SUB_REGION": "Sub-Region", "REGION": "Region", "GLOBAL": "Global" },
        "team_options": { "INDIVIDUAL": "Einzelbeitragender", "1_2": "1-2 Mitglieder", "3_PLUS": "3+ Mitglieder", "LEADER": "Teamleiter", "NO_DIRECT": "Keine direkten Berichte" }
    }
}

for lang_code in ['en', 'es', 'fr', 'it', 'pt', 'de']:
    filepath = os.path.join(locales_dir, lang_code, 'common.json')
    print(f"Updating {lang_code}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Replace the job_description block entirely under pages
    data['pages']['job_description'] = translations[lang_code]

    # Also update the workspace_hub module desc to stay aligned
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Done. Total keys in pages.job_description: {len(data['pages']['job_description'])}")

print("\nAll 6 locales updated.")
