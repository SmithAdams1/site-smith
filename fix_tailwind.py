import glob
import re

html_files = glob.glob('*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if Tailwind CDN is present
    if 'cdn.tailwindcss.com' not in content:
        # Inject right before </head>
        snippet = '\n  <script src="https://cdn.tailwindcss.com"></script>\n  <script>tailwind.config = { corePlugins: { preflight: false } }</script>\n'
        content = content.replace('</head>', snippet + '</head>')
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added Tailwind CDN to {file}")

