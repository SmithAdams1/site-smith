import glob
import re

html_files = glob.glob('*.html')
vercel_script = '\n  <script defer src="/_vercel/insights/script.js"></script>\n'

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already present
    if '/_vercel/insights/script.js' in content:
        continue
        
    # Inject right before </head>
    new_content = re.sub(r'</head>', vercel_script + '</head>', content, count=1, flags=re.IGNORECASE)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Added Analytics to {file}")

