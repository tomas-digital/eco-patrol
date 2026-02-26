/* EcoPatrol main JS
   - mobile nav toggle
   - smooth anchor focus helpers
   - volunteer email save (localStorage)
   - quick report modal (index)
   - report page save/list/delete (localStorage)
   - calendar filter (index)
*/

(function () {
  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LS = {
    volunteers: "ecopatrol_volunteers",
    reports: "ecopatrol_reports",
  };

  function isValidEmail(email) {
    // simple, school-level validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ---------- Mobile Nav ----------
  const navToggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // close nav when clicking a link (mobile)
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---------- Volunteer Form (index) ----------
  const volunteerForm = $("[data-volunteer-form]");
  const toast = $("[data-toast]");
  if (volunteerForm) {
    volunteerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = new FormData(volunteerForm).get("email")?.toString().trim() || "";

      if (!isValidEmail(email)) {
        if (toast) toast.textContent = "Внеси валиден email.";
        return;
      }

      const list = loadJSON(LS.volunteers, []);
      if (!list.includes(email)) list.push(email);
      saveJSON(LS.volunteers, list);

      volunteerForm.reset();
      if (toast) toast.textContent = "Фала! Ќе те контактираме за следна еко акција. ✅";
      setTimeout(() => { if (toast) toast.textContent = ""; }, 3500);
    });
  }

  // ---------- Calendar filter (index) ----------
  const calList = $("[data-calendar-list]");
  const calButtons = $$("[data-filter]");
  if (calList && calButtons.length) {
    calButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const season = btn.getAttribute("data-filter");
        const items = $$("li", calList);

        items.forEach((li) => {
          const s = li.getAttribute("data-season");
          li.style.display = (season === "all" || s === season) ? "" : "none";
        });
      });
    });
  }

  // ---------- Quick Report Modal (index) ----------
  const modal = $("[data-modal]");
  const modalCloseEls = $$("[data-modal-close]");
  const quickReportForm = $("[data-quick-report-form]");
  const quickMsg = $("[data-form-msg]");

  function openModal(type) {
    if (!modal || !quickReportForm) return;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    quickReportForm.type.value = type || "";
    quickReportForm.location.focus();
    if (quickMsg) quickMsg.textContent = "";
    if (quickMsg) quickMsg.className = "form-msg";
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // open modal when clicking category cards (only on index)
  const categoryButtons = $$("[data-report-type]");
  if (categoryButtons.length && modal) {
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.getAttribute("data-report-type")));
    });
  }

  if (modalCloseEls.length) {
    modalCloseEls.forEach((el) => el.addEventListener("click", closeModal));
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.getAttribute("aria-hidden") === "false") closeModal();
  });

  if (quickReportForm) {
    quickReportForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fd = new FormData(quickReportForm);
      const payload = {
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: fd.get("type")?.toString() || "",
        location: fd.get("location")?.toString().trim() || "",
        details: fd.get("details")?.toString().trim() || "",
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
      };

      if (!payload.location || !payload.details) {
        if (quickMsg) {
          quickMsg.textContent = "Пополнете локација и опис.";
          quickMsg.classList.add("err");
        }
        return;
      }

      const reports = loadJSON(LS.reports, []);
      reports.unshift(payload);
      saveJSON(LS.reports, reports);

      if (quickMsg) {
        quickMsg.textContent = "Пријавата е зачувана! ✅ (локално)";
        quickMsg.classList.add("ok");
      }
      quickReportForm.reset();
      quickReportForm.type.value = payload.type;

      setTimeout(closeModal, 900);
    });
  }

  // ---------- Report Page (report.html) ----------
  const reportForm = $("[data-report-form]");
  const reportList = $("[data-report-list]");
  const reportMsg = $("[data-form-msg]");
  const clearBtn = $("[data-clear-reports]");

  function renderReports() {
    if (!reportList) return;
    const reports = loadJSON(LS.reports, []);
    if (!reports.length) {
      reportList.innerHTML = `<div class="muted">Нема зачувани пријави. Направи прва пријава. 🙂</div>`;
      return;
    }

    reportList.innerHTML = reports.map(r => `
      <div class="report-item" data-id="${r.id}">
        <div class="report-top">
          <div class="report-type">${escapeHtml(r.type)}</div>
          <div class="report-date">${escapeHtml(r.date || "")}</div>
        </div>
        <div class="report-loc">📍 ${escapeHtml(r.location)}</div>
        <div class="muted">${escapeHtml(r.details)}</div>
        <div class="report-actions">
          <button type="button" data-delete>Избриши</button>
        </div>
      </div>
    `).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  if (reportList) {
    renderReports();

    reportList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete]");
      if (!btn) return;
      const item = e.target.closest("[data-id]");
      const id = item?.getAttribute("data-id");
      if (!id) return;

      const reports = loadJSON(LS.reports, []).filter(r => r.id !== id);
      saveJSON(LS.reports, reports);
      renderReports();
    });
  }

  if (reportForm) {
    // default date = today
    const dateInput = reportForm.querySelector('input[name="date"]');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

    reportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!reportMsg) return;

      const fd = new FormData(reportForm);
      const payload = {
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: fd.get("type")?.toString() || "",
        location: fd.get("location")?.toString().trim() || "",
        details: fd.get("details")?.toString().trim() || "",
        date: fd.get("date")?.toString() || "",
        createdAt: Date.now(),
      };

      if (!payload.type || !payload.location || !payload.details || !payload.date) {
        reportMsg.textContent = "Пополнете ги сите полиња.";
        reportMsg.className = "form-msg err";
        return;
      }

      const reports = loadJSON(LS.reports, []);
      reports.unshift(payload);
      saveJSON(LS.reports, reports);

      reportForm.reset();
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

      reportMsg.textContent = "Пријавата е зачувана! ✅ (локално)";
      reportMsg.className = "form-msg ok";

      if (reportList) renderReports();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      saveJSON(LS.reports, []);
      if (reportList) renderReports();
    });
  }
})();
