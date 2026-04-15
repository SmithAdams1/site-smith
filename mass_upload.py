import os, json, urllib.request

SUPABASE_URL_POSTS = "https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/posts"
SUPABASE_URL_STORAGE = "https://bcjtkfipcfvvitglgpys.supabase.co/storage/v1/object/blog-media"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0NTc2NywiZXhwIjoyMDkxODIxNzY3fQ.HMy7SRYEq1PtC30OCTPYfSN6cWaxO1k6WIhEnGyZt0I"

print("Fetching posts from Supabase...")
req = urllib.request.Request(f"{SUPABASE_URL_POSTS}?select=id,title,slug,image_url", headers={
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Accept': 'application/json'
})
response = urllib.request.urlopen(req)
posts = json.loads(response.read().decode('utf-8'))

for p in posts:
    img_path = p.get('image_url', '').replace('./', '').replace('../', '')
    if img_path.startswith('http'):
        print(f"Skipping {p['slug']} - already has external URL")
        continue

    target = img_path
    
    # If the exact path doesn't exist, we fall back to sensible defaults from your source files
    if not os.path.exists(target):
        target = "home/heroImage.png"
        if "urban-collection" in p['slug'] or "portugal-fastes" in p['slug']: 
            target = "about/aboutHero.png"
        elif "tax" in p['slug']: 
            target = "home/benefitsImage.png"
        elif "porto" in p['slug'] or "floor" in p['slug']:
            target = "urban-collections/heroImg1.png"
        elif "law" in p['slug']:
            target = "home/processImg2.png"
        elif "financ" in p['slug']:
            target = "home/processImg3.png"

    if not os.path.exists(target):
        print(f"⚠️ Cannot find any image locally for {p['slug']}, skipping...")
        continue

    filename = f"{p['slug']}-cover.png"
    if target.endswith('.jpg'): filename = f"{p['slug']}-cover.jpg"
    
    try:
        with open(target, 'rb') as fp:
            data = fp.read()
        
        mime = "image/png" if target.endswith('.png') else "image/jpeg"
        
        url = f"{SUPABASE_URL_STORAGE}/{filename}"
        req_up = urllib.request.Request(url, data=data, headers={
            'apikey': KEY,
            'Authorization': f'Bearer {KEY}',
            'Content-Type': mime
        }, method='POST')
        
        try:
            urllib.request.urlopen(req_up)
        except urllib.error.HTTPError as e:
            # 400 likely means it already exists, which is fine, we just want the link anyway
            if e.code != 400: raise e
    
        public_url = f"https://bcjtkfipcfvvitglgpys.supabase.co/storage/v1/object/public/blog-media/{filename}"
        
        req_patch = urllib.request.Request(f"{SUPABASE_URL_POSTS}?id=eq.{p['id']}", data=json.dumps({"image_url": public_url}).encode('utf-8'), headers={
            'apikey': KEY,
            'Authorization': f'Bearer {KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }, method='PATCH')
        
        urllib.request.urlopen(req_patch)
        
        print(f"✅ Uploaded and linked image for: {p['title']}")
        
    except Exception as e:
        print(f"❌ Failed to process {p['slug']}: {e}")

print("🚀 Mass upload finished!")
