import { postCrmLead, postCrmNewsletter } from './_crm.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phoneCode, phoneNumber, interest, message, attribution, source, partial } = req.body;

  // Newsletter: email only, its own CRM endpoint (kept here so the site stays
  // within the Vercel Hobby cap of 12 serverless functions).
  if (source === 'newsletter') {
    const em = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return res.status(400).json({ error: 'Invalid email' });
    const ok = await postCrmNewsletter({ email: em, locale: req.body.locale, page: req.body.page });
    return ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Subscription failed' });
  }

  // Sujoy Ghosh referral page (/sujoy): phone-first, email optional, and the
  // referral attribution is written on the lead itself (not cookie-based) so
  // the partner's commission can be audited per lead.
  if (source === 'sujoy' || source === 'sujoy-whatsapp') return handleSujoy(req, res);

  const isBrochure = typeof source === 'string' && source.indexOf('brochure-') === 0;
  // Brochure (gated download) and step-1 of the 2-step LP (partial:true) are
  // low-friction: name + email only, captured immediately so an abandoner is
  // never lost. Every other form still requires a phone.
  const phoneOptional = isBrochure || partial === true;
  if (!firstName || !email || (!phoneOptional && (!phoneCode || !phoneNumber))) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const hasPhone = Boolean(phoneCode && phoneNumber);

  // --- Own CRM (crm.smithandadams.com) is the source of truth. Routing:
  //   * Property Management inquiries -> Teresa Cherry / Property Management pipeline.
  //   * Everything else (incl. the Golden Visa landing page) -> Benjamin Sharps /
  //     Benjamin Pipeline, explicitly, so it never depends on env defaults.
  const isPropertyManagement = interest === 'property-management';
  const isInvestLP = source === 'lp-invest';
  const isChatgptLP = source === 'lp-chatgpt';
  const isBeato = source === 'beato-sol-15';

  const brochureName = source === 'brochure-golden-visa' ? 'Golden Visa'
    : source === 'brochure-d2' ? 'D2 Visa'
    : source === 'brochure-invest' ? 'Why invest in Portugal'
    : null;

  const campaignName = isPropertyManagement
    ? 'Property Management'
    : isChatgptLP
      ? 'ChatGPT Ads - Portugal Investment'
      : isInvestLP
        ? 'LP - Golden Visa (Invest)'
        : isBeato
          ? 'Beato Sol 15 (brochure)'
          : brochureName
            ? `Brochure - ${brochureName}`
            : 'Website Contact';

  const notes = [
    isChatgptLP ? 'Source: ChatGPT Ads (Portugal Investment LP)' : null,
    isInvestLP ? 'Source: Landing Page (Invest / Golden Visa)' : null,
    isBeato ? 'Source: Beato Sol 15 brochure request' : null,
    brochureName ? `Source: Brochure download - ${brochureName} (Invest page)` : null,
    interest ? `Interest: ${interest}` : null,
    (phoneCode || phoneNumber) ? `Phone code: ${phoneCode || ''}` : null,
    message ? `Message: ${message}` : null,
  ].filter(Boolean).join(' | ') || 'Contact form';

  const crmOk = await postCrmLead(req, {
    full_name: `${firstName} ${lastName || ''}`.trim(),
    email,
    phone: hasPhone ? `${phoneCode} ${phoneNumber}`.trim() : undefined,
    campaign_name: campaignName,
    notes,
    attribution,
    // Forward the raw form source so deriveSource() can label a no-gclid LP
    // lead "Landing Page" instead of falling through to "Website Organic".
    source,
    ...(isPropertyManagement
      ? { assign_to_email: 'teresa.pinto@smithandadams.com', pipeline_name: 'Property Management' }
      : { assign_to_email: 'benjamin.sharps@smithandadams.com', pipeline_name: 'Benjamin Pipeline' }),
  });

  // --- Pipedrive (legacy, being decommissioned): strictly best-effort. Its failure
  // must never break the form response now that the own CRM is the system of record.
  let pipedriveOk = false;
  // Skip the legacy Pipedrive path for phone-less partial captures; the own CRM
  // already holds the lead and Pipedrive expects a full contact.
  if (hasPhone) {
    try {
      pipedriveOk = await postToPipedrive({ firstName, lastName, email, phoneCode, phoneNumber, interest, message });
    } catch (err) {
      console.error('[contact] Pipedrive error:', err.message);
    }
  }

  if (crmOk || pipedriveOk) {
    return res.status(200).json({ success: true });
  }
  return res.status(500).json({ error: 'Submission failed. Please try again.' });
}

const clip = (v, n = 200) => String(v == null ? '' : v).trim().slice(0, n);

async function handleSujoy(req, res) {
  const b = req.body || {};
  const ref = /^SG-[A-Z0-9]{4}$/.test(String(b.lead_ref || '')) ? b.lead_ref : null;
  const code = clip(b.phoneCode, 6);
  const digits = String(b.phoneNumber || '').replace(/\D/g, '').slice(0, 15);
  const email = clip(b.email, 160).toLowerCase();
  const name = `${clip(b.firstName, 80)} ${clip(b.lastName, 80)}`.trim();
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!/^\+\d{1,4}$/.test(code) || digits.length < 6) return res.status(400).json({ error: 'Missing phone' });
  const phone = `${code} ${digits}`;
  const attr = b.attribution && typeof b.attribution === 'object' ? b.attribution : {};
  const utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => { if (attr[k]) utm[k] = clip(attr[k], 120); });

  // WhatsApp click after submitting: same phone within 24h, so the CRM dedups
  // onto the lead just created and appends this note (whatsapp_intent = true).
  if (b.source === 'sujoy-whatsapp') {
    const ok = await postCrmLead(req, {
      full_name: name || undefined, email: hasEmail ? email : undefined, phone,
      notes: `WhatsApp intent: clicked "Talk to the Portugal team"${ref ? ` (${ref})` : ''}`,
      campaign_name: 'Referral - Sujoy Ghosh', source_name: 'Sujoy Ghosh', attribution: utm,
    });
    return res.status(ok ? 200 : 502).json({ ok });
  }

  if (name.length < 2 || b.consent !== true) return res.status(400).json({ error: 'Missing required fields' });
  const q = b.qualification && typeof b.qualification === 'object' ? b.qualification : {};
  const qual = {
    qualification_persona: clip(q.persona, 60),
    qualification_objective: (Array.isArray(q.objective) ? q.objective : []).map((x) => clip(x, 60)).slice(0, 8),
    qualification_timeline: clip(q.timeline, 40),
    qualification_location: clip(q.location, 120),
  };
  const notes = [
    'Source: Sujoy Ghosh referral page (/sujoy)',
    ref ? `Reference: ${ref}` : null,
    `Profile: ${qual.qualification_persona}`,
    `Looking for: ${qual.qualification_objective.join(', ')}`,
    `Timeline: ${qual.qualification_timeline}`,
    `Based in: ${qual.qualification_location}`,
    hasEmail ? null : 'No email given (phone/WhatsApp only)',
  ].filter(Boolean).join(' | ');

  const ok = await postCrmLead(req, {
    full_name: name, email: hasEmail ? email : undefined, phone,
    campaign_name: 'Referral - Sujoy Ghosh', source_name: 'Sujoy Ghosh', notes, attribution: utm,
    raw_payload: {
      source: 'site-sujoy', lead_source: 'Sujoy Ghosh', referral_partner: 'Sujoy Ghosh',
      landing_page: '/sujoy', lead_ref: ref, ...utm, ...qual,
      consent: true, created_timestamp: new Date().toISOString(),
    },
    // India leads are re-assigned to the India specialist by the CRM itself.
    assign_to_email: 'benjamin.sharps@smithandadams.com', pipeline_name: 'Benjamin Pipeline',
  });
  return ok ? res.status(200).json({ success: true, ref }) : res.status(500).json({ error: 'Submission failed. Please try again.' });
}

async function postToPipedrive({ firstName, lastName, email, phoneCode, phoneNumber, interest, message }) {
  const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_TOKEN;
  if (!PIPEDRIVE_TOKEN) return false;
  const PIPELINE_ID = 16;
  const STAGE_ID = 110;

  const codeToOwner = {
    '+90':  26395882, // Turkey
    '+971': 29048455, // UAE / Dubai
    '+1':   28045156, // United States / Canada
    '+44':  28045156, // United Kingdom
    '+91':  26395871, // India
    '+886': 29048455, // Taiwan
    '+852': 29048455, // Hong Kong
  };
  const DEFAULT_OWNER = 29249359;

  // Market/Country enum option IDs
  const codeToMarket = {
    '+90':  301, '+971': 295, '+1': 303, '+44': 302, '+91': 296, '+886': 300,
    '+852': 305, '+880': 292, '+86': 294, '+65': 298, '+27': 299, '+92': 297, '+244': 291,
  };

  const codeKey  = phoneCode.split('-')[0];
  const ownerId  = codeToOwner[codeKey]  ?? DEFAULT_OWNER;
  const marketId = codeToMarket[codeKey] ?? null;

  const fullName  = `${firstName} ${lastName || ''}`.trim();
  const fullPhone = `${phoneCode} ${phoneNumber}`.trim();

  const interestLabels = {
    'golden-visa':        'Portugal Golden Visa',
    'real-estate':        'Real Estate Investment',
    'property-management':'Property Management',
    'other':              'Other Inquiry',
  };
  const interestLabel = interestLabels[interest] || interest || 'Not specified';

  const personRes = await fetch(
    `https://api.pipedrive.com/v1/persons?api_token=${PIPEDRIVE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:     fullName,
        email:    [{ value: email,     primary: true }],
        phone:    [{ value: fullPhone, primary: true }],
        owner_id: ownerId,
      }),
    }
  );
  const personData = await personRes.json();
  const personId   = personData?.data?.id;
  if (!personId) throw new Error('Person creation failed: ' + JSON.stringify(personData));

  const dealRes = await fetch(
    `https://api.pipedrive.com/v1/deals?api_token=${PIPEDRIVE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       `${fullName} — Website Lead`,
        person_id:   personId,
        pipeline_id: PIPELINE_ID,
        stage_id:    STAGE_ID,
        user_id:     ownerId,
        '216e52d1153fd4853583f5683a557caf61cc2614': 315,
        ...(marketId && { '468abeb93ff2e92ca6182eb5b2028faf545ae7ac': marketId }),
      }),
    }
  );
  const dealData = await dealRes.json();
  const dealId   = dealData?.data?.id;
  if (!dealId) throw new Error('Deal creation failed: ' + JSON.stringify(dealData));

  const noteLines = [
    `Source: Website Contact Form`,
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${fullPhone}`,
    `Area of Interest: ${interestLabel}`,
    message ? `\nMessage:\n${message}` : null,
  ].filter(Boolean).join('\n');

  await fetch(
    `https://api.pipedrive.com/v1/notes?api_token=${PIPEDRIVE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteLines, deal_id: dealId }),
    }
  );

  return true;
}
