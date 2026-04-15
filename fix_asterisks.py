import glob

html_files = glob.glob('*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the emoji-triggering character with a standard asterisk
    # We will use HTML entity &#x2731; (Heavy Asterisk) or just *
    # standard * is too thin for a decorative mark.
    # Let's just use * and rely on the font-weight to make it thicker.
    new_content = content.replace('✳', '*')
    
    # In property-management.html, fix the header initial state
    if file == 'property-management.html':
        new_content = new_content.replace('<header class="fixed w-full z-50 transition-all duration-300 bg-[#0C1E28]">', '<header class="fixed w-full z-50 transition-all duration-300 bg-transparent">')

    # Also check urban-collection.html for the same header issue
    if file == 'urban-collection.html':
        new_content = new_content.replace('<header class="fixed w-full z-50 transition-all duration-300 bg-[#0C1E28]">', '<header class="fixed w-full z-50 transition-all duration-300 bg-transparent">')

    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {file}")

