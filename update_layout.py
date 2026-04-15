import re

with open("index.html", "r", encoding="utf-8") as f:
    text = f.read()

# Extract header (from <header> to </header>)
header_match = re.search(r'(<header class="fixed w-full z-50 transition-all duration-300 bg-\[#0C1E28\]">.*?</header>)', text, re.DOTALL)
header_html = header_match.group(1)

# Extract footer
footer_match = re.search(r'(<footer class="w-full py-12 md:py-16 bg-\[#0C1E28\]">.*?</footer>)', text, re.DOTALL)
footer_html = footer_match.group(1)

# Add pure JS toggle to header
header_html = header_html.replace(
    'class="fixed top-0 left-0 right-0 bottom-0 bg-[#0C1E28] z-40 flex flex-col items-center justify-center lg:hidden transition-all duration-300 ease-in-out opacity-100 invisible pointer-events-none"',
    'id="mobile-menu" class="fixed top-0 left-0 right-0 bottom-0 bg-[#0C1E28] z-40 flex flex-col items-center justify-center lg:hidden transition-all duration-300 ease-in-out opacity-0 invisible pointer-events-none"'
)
header_html = header_html.replace(
    '<button aria-label="Toggle menu"',
    '<button onclick="document.getElementById(\'mobile-menu\').classList.toggle(\'opacity-0\'); document.getElementById(\'mobile-menu\').classList.toggle(\'opacity-100\'); document.getElementById(\'mobile-menu\').classList.toggle(\'invisible\'); document.getElementById(\'mobile-menu\').classList.toggle(\'pointer-events-none\');" aria-label="Toggle menu"'
)

def replace_in_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace header: find <header> ... </header>
    content = re.sub(r'<header.*?</header>', header_html, content, flags=re.DOTALL)
    
    # Replace footer: find <footer> ... </footer>
    content = re.sub(r'<footer.*?</footer>', footer_html, content, flags=re.DOTALL)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filepath}")

replace_in_file("blog.html")
replace_in_file("article.html")

