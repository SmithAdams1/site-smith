import { postCrmLead } from './_crm.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phoneCode, phoneNumber, interest, message } = req.body;

  if (!firstName || !email || !phoneCode || !phoneNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Own CRM (best-effort, independent of Pipedrive so the lead lands even if that path fails).
  // Direct Inquiries whose Area of Interest is Property Management route to Teresa
  // Cherry on the Property Management pipeline (mirrors the CRM's own Meta-form routing).
  const isPropertyManagement = interest === 'property-management';
  await postCrmLead(req, {
    full_name: `${firstName} ${lastName || ''}`.trim(),
    email,
    phone: `${phoneCode} ${phoneNumber}`.trim(),
    campaign_name: isPropertyManagement ? 'Property Management' : 'Website Contact',
    notes: [interest ? `Interest: ${interest}` : null, message ? `Message: ${message}` : null].filter(Boolean).join(' | ') || 'Contact form',
    ...(isPropertyManagement
      ? { assign_to_email: 'teresa.pinto@smithandadams.com', pipeline_name: 'Property Management' }
      : {}),
  });

  const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_TOKEN;
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
    '+90':  301, // Turkey
    '+971': 295, // Dubai/UAE
    '+1':   303, // United States
    '+44':  302, // United Kingdom
    '+91':  296, // India
    '+886': 300, // Taiwan
    '+852': 305, // Hong Kong
    '+880': 292, // Bangladesh
    '+86':  294, // China
    '+65':  298, // Singapore
    '+27':  299, // South Africa
    '+92':  297, // Pakistan
    '+244': 291, // Angola
  };

  // Normalise phone code key (strip variant suffixes like +1-809)
  const codeKey  = phoneCode.split('-')[0];
  const ownerId  = codeToOwner[codeKey]  ?? DEFAULT_OWNER;
  const marketId = codeToMarket[codeKey] ?? null;

  const fullName  = `${firstName} ${lastName}`.trim();
  const fullPhone = `${phoneCode} ${phoneNumber}`.trim();

  const interestLabels = {
    'golden-visa':        'Portugal Golden Visa',
    'real-estate':        'Real Estate Investment',
    'property-management':'Property Management',
    'other':              'Other Inquiry',
  };
  const interestLabel = interestLabels[interest] || interest || 'Not specified';

  try {
    // 1 — Create Person
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

    // 2 — Create Deal
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

    // 3 — Create Note on the DEAL
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
        body: JSON.stringify({
          content: noteLines,
          deal_id: dealId,   // note attached to deal, not person
        }),
      }
    );

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[contact] Pipedrive error:', err.message);
    return res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
}
