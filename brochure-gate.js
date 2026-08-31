/* Smith & Adams - brochure gate.
 * A [data-brochure] trigger opens a short lead form (name + email, optional
 * phone). On submit the lead goes to the CRM via /api/contact (source
 * brochure-<type>), fires the GA4 + Ads conversion via saTrackLead, then the
 * PDF is delivered. Progressive: if JS fails, the trigger can still be a link.
 */
(function () {
  "use strict";
  var pending = null; // { href, type, title }
  var modal, form, msg, btn;

  function t(pt, en) {
    var isPt = (location.pathname || "").replace(/\/+$/, "").indexOf("/pt") === 0;
    return isPt ? pt : en;
  }

  function build() {
    modal = document.createElement("div");
    modal.id = "sa-bg";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML =
      '<div class="sa-bg__backdrop" data-close></div>' +
      '<div class="sa-bg__card" role="dialog" aria-modal="true" aria-label="' + t("Pedir guia", "Request guide") + '">' +
        '<button type="button" class="sa-bg__x" data-close aria-label="' + t("Fechar", "Close") + '">&times;</button>' +
        '<p class="sa-bg__eyebrow"></p>' +
        '<h3 class="sa-bg__title">' + t("Receba o guia", "Get the guide") + '</h3>' +
        '<p class="sa-bg__sub">' + t("Deixe os seus dados e enviamos-lhe o guia.", "Leave your details and we'll send you the guide.") + '</p>' +
        '<form class="sa-bg__form" novalidate>' +
          '<label>' + t("Nome", "First name") + '<input name="firstName" type="text" autocomplete="given-name" required></label>' +
          '<label>' + t("Email", "Email") + '<input name="email" type="email" autocomplete="email" required></label>' +
          '<label>' + t("Telefone (opcional)", "Phone (optional)") + '<input name="phone" type="tel" autocomplete="tel"></label>' +
          '<p class="sa-bg__msg" role="status" aria-live="polite"></p>' +
          '<button type="submit" class="sa-bg__submit">' + t("Receber guia", "Get the guide") + '</button>' +
          '<p class="sa-bg__fine">' + t("Ao enviar, concorda em ser contactado sobre este guia.", "By submitting, you agree to be contacted about this guide.") + '</p>' +
        '</form>' +
      '</div>';
    var css =
      '#sa-bg{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;font-family:"Geoform","Helvetica Neue",Helvetica,Arial,sans-serif;}' +
      '#sa-bg.open{display:flex;}' +
      '#sa-bg .sa-bg__backdrop{position:absolute;inset:0;background:rgba(17,34,45,.55);backdrop-filter:blur(2px);}' +
      '#sa-bg .sa-bg__card{position:relative;background:#fff;max-width:420px;width:100%;border-radius:6px;padding:30px 28px 26px;box-shadow:0 30px 70px rgba(17,34,45,.35);}' +
      '#sa-bg .sa-bg__x{position:absolute;top:12px;right:14px;background:none;border:0;font-size:26px;line-height:1;color:#6A7883;cursor:pointer;}' +
      '#sa-bg .sa-bg__eyebrow{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#B58B45;font-weight:600;margin:0 0 8px;}' +
      '#sa-bg .sa-bg__title{font-family:"Geoform","Helvetica Neue",Arial,sans-serif;font-weight:500;font-size:26px;color:#11222D;margin:0 0 8px;}' +
      '#sa-bg .sa-bg__sub{font-size:14px;line-height:1.5;color:#6A7883;margin:0 0 20px;}' +
      '#sa-bg .sa-bg__form{display:flex;flex-direction:column;gap:13px;}' +
      '#sa-bg label{display:flex;flex-direction:column;gap:6px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#6A7883;font-weight:600;}' +
      '#sa-bg input{font-family:inherit;font-size:15px;color:#11222D;padding:11px 12px;border:1px solid #D8D2C4;border-radius:3px;background:#fff;}' +
      '#sa-bg input:focus{outline:none;border-color:#B58B45;}' +
      '#sa-bg .sa-bg__submit{margin-top:4px;background:#11222D;color:#fff;border:1px solid #11222D;border-radius:999px;padding:13px 22px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s,border-color .2s;}' +
      '#sa-bg .sa-bg__submit:hover{background:#B58B45;border-color:#B58B45;}' +
      '#sa-bg .sa-bg__submit[disabled]{opacity:.6;cursor:default;}' +
      '#sa-bg .sa-bg__fine{font-size:11px;color:#9a948a;margin:2px 0 0;line-height:1.45;}' +
      '#sa-bg .sa-bg__msg{display:none;font-size:13px;margin:0;padding:10px 12px;border-radius:3px;}' +
      '#sa-bg .sa-bg__msg.err{display:block;background:#f7ecec;border:1px solid #e2c9c9;color:#8a3b3b;}' +
      '#sa-bg .sa-bg__msg.ok{display:block;background:#f3efe6;border:1px solid #D6C29A;color:#11222D;}';
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    form = modal.querySelector(".sa-bg__form");
    msg = modal.querySelector(".sa-bg__msg");
    btn = modal.querySelector(".sa-bg__submit");
    modal.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
    form.addEventListener("submit", submit);
  }

  function open(target) {
    if (!modal) build();
    pending = target;
    modal.querySelector(".sa-bg__eyebrow").textContent = target.title || "";
    msg.className = "sa-bg__msg"; msg.textContent = "";
    form.reset(); btn.disabled = false;
    btn.textContent = t("Receber guia", "Get the guide");
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
    var f = form.querySelector('input[name="firstName"]'); if (f) setTimeout(function () { f.focus(); }, 40);
  }
  function close() { if (modal) { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); } }

  function deliver(href) { try { window.open(href, "_blank", "noopener"); } catch (e) { location.href = href; } }

  function submit(e) {
    e.preventDefault();
    if (!pending) return;
    var firstName = form.firstName.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    if (!firstName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.className = "sa-bg__msg err";
      msg.textContent = t("Indique o nome e um email v\u00e1lido.", "Please add your name and a valid email.");
      return;
    }
    btn.disabled = true; btn.textContent = t("A enviar\u2026", "Sending\u2026");
    var attribution = (typeof window.saLeadContext === "function") ? window.saLeadContext() : undefined;
    var body = {
      firstName: firstName, email: email,
      phoneCode: "", phoneNumber: phone,
      interest: pending.type === "d2" ? "d2" : "golden-visa",
      source: "brochure-" + pending.type,
      message: "Brochure request: " + (pending.title || pending.type),
      attribution: attribution
    };
    fetch("/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (r) { return r.ok ? r.json().catch(function () { return {}; }) : Promise.reject(r); })
      .then(function () {
        try { if (window.saTrackLead) window.saTrackLead("brochure", { lead_detail: pending.type }); } catch (e2) {}
        msg.className = "sa-bg__msg ok";
        msg.innerHTML = t("Obrigado. O seu guia est\u00e1 a abrir\u2026", "Thank you. Your guide is opening\u2026") +
          ' <a href="' + pending.href + '" target="_blank" rel="noopener" style="color:#11222D;font-weight:600;">' + t("Descarregar", "Download") + "</a>";
        btn.textContent = t("Enviado", "Sent");
        deliver(pending.href);
        setTimeout(close, 2600);
      })
      .catch(function () {
        // Never trap the visitor: acknowledge + still deliver the guide.
        try { if (window.saTrackLead) window.saTrackLead("brochure", { lead_detail: pending.type }); } catch (e3) {}
        msg.className = "sa-bg__msg ok";
        msg.innerHTML = t("Obrigado. A abrir o seu guia\u2026", "Thank you. Opening your guide\u2026") +
          ' <a href="' + pending.href + '" target="_blank" rel="noopener" style="color:#11222D;font-weight:600;">' + t("Descarregar", "Download") + "</a>";
        deliver(pending.href);
        setTimeout(close, 2600);
      });
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-brochure]") : null;
    if (!el) return;
    e.preventDefault();
    open({
      href: el.getAttribute("data-brochure"),
      type: el.getAttribute("data-brochure-type") || "invest",
      title: el.getAttribute("data-brochure-title") || ""
    });
  });
})();
