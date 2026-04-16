with open('urban-collection.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix hamburger logic
text = text.replace(
    '<button class="lg:hidden relative z-50 focus:outline-none" aria-label="Toggle menu">',
    '''<button onclick="document.getElementById('mobile-menu').classList.toggle('opacity-0'); document.getElementById('mobile-menu').classList.toggle('opacity-100'); document.getElementById('mobile-menu').classList.toggle('invisible'); document.getElementById('mobile-menu').classList.toggle('pointer-events-none');" aria-label="Toggle menu" class="lg:hidden relative z-50 focus:outline-none">'''
)
text = text.replace(
    '<div class="fixed top-0 left-0 right-0 bottom-0 bg-[#0C1E28] z-40 flex flex-col items-center justify-center lg:hidden transition-all duration-300 ease-in-out opacity-0 invisible pointer-events-none"',
    '<div id="mobile-menu" class="fixed top-0 left-0 right-0 bottom-0 bg-[#0C1E28] z-40 flex flex-col items-center justify-center lg:hidden transition-all duration-300 ease-in-out opacity-0 invisible pointer-events-none"'
)

# Inject scroll background script if missing
scripts = '''
<script id="header-scroll-script">
    document.addEventListener('DOMContentLoaded', function () {
        const header = document.querySelector('header');
        if (!header) return;
        const container = header.querySelector('.container');
        
        function updateHeader() {
            if (window.scrollY > 30) {
                header.classList.remove('bg-transparent');
                header.classList.add('bg-[#0C1E28]', 'shadow-sm');
                if (container) {
                    container.classList.remove('py-6', 'md:py-6');
                    container.classList.add('py-4', 'md:py-4');
                }
            } else {
                header.classList.remove('bg-[#0C1E28]', 'shadow-sm');
                header.classList.add('bg-transparent');
                if (container) {
                    container.classList.remove('py-4', 'md:py-4');
                    container.classList.add('py-6', 'md:py-6');
                }
            }
        }
        
        window.addEventListener('scroll', updateHeader);
        updateHeader(); // Init
    });
</script>
'''
if "header-scroll-script" not in text:
    text = text.replace('</body>', scripts + '\n</body>')

# Mobile specific CSS fixes
css_adds = """
      .c-right { margin-left: 0; margin-top: 0; }
      .g-item { transform: none !important; margin-bottom: 20px; }
      .c-img-wrap h3 { right: 20px !important; top: 20px !important; left: 20px !important; text-align: center !important; font-size: 28px !important; }
      .hero-content { left: 0 !important; bottom: 0 !important; padding: 0 24px 60px !important; width: 100% !important; box-sizing: border-box !important; }
"""
if ".g-item { transform: none !important;" not in text:
    text = text.replace("      .c-right { margin-left: 0; margin-top: 0; }", css_adds)

with open('urban-collection.html', 'w', encoding='utf-8') as f:
    f.write(text)
