// Investor-guide lead magnet.
// Captures { name, email, consent } from the site pop-up, emails the requester
// a branded Smith & Adams email with the guide, notifies the team, and (best
// effort) files the lead in Pipedrive like the other website leads.
//
// Env: RESEND_API_KEY (required to send), ENQUIRY_NOTIFY_EMAIL (team inbox),
//      SITE_BASE_URL (optional, defaults to prod),
//      CRM_API_URL + CRM_API_KEY (own CRM ingestion, sa_live_… key),
//      CRM_ASSIGN_TO (agent email - all guide leads assigned there, e.g. Benjamin),
//      PIPEDRIVE_TOKEN (optional, legacy - remove once the CRM path is confirmed).

import { postCrmLead } from './_crm.js';

const GUIDE_PATH = '/smith-adams-investor-guide-portugal.pdf';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, consent, locale, attribution } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  if (!cleanName || !isEmail) return res.status(400).json({ error: 'Missing name or valid email' });
  if (!consent) return res.status(400).json({ error: 'Consent is required' });

  const BASE = (process.env.SITE_BASE_URL || 'https://www.smithandadams.com').replace(/\/$/, '');
  const guideUrl = BASE + GUIDE_PATH;
  const pt = String(locale || '').toLowerCase().startsWith('pt');

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_TO = process.env.ENQUIRY_NOTIFY_EMAIL || 'geral@smithandadams.com';

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

    // 1 - the branded guide email to the requester
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Smith & Adams <noreply@smithandadams.com>',
        to: [cleanEmail],
        reply_to: 'geral@smithandadams.com',
        subject: pt ? 'O seu guia: Porquê investir em Portugal?' : 'Your guide: Why invest in Portugal?',
        html: guideEmailHtml(cleanName, guideUrl, BASE, pt),
      }),
    });

    // 2 - internal notification (so the lead is captured immediately)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Smith & Adams Website <noreply@smithandadams.com>',
        to: [NOTIFY_TO],
        reply_to: cleanEmail,
        subject: `Investor guide download: ${cleanName}`,
        html: `<h2>Investor guide lead</h2><p><strong>Name:</strong> ${escapeHtml(cleanName)}<br>`
            + `<strong>Email:</strong> ${escapeHtml(cleanEmail)}<br>`
            + `<strong>Consent:</strong> yes<br><strong>Locale:</strong> ${pt ? 'PT' : 'EN'}</p>`,
      }),
    }).catch(e => console.error('[guide] notify error:', e.message));

    // 3 - best-effort Pipedrive (same destination as other website leads)
    const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_TOKEN;
    if (PIPEDRIVE_TOKEN) {
      try {
        const personRes = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${PIPEDRIVE_TOKEN}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName, email: [{ value: cleanEmail, primary: true }] }),
        });
        const personId = (await personRes.json())?.data?.id;
        if (personId) {
          const dealRes = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${PIPEDRIVE_TOKEN}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: `${cleanName} - Investor Guide download`, person_id: personId }),
          });
          const dealId = (await dealRes.json())?.data?.id;
          if (dealId) {
            await fetch(`https://api.pipedrive.com/v1/notes?api_token=${PIPEDRIVE_TOKEN}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `Source: Investor guide download (website)<br>Name: ${escapeHtml(cleanName)}<br>Email: ${escapeHtml(cleanEmail)}`,
                deal_id: dealId,
              }),
            });
          }
        }
      } catch (pdErr) { console.error('[guide] pipedrive error:', pdErr.message); }
    }

    // 4 - the own CRM (crm.smithandadams.com), via the shared helper so the
    //     marketing attribution (gclid / client_id / utm) forwarded by the
    //     pop-up is carried through for offline conversion import.
    await postCrmLead(req, {
      full_name: cleanName,
      email: cleanEmail,
      campaign_name: 'Investor Guide',
      notes: 'Investor guide download (website pop-up)',
      attribution,
    });

    return res.status(200).json({ success: true, guideUrl });
  } catch (err) {
    console.error('[guide] error:', err.message);
    return res.status(500).json({ error: 'Could not send the guide. Please try again.' });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Brand email. Email clients ignore Playfair, so the serif is Georgia; the
// navy, the plate and the evidence-first voice follow Brand Book Ed. 03.
function guideEmailHtml(name, guideUrl, base, pt) {
  const navy = '#11222D', paper = '#FDFCF9', ink = '#26333C', slate = '#6A7883', line = '#E4E1DA';
  const serif = "'Helvetica Neue', Helvetica, Arial, sans-serif";  // brand is grotesque; email clients lack Archivo
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const t = pt ? {
    pre: 'Portugal registou o maior crescimento de preços residenciais da UE em 2025. Aqui está o quadro completo.',
    eyebrow: 'GUIA DO INVESTIDOR · PORTUGAL',
    h: 'Portugal, nos números.',
    hi: `Obrigado, ${escapeHtml(name)}.`,
    p1: 'O seu guia do investidor está pronto. Explica porque é que Portugal registou o maior crescimento de preços residenciais da União Europeia em 2025 - e porque isso é a continuação de uma década de valorização estrutural, não um pico isolado.',
    p2: 'Lá dentro: os fundamentos do mercado, o que custa realmente uma compra e como decorre, e como ajudamos a transformar números fortes num bom investimento individual.',
    btn: 'Descarregar o guia (PDF)',
    talk: 'Prefere falar? Uma conversa, sem compromisso - marque uma consulta.',
    talkCta: 'Marcar consulta',
    foot: 'Recebeu este email porque pediu o nosso guia do investidor.',
  } : {
    pre: 'Portugal recorded the EU’s strongest residential price growth in 2025. Here’s the full picture.',
    eyebrow: 'INVESTOR GUIDE · PORTUGAL',
    h: 'Portugal, on the numbers.',
    hi: `Thank you, ${escapeHtml(name)}.`,
    p1: 'Your investor guide is ready. It sets out why Portugal recorded the strongest residential price growth in the European Union in 2025 - and why that is the continuation of a decade of structural appreciation, not a one-off spike.',
    p2: 'Inside: the market fundamentals, what a purchase actually costs and how it runs, and how we help turn strong headline numbers into a good individual investment.',
    btn: 'Download the guide (PDF)',
    talk: 'Prefer to talk? One conversation, no obligation - book a consultation.',
    talkCta: 'Book a consultation',
    foot: 'You received this because you requested our investor guide.',
  };
  const stats = [
    ['#1', pt ? 'Crescimento imobiliário na UE, 2025' : 'EU property growth, 2025'],
    ['+141%', pt ? 'Valorização a 15 anos, 2010-2025' : '15-year appreciation, 2010-2025'],
    ['8.29%', pt ? 'Média Lisboa 10 anos p.a.' : 'Lisbon 10-yr average p.a.'],
  ];
  return `<!doctype html><html><body style="margin:0;background:${paper};font-family:${sans};color:${ink};">
  <span style="display:none;opacity:0;color:${paper};">${t.pre}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper};"><tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid ${line};">
      <tr><td style="background:${navy};padding:26px 32px;">
        <table role="presentation" width="100%"><tr>
          <td style="font-family:${serif};color:#fff;font-size:19px;letter-spacing:.08em;">SMITH &amp; ADAMS</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:36px 32px 8px;">
        <div style="font-family:${serif};font-style:italic;color:${slate};font-size:15px;margin-bottom:6px;">${t.h}</div>
        <h1 style="font-family:${serif};color:${navy};font-size:30px;font-weight:normal;line-height:1.15;margin:0 0 20px;">Why invest in Portugal?</h1>
        <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">${t.hi}</p>
        <p style="font-size:15px;line-height:1.75;color:${ink};margin:0 0 14px;">${t.p1}</p>
        <p style="font-size:15px;line-height:1.75;color:${ink};margin:0 0 26px;">${t.p2}</p>
        <table role="presentation"><tr><td>
          <a href="${guideUrl}" style="display:inline-block;background:${navy};color:#fff;font-family:${sans};font-weight:600;font-size:15px;text-decoration:none;padding:15px 30px;">${t.btn}</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:26px 32px 4px;">
        <table role="presentation" width="100%" style="border-top:1px solid ${line};border-bottom:1px solid ${line};"><tr>
          ${stats.map(s => `<td style="padding:18px 6px;vertical-align:top;"><div style="font-family:${serif};color:${navy};font-size:22px;">${s[0]}</div><div style="font-family:${sans};color:${slate};font-size:11px;line-height:1.4;margin-top:4px;">${s[1]}</div></td>`).join('')}
        </tr></table>
        <div style="font-family:${sans};color:${slate};font-size:11px;margin-top:8px;">${pt ? 'Fontes: INE · Idealista, Dez. 2025. Valores indicativos.' : 'Sources: INE · Idealista, December 2025. Figures indicative.'}</div>
      </td></tr>
      <tr><td style="padding:22px 32px 34px;">
        <p style="font-size:14px;line-height:1.7;color:${ink};margin:0 0 8px;">${t.talk}</p>
        <a href="${base}/contact.html" style="font-family:${sans};color:${navy};font-weight:600;font-size:14px;text-decoration:underline;">${t.talkCta} →</a>
      </td></tr>
      <tr><td style="background:${navy};padding:22px 32px;">
        <div style="font-family:${sans};color:rgba(255,255,255,.85);font-size:13px;">geral@smithandadams.com&nbsp;&nbsp;·&nbsp;&nbsp;+351 938 227 348&nbsp;&nbsp;·&nbsp;&nbsp;smithandadams.com</div>
        <div style="font-family:${sans};color:rgba(255,255,255,.45);font-size:11px;margin-top:10px;">${t.foot}</div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
