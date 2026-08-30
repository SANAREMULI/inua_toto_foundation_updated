// Inua Toto Foundation — site behavior

const SUPABASE_URL = "https://uttdccgiecreuvkfhhkl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGRjY2dpZWNyZXV2a2ZoaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNDIxNjgsImV4cCI6MjEwMzYxODE2OH0.honQAieJIIsRRYhM-4MrEzb85exdgTgawVYtUm_yVMg";

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
}

async function supabaseSelectOne(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json().catch(() => []);
  return rows && rows[0] ? rows[0] : null;
}

// ---------- Mobile nav ----------
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");
if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ---------- Animated counter (0 -> target) ----------
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const suffix = el.dataset.suffix || "";
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // ease-out for a natural finish
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = value.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterEls = document.querySelectorAll("[data-counter]");
if (counterEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  counterEls.forEach((el) => observer.observe(el));
}

// ---------- Live payment settings from Supabase ----------
(async function loadPaymentSettings() {
  const row = await supabaseSelectOne("payment_settings").catch(() => null);
  if (!row) return; // keep the static fallback already in the HTML
  const map = {
    mpesa_paybill: row.mpesa_paybill,
    mpesa_account: row.mpesa_account,
    mpesa_account_name: row.mpesa_account_name,
    bank_name: row.bank_name,
    bank_account: row.bank_account,
    bank_branch: row.bank_branch,
  };
  Object.entries(map).forEach(([field, value]) => {
    if (!value) return;
    document.querySelectorAll(`[data-field="${field}"]`).forEach((el) => {
      el.textContent = value;
    });
  });
})();

// ---------- Form helpers ----------
function setStatus(el, message, kind) {
  if (!el) return;
  el.textContent = message;
  el.className = "form-status" + (kind ? " " + kind : "");
}

function wireForm(formId, statusId, table, buildRow, resetOnSuccess = true) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const row = buildRow(data);

    if (submitBtn) submitBtn.disabled = true;
    setStatus(status, "Sending…");

    try {
      await supabaseInsert(table, row);
      setStatus(status, "Thank you — we've received this.", "success");
      if (resetOnSuccess) form.reset();
    } catch (err) {
      console.error(err);
      setStatus(status, "Something went wrong. Please try again or reach us directly.", "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

wireForm("grantForm", "grantStatus", "grant_notifications", (data) => ({
  full_name: data.get("fullName"),
  amount_ksh: Number(data.get("amount")) || null,
}));

wireForm("partnerForm", "partnerStatus", "partnership_requests", (data) => ({
  institution_name: data.get("institution"),
  support_needed: data.get("support"),
}));

wireForm("contactForm", "contactStatus", "contact_messages", (data) => ({
  full_name: data.get("fullName"),
  email: data.get("email"),
  message: data.get("message"),
}));

wireForm("newsletterForm", "newsletterStatus", "newsletter_subscribers", (data) => ({
  email: data.get("email"),
}));
