import json
import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"Repairing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        # Strip everything after the LAST brace that we think is the root end.
        # This is tricky because we might have extra braces.
        # Let's count braces from the start.
        
        brace_count = 0
        end_pos = -1
        for i, char in enumerate(content):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i
                    # We might have more data after the FIRST root object closure.
                    # That's exactly what we want to strip.
                    break
        
        if end_pos != -1:
            clean_content = content[:end_pos+1]
        else:
            clean_content = content
            
        data = json.loads(clean_content)
        
        # Fix the pages nesting if it exists
        if 'pages' in data and 'pages' in data['pages']:
            print(f"  Found nested pages in {lang}. Merging...")
            nested = data['pages']['pages']
            for k, v in nested.items():
                data['pages'][k] = v
            del data['pages']['pages']
            
        # Also check if job_description is in pages correctly
        if 'pages' in data and 'job_description' in data['pages']:
            print(f"  Confirming job_description hierarchy in {lang}.")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("  OK")
        
    except Exception as e:
        print(f"  FAILED: {e}")
