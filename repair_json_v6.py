import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"Truncation Repair for {lang}...")
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            content = f.read().strip()
        
        data = None
        # Try from the end, looking for the last brace that makes it valid
        found = False
        for i in range(len(content), 0, -1):
            if content[i-1] == '}':
                try:
                    data = json.loads(content[:i])
                    print(f"  SUCCESS: Found valid JSON ending at char {i}")
                    found = True
                    break
                except:
                    continue
        
        if not found:
            print(f"  FAILED: Could not find any valid JSON prefix for {lang}")
            continue
            
        # Merge pages.pages if it exists
        if 'pages' in data and 'pages' in data['pages']:
            print(f"  Flattening nested pages in {lang}...")
            nested = data['pages']['pages']
            for k, v in nested.items():
                data['pages'][k] = v
            del data['pages']['pages']
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Final file written for {lang}.")
        
    except Exception as e:
        print(f"  CRITICAL ERROR for {lang}: {e}")
