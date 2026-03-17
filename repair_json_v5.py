import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

def merge_dicts(d1, d2):
    for k, v in d2.items():
        if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            merge_dicts(d1[k], v)
        else:
            d1[k] = v

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"Final Repair Attempt for {lang}...")
    try:
        # Use utf-8-sig to handle BOM automatically
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            content = f.read()

        print(f"  Read {len(content)} characters.")
        
        objects = []
        depth = 0
        start = -1
        
        # Robust brace matcher that ignores braces in strings
        in_string = False
        escape = False
        
        for i, char in enumerate(content):
            if char == '"' and not escape:
                in_string = not in_string
            
            if escape:
                escape = False
            elif char == '\\' and in_string:
                escape = True
            
            if not in_string:
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
                            print(f"  Found valid object at {start}:{i+1}")
                        except Exception as e:
                            print(f"  JSON block at {start} looks invalid: {e}")
                        start = -1
        
        if not objects:
            print(f"  FAILED: No valid JSON objects found in {lang}")
            continue

        merged = {}
        for obj in objects:
            merge_dicts(merged, obj)
            
        # Flatten double 'pages' if it exists.
        if 'pages' in merged and 'pages' in merged['pages']:
            print(f"  Flattening nested pages in {lang}...")
            nested = merged['pages']['pages']
            for k, v in nested.items():
                merged['pages'][k] = v
            del merged['pages']['pages']
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
        print(f"  SUCCESS: {lang} repaired and validated.")
        
    except Exception as e:
        print(f"  CRITICAL ERROR for {lang}: {e}")
