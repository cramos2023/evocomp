import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

hub_translations = {
    "en": { "title": "Job Description Intelligence", "desc": "Design, version, and evaluate organizational roles with AI-driven architecture." },
    "es": { "title": "Inteligencia de Descripciones de Puesto", "desc": "Diseñe, versione y evalúe roles organizacionales con arquitectura impulsada por IA." },
    "fr": { "title": "Intelligence des Descriptions de Poste", "desc": "Concevez, versionnez et évaluez les rôles organisationnels avec une architecture IA." },
    "it": { "title": "Intelligenza delle Descrizioni del Lavoro", "desc": "Progetta, versiona e valuta i ruoli organizzativi con un'architettura guidata dall'IA." },
    "pt": { "title": "Inteligência de Descrições de Puesto", "desc": "Projete, versione e avalie cargos organizacionais com arquitetura baseada em IA." },
    "de": { "title": "Intelligenz für Stellenbeschreibungen", "desc": "Entwerfen, versionieren und bewerten Sie organisatorische Rollen mit KI-gesteuerter Architektur." }
}

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"Applying fix to {lang}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 1. Add workspace_hub.modules.job_description
        if 'workspace_hub' not in data: data['workspace_hub'] = {}
        if 'modules' not in data['workspace_hub']: data['workspace_hub']['modules'] = {}
        
        data['workspace_hub']['modules']['job_description'] = hub_translations[lang]
        
        # 2. Clean hero title (remove "ST. ")
        title = data.get('pages', {}).get('job_description', {}).get('landing', {}).get('hero', {}).get('title', '')
        if title.startswith('ST. '):
            data['pages']['job_description']['landing']['hero']['title'] = title.replace('ST. ', '', 1)
            print(f"  Cleaned title: {data['pages']['job_description']['landing']['hero']['title']}")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Done.")
        
    except Exception as e:
        print(f"  Error: {e}")
