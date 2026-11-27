/* ==========================================================================
   SavorSpot — Reservations & Shared Cart Sync (js/reservations.js)
   ========================================================================== */

(() => {
  "use strict";

  const STORAGE_KEYS = {
    CART: "savorCart",
    RESERVATIONS: "savorReservations"
  };

  let toastTimer = null;

  function safeReadStorage(key, fallback = []) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function safeWriteStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message, variant = "default") {
    const toast = document.getElementById("savorToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("is-error", "is-visible");
    if (variant === "error") {
      toast.classList.add("is-error");
    }
    // Force reflow so consecutive toasts animate cleanly
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3400);
  }

  function formatPkr(amount) {
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString("en-PK")}`;
  }

  function getTodayIsoDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-").map(Number);
    if (!year || !month || !day) return isoDate;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  /* --------------------------------------------------------------------------
     Mobile Navigation Toggle
     -------------------------------------------------------------------------- */
  function initMobileNav() {
    const navToggle = document.getElementById("navToggle");
    const siteNav = document.getElementById("siteNav");
    if (!navToggle || !siteNav) return;

    navToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* --------------------------------------------------------------------------
     Shared #savorCart Drawer & localStorage("savorCart") Sync
     -------------------------------------------------------------------------- */
  function normalizeCartItem(item, index) {
    const qty = Number(item.quantity ?? item.qty ?? item.count ?? 1);
    const price = Number(item.price ?? item.unitPrice ?? 0);
    return {
      ...item,
      id: item.id ?? `item-${index}`,
      name: item.name || item.title || "SavorSpot Selection",
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1
    };
  }

  function getCart() {
    return safeReadStorage(STORAGE_KEYS.CART, []).map(normalizeCartItem);
  }

  function saveCart(cart) {
    safeWriteStorage(STORAGE_KEYS.CART, cart);
    renderCart();
  }

  function renderCart() {
    const cart = getCart();
    const countEl = document.getElementById("cartCount");
    const badgeEls = document.querySelectorAll("[data-cart-count]");
    const container = document.getElementById("cartItemsContainer");
    const subtotalEl = document.getElementById("cartSubtotal");
    const clearBtn = document.getElementById("clearCartBtn");

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (countEl) countEl.textContent = String(totalQty);
    badgeEls.forEach((el) => {
      el.textContent = String(totalQty);
    });
    if (subtotalEl) subtotalEl.textContent = formatPkr(subtotal);
    if (clearBtn) clearBtn.disabled = cart.length === 0;

    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <p>Your cart is currently empty.</p>
          <p>Explore our espresso bar, wood-fired mains, or curated dining deals to start an order.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = cart
      .map(
        (item, index) => `
          <div class="cart-item" data-cart-index="${index}">
            <div>
              <p class="cart-item-title">${escapeHtml(item.name)}</p>
              <p class="cart-item-price">${formatPkr(item.price)} &times; ${item.quantity}</p>
            </div>
            <div class="cart-item-controls">
              <button type="button" class="qty-btn" data-cart-action="decrease" data-index="${index}" aria-label="Decrease quantity of ${escapeHtml(item.name)}">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button type="button" class="qty-btn" data-cart-action="increase" data-index="${index}" aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
              <button type="button" class="cart-remove-btn" data-cart-action="remove" data-index="${index}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button>
            </div>
          </div>
        `
      )
      .join("");
  }

  function initCartDrawer() {
    const cartDrawer = document.getElementById("savorCart");
    const cartToggle = document.getElementById("cartToggle");
    const closeCartBtn = document.getElementById("closeCartBtn");
    const backdrop = document.getElementById("cartBackdrop");
    const itemsContainer = document.getElementById("cartItemsContainer");
    const clearCartBtn = document.getElementById("clearCartBtn");

    if (!cartDrawer || !cartToggle) return;

    const openDrawer = () => {
      renderCart();
      cartDrawer.classList.add("is-open");
      cartDrawer.setAttribute("aria-hidden", "false");
      cartToggle.setAttribute("aria-expanded", "true");
      if (backdrop) backdrop.hidden = false;
      cartDrawer.focus();
    };

    const closeDrawer = () => {
      cartDrawer.classList.remove("is-open");
      cartDrawer.setAttribute("aria-hidden", "true");
      cartToggle.setAttribute("aria-expanded", "false");
      if (backdrop) backdrop.hidden = true;
      cartToggle.focus();
    };

    cartToggle.addEventListener("click", openDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && cartDrawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });

    if (itemsContainer) {
      itemsContainer.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-cart-action]");
        if (!btn) return;
        const index = Number(btn.dataset.index);
        const action = btn.dataset.cartAction;
        const cart = getCart();
        if (!cart[index]) return;

        if (action === "increase") {
          cart[index].quantity += 1;
          saveCart(cart);
          showToast(`Updated ${cart[index].name} quantity.`);
        } else if (action === "decrease") {
          if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
            saveCart(cart);
            showToast(`Updated ${cart[index].name} quantity.`);
          } else {
            const removed = cart.splice(index, 1)[0];
            saveCart(cart);
            showToast(`Removed ${removed.name} from cart.`);
          }
        } else if (action === "remove") {
          const removed = cart.splice(index, 1)[0];
          saveCart(cart);
          showToast(`Removed ${removed.name} from cart.`);
        }
      });
    }

    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", () => {
        saveCart([]);
        showToast("Order cart cleared.");
      });
    }

    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEYS.CART) {
        renderCart();
      } else if (event.key === STORAGE_KEYS.RESERVATIONS) {
        renderSavedReservations();
      }
    });

    renderCart();
  }

  /* --------------------------------------------------------------------------
     Reservations Form, Validation, Confirmation Card & localStorage
     -------------------------------------------------------------------------- */
  function generateBookingReference() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 6; i += 1) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SS-RES-${suffix}`;
  }

  function getSelectedZone(form) {
    const checked = form.querySelector('input[name="seatingZone"]:checked');
    return checked ? checked.value : "Main Dining Room";
  }

  function syncSeatingCardHighlight(zoneName) {
    document.querySelectorAll(".seating-card").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.zone === zoneName);
    });
  }

  function setFieldValidity(input, errorEl, message) {
    if (!input || !errorEl) return true;
    if (message) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      errorEl.textContent = message;
      return false;
    }
    input.classList.remove("is-invalid");
    if (String(input.value).trim() !== "") {
      input.classList.add("is-valid");
    } else {
      input.classList.remove("is-valid");
    }
    errorEl.textContent = "";
    return true;
  }

  function validateField(fieldName, elements) {
    const todayIso = getTodayIsoDate();

    switch (fieldName) {
      case "guestName": {
        const val = elements.guestName.value.trim();
        if (val.length < 2) {
          return setFieldValidity(elements.guestName, elements.guestNameError, "Please enter your full name (at least 2 characters).");
        }
        return setFieldValidity(elements.guestName, elements.guestNameError, "");
      }

      case "guestPhone": {
        const val = elements.guestPhone.value.trim();
        const digits = val.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15 || !/^[+\d\s()-]+$/.test(val)) {
          return setFieldValidity(elements.guestPhone, elements.guestPhoneError, "Enter a valid phone number (e.g. +92 300 5551234).");
        }
        return setFieldValidity(elements.guestPhone, elements.guestPhoneError, "");
      }

      case "guestEmail": {
        const val = elements.guestEmail.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailPattern.test(val)) {
          return setFieldValidity(elements.guestEmail, elements.guestEmailError, "Enter a valid email address for your booking pass.");
        }
        return setFieldValidity(elements.guestEmail, elements.guestEmailError, "");
      }

      case "partySize": {
        const val = Number(elements.partySize.value);
        if (!val || val < 1 || val > 16) {
          return setFieldValidity(elements.partySize, elements.partySizeError, "Please choose a party size between 1 and 16 guests.");
        }
        return setFieldValidity(elements.partySize, elements.partySizeError, "");
      }

      case "reservationDate": {
        const val = elements.reservationDate.value;
        if (!val) {
          return setFieldValidity(elements.reservationDate, elements.reservationDateError, "Please select a reservation date.");
        }
        if (val < todayIso) {
          return setFieldValidity(elements.reservationDate, elements.reservationDateError, "Reservation date cannot be in the past.");
        }
        return setFieldValidity(elements.reservationDate, elements.reservationDateError, "");
      }

      case "timeSlot": {
        if (!elements.timeSlot.value) {
          return setFieldValidity(elements.timeSlot, elements.timeSlotError, "Please select an available seating window.");
        }
        return setFieldValidity(elements.timeSlot, elements.timeSlotError, "");
      }

      default:
        return true;
    }
  }

  function renderSavedReservations() {
    const listEl = document.getElementById("savedReservationsList");
    const countBadge = document.getElementById("savedReservationsCount");
    if (!listEl) return;

    const reservations = safeReadStorage(STORAGE_KEYS.RESERVATIONS, []);
    if (countBadge) countBadge.textContent = String(reservations.length);

    if (reservations.length === 0) {
      listEl.innerHTML = '<p class="empty-saved-state">No confirmed reservations saved on this device yet.</p>';
      return;
    }

    listEl.innerHTML = reservations
      .map(
        (res) => `
          <div class="saved-item" data-ref="${escapeHtml(res.reference)}">
            <div class="saved-item-top">
              <span class="saved-item-ref">${escapeHtml(res.reference)}</span>
              <span class="saved-item-meta">${escapeHtml(res.partySize)} ${Number(res.partySize) === 1 ? "Guest" : "Guests"}</span>
            </div>
            <div class="saved-item-meta">
              <strong>${escapeHtml(res.guestName)}</strong> &middot; ${escapeHtml(res.seatingZone)}
            </div>
            <div class="saved-item-meta">
              ${escapeHtml(formatDisplayDate(res.date))} at ${escapeHtml(res.timeSlot)}
            </div>
            <div class="saved-item-actions">
              <button type="button" class="btn-remove-reservation" data-remove-ref="${escapeHtml(res.reference)}">
                Cancel Booking
              </button>
            </div>
          </div>
        `
      )
      .join("");
  }

  function initReservations() {
    const form = document.getElementById("reservationForm");
    if (!form) return;

    const elements = {
      guestName: document.getElementById("guestName"),
      guestNameError: document.getElementById("guestNameError"),
      guestPhone: document.getElementById("guestPhone"),
      guestPhoneError: document.getElementById("guestPhoneError"),
      guestEmail: document.getElementById("guestEmail"),
      guestEmailError: document.getElementById("guestEmailError"),
      partySize: document.getElementById("partySize"),
      partySizeError: document.getElementById("partySizeError"),
      reservationDate: document.getElementById("reservationDate"),
      reservationDateError: document.getElementById("reservationDateError"),
      timeSlot: document.getElementById("timeSlot"),
      timeSlotError: document.getElementById("timeSlotError"),
      seatingZoneError: document.getElementById("seatingZoneError"),
      reservationNotes: document.getElementById("reservationNotes"),
      notesCount: document.getElementById("notesCount")
    };

    const summary = {
      card: document.getElementById("confirmationCard"),
      title: document.getElementById("confirmationTitle"),
      status: document.getElementById("confirmationStatus"),
      reference: document.getElementById("bookingReference"),
      guest: document.getElementById("summaryGuest"),
      contact: document.getElementById("summaryContact"),
      dateTime: document.getElementById("summaryDateTime"),
      party: document.getElementById("summaryParty"),
      zone: document.getElementById("summaryZone"),
      notes: document.getElementById("summaryNotes"),
      actions: document.getElementById("confirmationActions"),
      copyRefBtn: document.getElementById("copyRefBtn"),
      printBtn: document.getElementById("printConfirmationBtn"),
      newBookingBtn: document.getElementById("newBookingBtn")
    };

    const todayIso = getTodayIsoDate();
    if (elements.reservationDate) {
      elements.reservationDate.min = todayIso;
      if (!elements.reservationDate.value) {
        elements.reservationDate.value = todayIso;
      }
    }

    let isConfirmedState = false;
    let lastConfirmedRef = "";

    const updatePreviewCard = () => {
      if (isConfirmedState) return;
      const name = elements.guestName.value.trim();
      const phone = elements.guestPhone.value.trim();
      const email = elements.guestEmail.value.trim();
      const date = elements.reservationDate.value;
      const time = elements.timeSlot.value;
      const party = elements.partySize.value;
      const zone = getSelectedZone(form);
      const notes = elements.reservationNotes.value.trim();

      summary.guest.textContent = name || "Not entered yet";

      if (phone && email) {
        summary.contact.textContent = `${phone} · ${email}`;
      } else if (phone || email) {
        summary.contact.textContent = phone || email;
      } else {
        summary.contact.textContent = "Phone & email pending";
      }

      if (date && time) {
        summary.dateTime.textContent = `${formatDisplayDate(date)} at ${time}`;
      } else if (date) {
        summary.dateTime.textContent = `${formatDisplayDate(date)} · Select time`;
      } else {
        summary.dateTime.textContent = "Select date & time slot";
      }

      summary.party.textContent = party ? `${party} ${Number(party) === 1 ? "Guest" : "Guests"}` : "Select guests";
      summary.zone.textContent = zone;
      summary.notes.textContent = notes || "None specified";
      syncSeatingCardHighlight(zone);
    };

    const resetToPreviewMode = () => {
      isConfirmedState = false;
      lastConfirmedRef = "";
      summary.card.classList.remove("is-confirmed");
      summary.title.textContent = "Reservation Preview";
      summary.status.textContent = "Draft Preview";
      summary.status.className = "status-pill status-pill--preview";
      summary.reference.textContent = "Awaiting Confirmation";
      if (summary.actions) summary.actions.hidden = true;
      updatePreviewCard();
    };

    // Seating highlight cards -> select zone in form
    document.querySelectorAll("[data-select-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetZone = btn.getAttribute("data-select-zone");
        const radio = Array.from(form.querySelectorAll('input[name="seatingZone"]')).find(
          (input) => input.value === targetZone
        );
        if (radio) {
          radio.checked = true;
          if (isConfirmedState) resetToPreviewMode();
          updatePreviewCard();
          document.getElementById("bookingSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
          showToast(`${targetZone} selected for your reservation.`);
        }
      });
    });

    // Live input listeners
    ["guestName", "guestPhone", "guestEmail", "partySize", "reservationDate", "timeSlot"].forEach((name) => {
      const input = elements[name];
      if (!input) return;
      input.addEventListener("input", () => {
        if (isConfirmedState) resetToPreviewMode();
        if (input.classList.contains("is-invalid")) {
          validateField(name, elements);
        }
        updatePreviewCard();
      });
      input.addEventListener("blur", () => {
        validateField(name, elements);
      });
    });

    form.querySelectorAll('input[name="seatingZone"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        if (isConfirmedState) resetToPreviewMode();
        updatePreviewCard();
      });
    });

    if (elements.reservationNotes && elements.notesCount) {
      elements.reservationNotes.addEventListener("input", () => {
        if (isConfirmedState) resetToPreviewMode();
        elements.notesCount.textContent = `${elements.reservationNotes.value.length} / 400`;
        updatePreviewCard();
      });
    }

    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        Object.keys(elements).forEach((key) => {
          if (elements[key]?.classList) {
            elements[key].classList.remove("is-invalid", "is-valid");
          }
          if (key.endsWith("Error") && elements[key]) {
            elements[key].textContent = "";
          }
        });
        if (elements.reservationDate) elements.reservationDate.value = todayIso;
        if (elements.notesCount) elements.notesCount.textContent = "0 / 400";
        resetToPreviewMode();
      }, 0);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const fieldOrder = ["guestName", "guestPhone", "guestEmail", "partySize", "reservationDate", "timeSlot"];
      const results = fieldOrder.map((name) => validateField(name, elements));
      const zone = getSelectedZone(form);

      if (!zone) {
        elements.seatingZoneError.textContent = "Please choose a seating zone.";
        results.push(false);
      } else {
        elements.seatingZoneError.textContent = "";
      }

      const firstInvalidIndex = results.indexOf(false);
      if (firstInvalidIndex !== -1) {
        const invalidFieldName = fieldOrder[firstInvalidIndex];
        elements[invalidFieldName]?.focus();
        showToast("Please review the highlighted reservation fields.", "error");
        return;
      }

      const reservation = {
        reference: generateBookingReference(),
        guestName: elements.guestName.value.trim(),
        phone: elements.guestPhone.value.trim(),
        email: elements.guestEmail.value.trim(),
        partySize: Number(elements.partySize.value),
        date: elements.reservationDate.value,
        timeSlot: elements.timeSlot.value,
        seatingZone: zone,
        notes: elements.reservationNotes.value.trim(),
        status: "Confirmed",
        createdAt: new Date().toISOString()
      };

      const existing = safeReadStorage(STORAGE_KEYS.RESERVATIONS, []);
      existing.unshift(reservation);
      safeWriteStorage(STORAGE_KEYS.RESERVATIONS, existing);

      isConfirmedState = true;
      lastConfirmedRef = reservation.reference;

      summary.card.classList.add("is-confirmed");
      summary.title.textContent = "Reservation Confirmed";
      summary.status.textContent = "Confirmed";
      summary.status.className = "status-pill status-pill--confirmed";
      summary.reference.textContent = reservation.reference;
      summary.guest.textContent = reservation.guestName;
      summary.contact.textContent = `${reservation.phone} · ${reservation.email}`;
      summary.dateTime.textContent = `${formatDisplayDate(reservation.date)} at ${reservation.timeSlot}`;
      summary.party.textContent = `${reservation.partySize} ${reservation.partySize === 1 ? "Guest" : "Guests"}`;
      summary.zone.textContent = reservation.seatingZone;
      summary.notes.textContent = reservation.notes || "None specified";
      if (summary.actions) summary.actions.hidden = false;

      renderSavedReservations();
      summary.card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      showToast(`Table confirmed! Reference ${reservation.reference} saved.`);
    });

    if (summary.copyRefBtn) {
      summary.copyRefBtn.addEventListener("click", async () => {
        if (!lastConfirmedRef) return;
        try {
          await navigator.clipboard.writeText(lastConfirmedRef);
          showToast(`Copied booking reference ${lastConfirmedRef}.`);
        } catch {
          showToast(`Booking reference: ${lastConfirmedRef}`);
        }
      });
    }

    if (summary.printBtn) {
      summary.printBtn.addEventListener("click", () => {
        window.print();
      });
    }

    if (summary.newBookingBtn) {
      summary.newBookingBtn.addEventListener("click", () => {
        form.reset();
        elements.guestName.focus();
      });
    }

    const savedList = document.getElementById("savedReservationsList");
    if (savedList) {
      savedList.addEventListener("click", (event) => {
        const removeBtn = event.target.closest("[data-remove-ref]");
        if (!removeBtn) return;
        const ref = removeBtn.getAttribute("data-remove-ref");
        const updated = safeReadStorage(STORAGE_KEYS.RESERVATIONS, []).filter(
          (item) => item.reference !== ref
        );
        safeWriteStorage(STORAGE_KEYS.RESERVATIONS, updated);
        renderSavedReservations();
        showToast(`Cancelled reservation ${ref}.`);
      });
    }

    updatePreviewCard();
    renderSavedReservations();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const yearEl = document.getElementById("footerYear");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    initMobileNav();
    initCartDrawer();
    initReservations();
  });
})();
