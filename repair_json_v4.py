print("STARTING REPAIR")
import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']
print(f"Locales dir: {locales_dir}")

def merge_dicts(d1, d2):
    for k, v in d2.items():
        if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            merge_dicts(d1[k], v)
        else:
            d1[k] = v

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"Repairing {lang}...")
    if not os.path.exists(filepath):
        print(f"  FILE NOT FOUND: {filepath}")
        continue
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        objects = []
        depth = 0
        start = -1
        for i, char in enumerate(content):
            if char == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0 and start != -1:
                    obj_str = content[start:i+1]
                    try:
                        objects.append(json.loads(obj_str))
                    except Exception as e:
                        print(f"  Failed to parse an object at {start}: {e}")
                    start = -1
        
        if not objects:
            print(f"  FAILED: No JSON objects found in {lang}")
            continue
            
        merged = {}
        for obj in objects:
            merge_dicts(merged, obj)
            
        if 'pages' in merged and 'pages' in merged['pages']:
            print(f"  Flattening nested pages in {lang}...")
            nested = merged['pages']['pages']
            for k, v in nested.items():
                merged['pages'][k] = v
            del merged['pages']['pages']
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
        print(f"  SUCCESS: {lang} repaired.")
        
    except Exception as e:
        print(f"  CRITICAL FAILED for {lang}: {e}")
print("FINISHED REPAIR")
