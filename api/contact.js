import { postCrmLead } from './_crm.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phoneCode, phoneNumber, interest, message, attribution, source } = req.body;

  const isBrochure = typeof source === 'string' && source.indexOf('brochure-') === 0;
  // Brochure (gated-download) leads are low-friction: name + email only. Every
  // other form still requires a phone.
  if (!firstName || !email || (!isBrochure && (!phoneCode || !phoneNumber))) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // --- Own CRM (crm.smithandadams.com) is the source of truth. Routing:
  //   * Property Management inquiries -> Teresa Cherry / Property Management pipeline.
  //   * Everything else (incl. the Golden Visa landing page) -> Benjamin Sharps /
  //     Benjamin Pipeline, explicitly, so it never depends on env defaults.
  const isPropertyManagement = interest === 'property-management';
  const isInvestLP = source === 'lp-invest';
  const isBeato = source === 'beato-sol-15';

  const brochureName = source === 'brochure-golden-visa' ? 'Golden Visa'
    : source === 'brochure-d2' ? 'D2 Visa'
    : source === 'brochure-invest' ? 'Why invest in Portugal'
    : null;

  const campaignName = isPropertyManagement
    ? 'Property Management'
    : isInvestLP
      ? 'LP - Golden Visa (Invest)'
      : isBeato
        ? 'Beato Sol 15 (brochure)'
        : brochureName
          ? `Brochure - ${brochureName}`
          : 'Website Contact';

  const notes = [
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
    phone: `${phoneCode} ${phoneNumber}`.trim(),
    campaign_name: campaignName,
    notes,
    attribution,
    ...(isPropertyManagement
      ? { assign_to_email: 'teresa.pinto@smithandadams.com', pipeline_name: 'Property Management' }
      : { assign_to_email: 'benjamin.sharps@smithandadams.com', pipeline_name: 'Benjamin Pipeline' }),
  });

  // --- Pipedrive (legacy, being decommissioned): strictly best-effort. Its failure
  // must never break the form response now that the own CRM is the system of record.
  let pipedriveOk = false;
  try {
    pipedriveOk = await postToPipedrive({ firstName, lastName, email, phoneCode, phoneNumber, interest, message });
  } catch (err) {
    console.error('[contact] Pipedrive error:', err.message);
  }

  if (crmOk || pipedriveOk) {
    return res.status(200).json({ success: true });
  }
  return res.status(500).json({ error: 'Submission failed. Please try again.' });
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
