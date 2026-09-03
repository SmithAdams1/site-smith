// Shared CRM lead ingestion for the site's forms (contact, property enquiry).
// Mirrors api/guide.js: posts to the own CRM (crm.smithandadams.com), origin
// "Website Organic", routed to one agent (CRM_ASSIGN_TO / CRM_PIPELINE), with
// the country taken from Vercel's geo header. Best-effort and never throws, so
// a CRM outage can't break a form submission.
const COUNTRY_NAMES = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', IE: 'Ireland', PT: 'Portugal',
  AE: 'United Arab Emirates', SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman',
  BR: 'Brazil', ZA: 'South Africa', FR: 'France', DE: 'Germany', CH: 'Switzerland', ES: 'Spain',
  NL: 'Netherlands', BE: 'Belgium', LU: 'Luxembourg', AU: 'Australia', SG: 'Singapore', HK: 'Hong Kong',
  IN: 'India', TR: 'Turkey', IL: 'Israel',
};

// Derive the real acquisition source from the click ids / utm the visitor
// arrived with, instead of labelling every form "Website Organic". A Google
// click id means paid Google; utm medium cpc/paid maps by network; a lead the
// LP tagged is at least "Landing Page". Names match the CRM's lead_sources.
function deriveSource(lead, attr) {
  if (attr.gclid || attr.gbraid || attr.wbraid) return 'Google Ads';
  const um = String(attr.utm_medium || '').toLowerCase();
  const us = String(attr.utm_source || '').toLowerCase();
  if (attr.fbclid) return 'Meta Ads';
  if (um.includes('cpc') || um.includes('ppc') || um.includes('paid')) {
    if (us.includes('google')) return 'Google Ads';
    if (us.includes('facebook') || us.includes('meta') || us.includes('instagram') || us.includes('ig')) return 'Meta Ads';
    if (us.includes('linkedin')) return 'LinkedIn Ads';
  }
  if (lead.source === 'lp-invest') return 'Landing Page';
  return 'Website Organic';
}

export async function postCrmLead(req, lead) {
  const CRM_API_URL = process.env.CRM_API_URL;
  const CRM_API_KEY = process.env.CRM_API_KEY;
  if (!CRM_API_URL || !CRM_API_KEY || !lead || !lead.email) return false;
  try {
    const cc = String((req.headers && req.headers['x-vercel-ip-country']) || '').toUpperCase();
    const country = COUNTRY_NAMES[cc] || cc || null;
    // Marketing attribution (gclid / utm) captured client-side and forwarded so
    // leads can be tied back to Google Ads for offline (MQL/SQL) conversion import.
    const attr = lead.attribution && typeof lead.attribution === 'object' ? lead.attribution : {};
    const attrStr = Object.keys(attr)
      .filter((k) => attr[k])
      .map((k) => `${k}=${attr[k]}`)
      .join(' | ');
    const notes = [lead.notes, attrStr ? `Attribution: ${attrStr}` : null].filter(Boolean).join(' | ') || undefined;
    const crmRes = await fetch(`${CRM_API_URL.replace(/\/$/, '')}/api/v1/leads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: lead.full_name || lead.email,
        email: lead.email,
        phone: lead.phone || undefined,
        source: deriveSource(lead, attr),
        campaign_name: lead.campaign_name || 'Website form',
        notes,
        target_country: lead.target_country || country,
        gclid: attr.gclid || undefined,
        ga_client_id: attr.ga_client_id || undefined,
        utm_source: attr.utm_source || undefined,
        utm_medium: attr.utm_medium || undefined,
        utm_campaign: attr.utm_campaign || undefined,
        assign_to_email: lead.assign_to_email || process.env.CRM_ASSIGN_TO || undefined,
        pipeline_name: lead.pipeline_name || process.env.CRM_PIPELINE || 'Benjamin Pipeline',
      }),
    });
    return crmRes.ok;
  } catch (e) {
    console.error('[crm] lead error:', e.message);
    return false;
  }
}

export { COUNTRY_NAMES };
