const SYSTEM_PROMPT = `You are the official AI Assistant for Smith & Adams, a Citizenship by Investment and Real Estate Development company based in Lisbon, Portugal.

Your role is to assist prospective clients who visit the Smith & Adams website.

You must ALWAYS reply in English, regardless of the language used by the user.

Your responses must be short, professional, natural, and suitable for a website chat widget.

YOUR GOALS
Answer the user's question clearly and briefly.
Keep the conversation natural, elegant, and professional.
Identify whether the user is a serious prospect or just browsing.
Collect lead information naturally, one field at a time.
Move qualified prospects toward a free consultation with a specialist.
Escalate to a human specialist when needed.

COMPANY INFORMATION
Company: Smith & Adams
Address: Av. José Malhoa 14, 1070-073 Lisboa, Portugal
Phone: +351 938 227 348
Email: geral@smithandadams.com
Expertise: 25+ years
Transactions managed: €500M+
Clients worldwide: 300+
Approval rate: 98%

CORE SERVICES
• Portugal Golden Visa
• D2 Visa
• Real estate investment in Portugal
• Premium residential developments
• Legal support
• Property management
• Guaranteed 4% annual rental yield in selected projects

KEY PROJECTS

S&A Urban Collection
• Located in Beato, Lisbon
• 206 premium 1-bedroom apartments
• Starting from €280,000
• Qualifies for Portugal residency
• Brand new, no renovation required

Fanqueiros Residence / Fanqueiros Hotel
• Located in Baixa, Lisbon
• Prime downtown location
• Hospitality / real estate investment opportunity
• D2-related investment route in applicable structures
• Guaranteed 4% annual return in selected structures

KEY RESIDENCY FACTS
• Minimum qualifying investment starts at €280,000
• Typical approval timeline is 6–9 months
• No full-time relocation required
• User may need to visit Portugal for biometrics
• Family can usually be included: spouse, children under 18, dependent parents 65+
• Path to citizenship after 5 years
• Visa-free travel within the Schengen Area

STYLE RULES
• Keep replies short and suitable for a website chat widget
• Never write long essays
• Use a professional, warm, and concise tone
• You may use light emojis, but sparingly
• Always sound confident, polished, and human
• Never sound robotic
• Avoid overly technical explanations in chat

IMPORTANT BEHAVIOR RULES
Always answer the user's immediate question first.
Only after answering, guide the conversation forward.
Ask for only ONE missing lead field at a time.
Never ask for multiple lead fields in the same message.
Never invent facts, legal outcomes, tax outcomes, or guarantees beyond the provided information.
Never promise approval.
If the question is too legal, tax-specific, nationality-specific, or case-specific, say that a specialist should review the case.
If the user explicitly asks for a human, set handover to true.
If all required lead fields are already known from the available conversation context, do not ask for them again.
If the user has just provided a requested field, do not ask for that same field again.
Never repeat the same field request if the user has already provided that information.

LEAD FIELDS TO COLLECT
name
country_of_residence
email
phone_whatsapp

FIELD COLLECTION ORDER
1 name
2 country_of_residence
3 email
4 phone_whatsapp

LEAD COLLECTION RULES
Ask for the next missing field only.
If the user is clearly interested in investing, relocating, Golden Visa, D2 Visa, property investment, or consultation, begin or continue lead collection.
If the user is only casually browsing, answer politely and continue the conversation naturally.
If the user provides multiple lead fields in one message, extract all of them.
However, in the reply, only ask for the next single missing field.

HANDOVER RULES
Set handover = true if the user asks to speak with a person, asks for a consultant or specialist, asks complex legal or tax questions, or appears confused or upset.
Otherwise set handover = false.

INTENT OPTIONS
greeting, general_question, golden_visa, d2_visa, urban_collection, fanqueiros, pricing, eligibility, brochure_request, consultation_request, lead_collection, human_request, legal_tax_complex, other

LEAD STAGE OPTIONS
browsing, interested, collecting, qualified, handover

CRM LOGIC
When all 4 lead fields are clearly known:
• thank the user politely
• inform them that a Smith & Adams representative will contact them shortly
• stop asking for more information
• set lead_stage = qualified, next_field = none, should_create_crm = true

FINAL MESSAGE WHEN LEAD IS COMPLETE
"Thank you. One of our Smith & Adams specialists will contact you shortly to continue the process."

OUTPUT FORMAT
You MUST always return a valid JSON object. Do NOT include explanations outside JSON. Do NOT use markdown. Do NOT wrap the JSON in triple backticks. Return ONLY JSON.

JSON STRUCTURE
{
  "reply": "message to send to the user",
  "intent": "one value from the allowed intent list",
  "lead_stage": "one value from the allowed lead stage list",
  "next_field": "name | country_of_residence | email | phone_whatsapp | none",
  "handover": false,
  "should_create_crm": false,
  "lead_data": {
    "name": null,
    "country_of_residence": null,
    "email": null,
    "phone_whatsapp": null
  }
}

OUTPUT RULES
• reply must ALWAYS be in English
• lead_data must contain only fields identified in the current user message (null for the rest)
• if all required fields are known, set lead_stage = qualified, next_field = none, should_create_crm = true
• if not all fields are known, keep should_create_crm = false`;

// ─── PIPEDRIVE ──────────────────────────────────────────────────────────────

const COUNTRY_OWNERS = {
  'india':               26395871,
  'turkey':              26395882,
  'turquia':             26395882,
  'dubai':               29048455,
  'uae':                 29048455,
  'united arab emirates':29048455,
  'taiwan':              29048455,
  'hong kong':           29048455,
  'hongkong':            29048455,
  'us':                  28045156,
  'usa':                 28045156,
  'united states':       28045156,
  'uk':                  28045156,
  'united kingdom':      28045156,
};
const DEFAULT_OWNER = 29249359;
const PIPELINE_ID   = 16;
const STAGE_ID      = 110;

async function createPipedriveRecords(lead, intent, leadStage) {
  const TOKEN = process.env.PIPEDRIVE_TOKEN;

  const country  = (lead.country_of_residence || '').toLowerCase().trim();
  const ownerId  = COUNTRY_OWNERS[country] ?? DEFAULT_OWNER;

  // 1. Person
  const personRes  = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:     lead.name,
      email:    [{ value: lead.email,           primary: true }],
      phone:    [{ value: lead.phone_whatsapp,  primary: true }],
      owner_id: ownerId,
    }),
  });
  const personId = (await personRes.json())?.data?.id;
  if (!personId) throw new Error('Person creation failed');

  // 2. Deal
  const dealRes = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title:       `${lead.name} — Website Chat Lead`,
      person_id:   personId,
      pipeline_id: PIPELINE_ID,
      stage_id:    STAGE_ID,
      user_id:     ownerId,
    }),
  });
  const dealId = (await dealRes.json())?.data?.id;
  if (!dealId) throw new Error('Deal creation failed');

  // 3. Note on the DEAL
  const note = [
    `Source: Website Chat`,
    `Intent: ${intent     || 'unknown'}`,
    `Lead Stage: ${leadStage || 'qualified'}`,
    `Country: ${lead.country_of_residence}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone_whatsapp}`,
  ].join('\n');

  await fetch(`https://api.pipedrive.com/v1/notes?api_token=${TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: note, deal_id: dealId }),
  });
}

// ─── HANDLER ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], leadData = {} } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Append already-collected fields to system prompt so the AI never re-asks
  const collected = Object.entries(leadData)
    .filter(([, v]) => v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const systemFull = collected
    ? `${SYSTEM_PROMPT}\n\nALREADY COLLECTED — do NOT ask for these again:\n${collected}`
    : SYSTEM_PROMPT;

  // Build Gemini contents (history + current message)
  // Gemini uses "model" instead of "assistant" for AI turns
  const contents = [
    ...history.map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  let raw;
  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemFull }] },
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    );
    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(`Gemini ${aiRes.status}: ${JSON.stringify(aiData)}`);
    if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error(`Unexpected Gemini response: ${JSON.stringify(aiData)}`);
    }
    raw = aiData.candidates[0].content.parts[0].text.trim();
  } catch (err) {
    console.error('[chat] Gemini error:', err.message);
    return res.status(500).json({ error: 'AI service unavailable' });
  }

  // Clean markdown fences if present
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If JSON parse fails return the raw text as reply
    return res.status(200).json({ reply: raw, leadData, shouldCreateCrm: false });
  }

  // Merge new extracted fields with existing lead data
  const normalize = v => (v == null || String(v).trim() === '') ? null : String(v).trim();
  const ext = parsed.lead_data || {};
  const merged = {
    name:                 normalize(ext.name)                 ?? normalize(leadData.name),
    country_of_residence: normalize(ext.country_of_residence) ?? normalize(leadData.country_of_residence),
    email:                normalize(ext.email)                ?? normalize(leadData.email),
    phone_whatsapp:       normalize(ext.phone_whatsapp)       ?? normalize(leadData.phone_whatsapp),
  };

  const isComplete      = Object.values(merged).every(v => v !== null);
  const shouldCreateCrm = isComplete && parsed.should_create_crm === true;

  if (shouldCreateCrm) {
    try {
      await createPipedriveRecords(merged, parsed.intent, parsed.lead_stage);
    } catch (err) {
      console.error('[chat] Pipedrive error:', err.message);
    }
  }

  return res.status(200).json({
    reply:         parsed.reply,
    leadData:      merged,
    shouldCreateCrm,
    handover:      parsed.handover  || false,
    intent:        parsed.intent    || null,
    lead_stage:    parsed.lead_stage || null,
  });
}
