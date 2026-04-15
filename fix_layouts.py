import glob
import re

# Part 1: Global horizontal scroll fix
html_files = glob.glob('*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add overflow-x-hidden w-full to body if not present
    if '<body' in content and 'overflow-x-hidden' not in content:
        # Some are <body class="...">, some are just <body>
        content = re.sub(r'<body([^>]*)class="([^"]*)"', r'<body\1class="\2 overflow-x-hidden w-full"', content)
        content = re.sub(r'(<body)(?!.*class)([^>]*)>', r'\1 class="overflow-x-hidden w-full"\2>', content)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)


# Part 2: Fix specific issues in property-management.html
pm_file = 'property-management.html'
with open(pm_file, 'r', encoding='utf-8') as f:
    pm = f.read()

# Menu toggle
pm = pm.replace(
    '<button class="lg:hidden relative z-50 focus:outline-none" aria-label="Toggle menu">',
    '''<button onclick="document.getElementById('mobile-menu').classList.toggle('opacity-0'); document.getElementById('mobile-menu').classList.toggle('opacity-100'); document.getElementById('mobile-menu').classList.toggle('invisible'); document.getElementById('mobile-menu').classList.toggle('pointer-events-none');" aria-label="Toggle menu" class="lg:hidden relative z-50 focus:outline-none">'''
)

# Menu wrapper
pm = re.sub(
    r'<div class="fixed top-0 left-0 right-0 bottom-0 bg-\[#0C1E28\] z-40 flex flex-col items-center justify-center lg:hidden transition-all duration-300 ease-in-out opacity-0 invisible pointer-events-none"',
    r'<div id="mobile-menu" class="fixed top-0 left-0 right-0 bottom-0 bg-[#0C1E28] z-40 flex flex-col items-center justify-center lg:hidden transition-all duration-300 ease-in-out opacity-0 invisible pointer-events-none"',
    pm
)

# Fix 100% stats grid (4 cols) -> 1 or 2 or 4 cols
pm = pm.replace(
    'style="display:grid; grid-template-columns:repeat(4,1fr); border-left:1px solid rgba(255,255,255,0.08);"',
    'class="grid grid-cols-2 md:grid-cols-4" style="border-left:1px solid rgba(255,255,255,0.08);"'
)

# Fix features grid (auto-fit) -> 1 or 2 or 4 cols
pm = pm.replace(
    'style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:2px; background:#e5e7eb; border:1px solid #e5e7eb; border-radius:20px; overflow:hidden;"',
    'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[2px] bg-[#e5e7eb] rounded-[20px] overflow-hidden border border-[#e5e7eb]"'
)

# Fix Who it's for grid (2 cols) -> 1 or 2 cols
pm = pm.replace(
    'style="display:grid; grid-template-columns:1fr 1fr; gap:20px;"',
    'class="grid grid-cols-1 lg:grid-cols-2 gap-8"'
)

# Fix 40px paddings on mobile
pm = pm.replace('padding:0 40px 0;', 'padding:0 24px 0;')
pm = pm.replace('padding:0 40px;', 'padding:0 24px;')
pm = pm.replace('padding:120px 40px;', 'padding:80px 24px;')
pm = pm.replace('padding:0 40px 120px;', 'padding:0 24px 80px;')
pm = pm.replace('padding:80px 40px 120px;', 'padding:60px 24px 80px;')
pm = pm.replace('padding:48px 36px;', 'padding:32px 24px;')
pm = pm.replace('padding:56px 48px;', 'padding:40px 32px;')

with open(pm_file, 'w', encoding='utf-8') as f:
    f.write(pm)

print("Fixed layouts successfully.")
