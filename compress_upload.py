import os, json, urllib.request, subprocess

SUPABASE_URL_POSTS = "https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/posts"
SUPABASE_URL_STORAGE = "https://bcjtkfipcfvvitglgpys.supabase.co/storage/v1/object/blog-media"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0NTc2NywiZXhwIjoyMDkxODIxNzY3fQ.HMy7SRYEq1PtC30OCTPYfSN6cWaxO1k6WIhEnGyZt0I"

print("Fetching posts...")
req = urllib.request.Request(f"{SUPABASE_URL_POSTS}?select=id,title,slug", headers={
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Accept': 'application/json'
})
response = urllib.request.urlopen(req)
posts = json.loads(response.read().decode('utf-8'))

os.makedirs('tmp', exist_ok=True)

for p in posts:
    # Determine local file
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
        continue

    # Compress using sips (macOS native engine)
    tmp_out = f"tmp/{p['slug']}_compressed.jpg"
    subprocess.run(["sips", "-Z", "800", "-s", "format", "jpeg", "-s", "formatOptions", "40", target, "--out", tmp_out], capture_output=True)

    if not os.path.exists(tmp_out):
        continue

    filename = f"{p['slug']}_compressed_{os.urandom(4).hex()}.jpg"
    
    try:
        with open(tmp_out, 'rb') as fp:
            data = fp.read()
        
        # Upload
        url = f"{SUPABASE_URL_STORAGE}/{filename}"
        req_up = urllib.request.Request(url, data=data, headers={
            'apikey': KEY,
            'Authorization': f'Bearer {KEY}',
            'Content-Type': 'image/jpeg'
        }, method='POST')
        
        try:
            urllib.request.urlopen(req_up)
        except urllib.error.HTTPError as e:
            if e.code != 400: raise e
    
        public_url = f"https://bcjtkfipcfvvitglgpys.supabase.co/storage/v1/object/public/blog-media/{filename}"
        
        # Update DB
        req_patch = urllib.request.Request(f"{SUPABASE_URL_POSTS}?id=eq.{p['id']}", data=json.dumps({"image_url": public_url}).encode('utf-8'), headers={
            'apikey': KEY,
            'Authorization': f'Bearer {KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }, method='PATCH')
        
        urllib.request.urlopen(req_patch)
        print(f"✅ Re-uploaded COMPRESSED image for: {p['title']}")
    except Exception as e:
        print(f"Failed {p['slug']}: {e}")

print("Done compressing and re-uploading all images!")
