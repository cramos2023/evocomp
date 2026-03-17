import os

locales_dir = r'c:\Users\carlo\Documents\evocomp\src\i18n\locales'
languages = ['en', 'es', 'fr', 'it', 'pt', 'de']

for lang in languages:
    filepath = os.path.join(locales_dir, lang, 'common.json')
    print(f"End of {lang}/common.json:")
    if not os.path.exists(filepath):
        print("  FILE NOT FOUND")
        continue
    with open(filepath, 'rb') as f:
        f.seek(0, 2)
        size = f.tell()
        f.seek(max(0, size - 100))
        data = f.read()
        print(f"  Size: {size}")
        print(f"  Last 100 bytes (repr): {data!r}")
