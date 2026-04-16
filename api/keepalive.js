export default async function handler(req, res) {
  try {
    const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';
    
    // We fetch a single row from posts via REST API purely to trigger an active connection read logic on Supabase
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!supabaseResponse.ok) {
        throw new Error(`Failed to ping Supabase: ${supabaseResponse.statusText}`);
    }

    res.status(200).json({ 
        status: "Supabase Keep-Alive Ping Successful", 
        timestamp: new Date().toISOString() 
    });

  } catch (error) {
    console.error("Keep-Alive Cron Error:", error);
    res.status(500).json({ error: "Failed to perform database heartbeat" });
  }
}
