/* H&P Landscaping — landing site behavior */
(function () {
  "use strict";

  // Current year in footer
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Quote form handling
  var form = document.getElementById("quote-form");
  var status = document.getElementById("form-status");
  if (!form) return;

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg;
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      service: form.service.value,
      message: form.message.value.trim(),
      source: "hp-landscaping-site",
      submitted_at: new Date().toISOString()
    };

    if (!data.name) return setStatus("Please enter your name.", "err");
    if (!isValidEmail(data.email)) return setStatus("Please enter a valid email.", "err");

    var endpoint = form.getAttribute("data-endpoint");
    var btn = form.querySelector('button[type="submit"]');

    // Demo mode: no endpoint configured yet.
    if (!endpoint) {
      setStatus("Thanks, " + data.name + "! This is a demo form — set data-endpoint on #quote-form (e.g. your GoHighLevel webhook) to start receiving leads.", "ok");
      form.reset();
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    setStatus("Sending your request…");

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        setStatus("Thanks, " + data.name + "! We'll be in touch within one business day.", "ok");
        form.reset();
      })
      .catch(function () {
        setStatus("Something went wrong sending your request. Please call us or try again.", "err");
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Request my free quote"; }
      });
  });
})();
