import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"Top-level keys in {lang}/common.json:")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            keys = list(data.keys())
            print(f"  {keys}")
    except Exception as e:
        print(f"  ERROR: {e}")
