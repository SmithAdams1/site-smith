// Property enquiry -> Pipedrive (Person + Deal + Note) and optional email.
// Mirrors api/contact.js, adding the specific property to the deal title and note.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { firstName, lastName, email, phoneCode, phoneNumber, message, property } = req.body || {};
  if (!firstName || !email || !phoneNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_TOKEN;
  const PIPELINE_ID = 16;
  const STAGE_ID = 110;

  const codeToOwner = {
    '+90': 26395882, '+971': 29048455, '+1': 28045156, '+44': 28045156,
    '+91': 26395871, '+886': 29048455, '+852': 29048455,
  };
  const DEFAULT_OWNER = 29249359;
  const codeToMarket = {
    '+90': 301, '+971': 295, '+1': 303, '+44': 302, '+91': 296, '+886': 300,
    '+852': 305, '+880': 292, '+86': 294, '+65': 298, '+27': 299, '+92': 297, '+244': 291,
  };

  const codeKey  = (phoneCode || '').split('-')[0];
  const ownerId  = codeToOwner[codeKey] ?? DEFAULT_OWNER;
  const marketId = codeToMarket[codeKey] ?? null;

  const fullName  = `${firstName} ${lastName || ''}`.trim();
  const fullPhone = `${phoneCode || ''} ${phoneNumber}`.trim();
  const prop = property || {};
  const propLabel = [prop.title, prop.reference && `(Ref ${prop.reference})`].filter(Boolean).join(' ');

  try {
    if (!PIPEDRIVE_TOKEN) throw new Error('PIPEDRIVE_TOKEN not set');

    // 1 - Person
    const personRes = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${PIPEDRIVE_TOKEN}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fullName,
        email: [{ value: email, primary: true }],
        phone: [{ value: fullPhone, primary: true }],
        owner_id: ownerId,
      }),
    });
    const personData = await personRes.json();
    const personId = personData?.data?.id;
    if (!personId) throw new Error('Person creation failed: ' + JSON.stringify(personData));

    // 2 - Deal (title references the property)
    const dealTitle = propLabel ? `${fullName} - ${propLabel}` : `${fullName} - Real Estate Enquiry`;
    const dealRes = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${PIPEDRIVE_TOKEN}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: dealTitle,
        person_id: personId,
        pipeline_id: PIPELINE_ID,
        stage_id: STAGE_ID,
        user_id: ownerId,
        '216e52d1153fd4853583f5683a557caf61cc2614': 315,
        ...(marketId && { '468abeb93ff2e92ca6182eb5b2028faf545ae7ac': marketId }),
      }),
    });
    const dealData = await dealRes.json();
    const dealId = dealData?.data?.id;
    if (!dealId) throw new Error('Deal creation failed: ' + JSON.stringify(dealData));

    // 3 - Note with full context
    const noteLines = [
      'Source: Real Estate enquiry (website)',
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${fullPhone}`,
      prop.title ? `Property: ${prop.title}` : null,
      prop.reference ? `Reference: ${prop.reference}` : null,
      prop.price ? `Price: ${prop.price}` : null,
      prop.url ? `Listing: ${prop.url}` : null,
      message ? `\nMessage:\n${message}` : null,
    ].filter(Boolean).join('\n');

    await fetch(`https://api.pipedrive.com/v1/notes?api_token=${PIPEDRIVE_TOKEN}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteLines.replace(/\n/g, '<br>'), deal_id: dealId }),
    });

    // 4 - Optional email notification (only if Resend is configured)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const NOTIFY_TO = process.env.ENQUIRY_NOTIFY_EMAIL || 'geral@smithandadams.com';
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Smith & Adams Website <noreply@smithandadams.com>',
            to: [NOTIFY_TO],
            reply_to: email,
            subject: `New property enquiry: ${prop.title || fullName}`,
            html: `<h2>New Real Estate enquiry</h2><p>${noteLines.replace(/\n/g, '<br>')}</p>`,
          }),
        });
      } catch (mailErr) { console.error('[property-enquiry] email error:', mailErr.message); }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[property-enquiry] error:', err.message);
    return res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
}
