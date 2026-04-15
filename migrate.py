import os, json, re, urllib.request

SUPABASE_URL = "https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/posts"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0NTc2NywiZXhwIjoyMDkxODIxNzY3fQ.HMy7SRYEq1PtC30OCTPYfSN6cWaxO1k6WIhEnGyZt0I"

def clean_html(raw_html):
    return re.sub(r'<.*?>', '', raw_html)

count = 0
for f in os.listdir('./blog'):
    if not f.endswith('.html'): continue
    with open(f'./blog/{f}', 'r', encoding='utf-8') as file:
        content = file.read()
    
    title_res = re.search(r'<h1[^>]*>(.*?)</h1>', content)
    title = title_res.group(1).strip() if title_res else f.replace('.html', '').replace('-', ' ').title()
    
    content_res = re.search(r'blog-content[^>]*>(.*?)</div><div class="mt-12', content, re.DOTALL)
    body = content_res.group(1).strip() if content_res else "<p>Re-formatting required.</p>"
    
    p_res = re.search(r'<p>(.*?)</p>', body)
    excerpt = clean_html(p_res.group(1))[:150] + "..." if p_res else "Read full article to learn more."
    
    # The header image in NextJS export is weird, lets map it by slug roughly or just grab any static image
    # They passed heroImage, processImg, etc. I'll just use a generic one if regex fails.
    img_url = "./home/heroImage.png"
    if 'urban-collection' in f: img_url = "./home/urbanCollectionsCardImage.png"
    if 'tax-benefits' in f: img_url = "./home/benefitsImage.png"
    if 'lisbon-vs-porto' in f: img_url = "./urban-collections/heroImg1.png"
    if 'property-law' in f: img_url = "./home/processImg2.png"
    if 'financing' in f: img_url = "./home/processImg3.png"
    if 'lifestyle' in f: img_url = "images/external/61e45eb9b853b959a583b9478933ee8a.jpg"
    
    # Grab category pill if it exists
    cat = "Investment"
    if "Lifestyle" in content or "lifestyle" in f: cat = "Lifestyle"
    if "Real Estate" in content or "urban" in f or "lisbon" in f: cat = "Real Estate"
    
    post = {
        "title": title,
        "slug": f.replace('.html', ''),
        "excerpt": excerpt,
        "content": body,
        "category": cat,
        "read_time": "7 Min Read",
        "image_url": img_url
    }
    
    req = urllib.request.Request(SUPABASE_URL, data=json.dumps(post).encode('utf-8'), headers={
        'apikey': KEY,
        'Authorization': f'Bearer {KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }, method='POST')
    
    try:
        response = urllib.request.urlopen(req)
        print(f"Migrated: {title}")
        count += 1
    except Exception as e:
        print(f"Failed {title}: {e}")

print(f"Total migrated: {count}")
