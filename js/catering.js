/* ==========================================================================
   SavorSpot — Catering & Private Events Interactivity (js/catering.js)
   ========================================================================== */

(function () {
  "use strict";

  const CART_STORAGE_KEY = "savorCart";
  const INQUIRIES_STORAGE_KEY = "savorCateringInquiries";

  const PACKAGES = {
    corporate: {
      name: "Corporate Luncheons",
      rate: 4800,
      minGuests: 15,
      maxGuests: 60,
      defaultGuests: 30
    },
    intimate: {
      name: "Intimate Dinners",
      rate: 7200,
      minGuests: 12,
      maxGuests: 40,
      defaultGuests: 28
    },
    grand: {
      name: "Grand Celebrations",
      rate: 9500,
      minGuests: 50,
      maxGuests: 250,
      defaultGuests: 100
    }
  };

  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  const packageCards = Array.from(document.querySelectorAll(".package-card"));
  const packageSelectBtns = Array.from(document.querySelectorAll("[data-select-package]"));

  const estPackage = document.getElementById("estPackage");
  const estGuestsRange = document.getElementById("estGuestsRange");
  const estGuestsInput = document.getElementById("estGuestsInput");
  const estRangeHint = document.getElementById("estRangeHint");
  const addonCheckboxes = [
    document.getElementById("optEspressoBar"),
    document.getElementById("optLiveGrill"),
    document.getElementById("optTableware")
  ].filter(Boolean);

  const estSummaryTier = document.getElementById("estSummaryTier");
  const estSummaryGuests = document.getElementById("estSummaryGuests");
  const estBaseRate = document.getElementById("estBaseRate");
  const estCountCopy = document.getElementById("estCountCopy");
  const estBaseTotal = document.getElementById("estBaseTotal");
  const estAddonsTotal = document.getElementById("estAddonsTotal");
  const estServiceFee = document.getElementById("estServiceFee");
  const estTotalCost = document.getElementById("estTotalCost");
  const estPerGuestAvg = document.getElementById("estPerGuestAvg");
  const applyEstimateBtn = document.getElementById("applyEstimateBtn");

  const inquiryForm = document.getElementById("cateringInquiryForm");
  const inquiryConfirmation = document.getElementById("inquiryConfirmation");
  const newInquiryBtn = document.getElementById("newInquiryBtn");

  const inqName = document.getElementById("inqName");
  const inqEmail = document.getElementById("inqEmail");
  const inqPhone = document.getElementById("inqPhone");
  const inqDate = document.getElementById("inqDate");
  const inqPackage = document.getElementById("inqPackage");
  const inqGuests = document.getElementById("inqGuests");
  const inqVenue = document.getElementById("inqVenue");
  const inqNotes = document.getElementById("inqNotes");

  const inqNameError = document.getElementById("inqNameError");
  const inqEmailError = document.getElementById("inqEmailError");
  const inqPhoneError = document.getElementById("inqPhoneError");
  const inqDateError = document.getElementById("inqDateError");
  const inqPackageError = document.getElementById("inqPackageError");
  const inqGuestsError = document.getElementById("inqGuestsError");

  const confirmName = document.getElementById("confirmName");
  const confirmRef = document.getElementById("confirmRef");
  const confirmPackage = document.getElementById("confirmPackage");
  const confirmGuests = document.getElementById("confirmGuests");
  const confirmDate = document.getElementById("confirmDate");
  const confirmEstimate = document.getElementById("confirmEstimate");

  const savedInquiriesCount = document.getElementById("savedInquiriesCount");
  const recentInquiriesWrap = document.getElementById("recentInquiriesWrap");
  const recentInquiriesList = document.getElementById("recentInquiriesList");

  const cartTrigger = document.getElementById("cartTrigger");
  const cartDrawer = document.getElementById("savorCart");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartClose = document.getElementById("cartClose");
  const cartBadge = document.getElementById("cartBadge");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartClearBtn = document.getElementById("cartClearBtn");
  const toastContainer = document.getElementById("toastContainer");

  let lastFocusedElement = null;

  /* ------------------------------------------------------------------------
     Utility Helpers
     ------------------------------------------------------------------------ */
  function formatPKR(amount) {
    return "PKR " + Math.round(Number(amount) || 0).toLocaleString("en-PK");
  }

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);

    window.setTimeout(function () {
      toast.remove();
    }, 3200);
  }

  function clampGuests(val) {
    const parsed = parseInt(val, 10);
    if (Number.isNaN(parsed)) return 10;
    return Math.max(10, Math.min(250, parsed));
  }

  /* ------------------------------------------------------------------------
     Mobile Navigation Toggle
     ------------------------------------------------------------------------ */
  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      primaryNav.classList.toggle("is-open", !expanded);
    });
  }

  /* ------------------------------------------------------------------------
     Dynamic Catering Cost Estimator
     ------------------------------------------------------------------------ */
  function getEstimatorState() {
    const pkgKey = estPackage && PACKAGES[estPackage.value] ? estPackage.value : "intimate";
    const pkg = PACKAGES[pkgKey];
    const guests = clampGuests(estGuestsInput ? estGuestsInput.value : pkg.defaultGuests);

    let addonsTotal = 0;
    const selectedAddons = [];

    addonCheckboxes.forEach(function (box) {
      if (!box.checked) return;
      const cost = Number(box.dataset.cost) || 0;
      const type = box.dataset.type || "flat";
      addonsTotal += type === "per-guest" ? cost * guests : cost;
      const label = box.closest(".addon-option")?.querySelector("strong")?.textContent || "";
      if (label) selectedAddons.push(label);
    });

    const baseTotal = pkg.rate * guests;
    const subtotal = baseTotal + addonsTotal;
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;

    return {
      pkgKey: pkgKey,
      pkg: pkg,
      guests: guests,
      baseTotal: baseTotal,
      addonsTotal: addonsTotal,
      serviceFee: serviceFee,
      total: total,
      perGuestAvg: Math.round(total / guests),
      selectedAddons: selectedAddons
    };
  }

  function updateEstimatorUI() {
    const state = getEstimatorState();

    packageCards.forEach(function (card) {
      card.classList.toggle("is-selected", card.dataset.package === state.pkgKey);
    });

    if (estRangeHint) {
      const inRange =
        state.guests >= state.pkg.minGuests && state.guests <= state.pkg.maxGuests;
      estRangeHint.textContent = inRange
        ? "Recommended: " + state.pkg.minGuests + " – " + state.pkg.maxGuests + " guests"
        : "Outside typical " + state.pkg.minGuests + "–" + state.pkg.maxGuests + " range (custom quote)";
    }

    if (estSummaryTier) estSummaryTier.textContent = state.pkg.name;
    if (estSummaryGuests) estSummaryGuests.textContent = state.guests + " Guests";
    if (estBaseRate) estBaseRate.textContent = formatPKR(state.pkg.rate);
    if (estCountCopy) estCountCopy.textContent = String(state.guests);
    if (estBaseTotal) estBaseTotal.textContent = formatPKR(state.baseTotal);
    if (estAddonsTotal) estAddonsTotal.textContent = formatPKR(state.addonsTotal);
    if (estServiceFee) estServiceFee.textContent = formatPKR(state.serviceFee);
    if (estTotalCost) estTotalCost.textContent = formatPKR(state.total);
    if (estPerGuestAvg) {
      estPerGuestAvg.textContent =
        "Approx. " + formatPKR(state.perGuestAvg) + " per guest incl. service";
    }
  }

  function selectPackageForEstimator(pkgKey) {
    if (!PACKAGES[pkgKey] || !estPackage) return;
    estPackage.value = pkgKey;
    const defaultCount = PACKAGES[pkgKey].defaultGuests;
    if (estGuestsRange) estGuestsRange.value = String(defaultCount);
    if (estGuestsInput) estGuestsInput.value = String(defaultCount);
    updateEstimatorUI();
  }

  packageSelectBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const pkgKey = btn.dataset.selectPackage;
      selectPackageForEstimator(pkgKey);
      const estimatorEl = document.getElementById("estimatorSection");
      if (estimatorEl) {
        estimatorEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      showToast("Loaded " + PACKAGES[pkgKey].name + " into the estimator.");
    });
  });

  if (estPackage) {
    estPackage.addEventListener("change", function () {
      updateEstimatorUI();
    });
  }

  if (estGuestsRange && estGuestsInput) {
    estGuestsRange.addEventListener("input", function () {
      estGuestsInput.value = estGuestsRange.value;
      updateEstimatorUI();
    });

    estGuestsInput.addEventListener("input", function () {
      const clamped = clampGuests(estGuestsInput.value);
      estGuestsRange.value = String(clamped);
      updateEstimatorUI();
    });

    estGuestsInput.addEventListener("blur", function () {
      const clamped = clampGuests(estGuestsInput.value);
      estGuestsInput.value = String(clamped);
      estGuestsRange.value = String(clamped);
      updateEstimatorUI();
    });
  }

  addonCheckboxes.forEach(function (box) {
    box.addEventListener("change", updateEstimatorUI);
  });

  if (applyEstimateBtn) {
    applyEstimateBtn.addEventListener("click", function () {
      const state = getEstimatorState();
      if (inqPackage) inqPackage.value = state.pkgKey;
      if (inqGuests) inqGuests.value = String(state.guests);
      if (inqNotes && state.selectedAddons.length && !inqNotes.value.trim()) {
        inqNotes.value = "Requested enhancements: " + state.selectedAddons.join(", ") + ".";
      }

      if (inquiryConfirmation && !inquiryConfirmation.hidden && inquiryForm) {
        inquiryConfirmation.hidden = true;
        inquiryForm.hidden = false;
      }

      const inquirySection = document.getElementById("inquirySection");
      if (inquirySection) {
        inquirySection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      showToast("Applied " + state.pkg.name + " (" + state.guests + " guests) to your inquiry.");
    });
  }

  /* ------------------------------------------------------------------------
     Catering Inquiry Storage, Validation & Confirmation
     ------------------------------------------------------------------------ */
  function readStoredInquiries() {
    try {
      const raw = window.localStorage.getItem(INQUIRIES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeStoredInquiries(inquiries) {
    try {
      window.localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(inquiries));
      return true;
    } catch (_err) {
      showToast("Unable to save inquiry in local storage.");
      return false;
    }
  }

  function renderSavedInquiries() {
    const stored = readStoredInquiries();
    if (savedInquiriesCount) {
      savedInquiriesCount.textContent =
        stored.length === 1
          ? "1 inquiry saved locally"
          : stored.length + " inquiries saved locally";
    }

    if (!recentInquiriesWrap || !recentInquiriesList) return;
    recentInquiriesList.innerHTML = "";

    if (!stored.length) {
      recentInquiriesWrap.hidden = true;
      return;
    }

    recentInquiriesWrap.hidden = false;
    stored.slice(0, 3).forEach(function (entry) {
      const li = document.createElement("li");
      li.className = "recent-item";

      const left = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = entry.packageName;
      left.appendChild(strong);
      left.appendChild(document.createTextNode(" • " + entry.guests + " guests"));

      const right = document.createElement("span");
      right.textContent = formatPKR(entry.estimatedTotal);

      li.appendChild(left);
      li.appendChild(right);
      recentInquiriesList.appendChild(li);
    });
  }

  function setFieldError(inputEl, errorEl, message) {
    if (errorEl) errorEl.textContent = message || "";
    if (!inputEl) return;
    const wrapper = inputEl.closest(".form-field");
    if (wrapper) {
      wrapper.classList.toggle("has-error", Boolean(message));
    }
  }

  function clearInquiryErrors() {
    setFieldError(inqName, inqNameError, "");
    setFieldError(inqEmail, inqEmailError, "");
    setFieldError(inqPhone, inqPhoneError, "");
    setFieldError(inqDate, inqDateError, "");
    setFieldError(inqPackage, inqPackageError, "");
    setFieldError(inqGuests, inqGuestsError, "");
  }

  function setMinEventDate() {
    if (!inqDate) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    inqDate.min = yyyy + "-" + mm + "-" + dd;
  }

  if (inquiryForm) {
    inquiryForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearInquiryErrors();

      const name = inqName ? inqName.value.trim() : "";
      const email = inqEmail ? inqEmail.value.trim() : "";
      const phone = inqPhone ? inqPhone.value.trim() : "";
      const eventDate = inqDate ? inqDate.value : "";
      const pkgKey = inqPackage ? inqPackage.value : "";
      const guests = parseInt(inqGuests ? inqGuests.value : "0", 10);
      const venue = inqVenue ? inqVenue.value.trim() : "";
      const notes = inqNotes ? inqNotes.value.trim() : "";

      let isValid = true;

      if (name.length < 2) {
        setFieldError(inqName, inqNameError, "Please enter at least 2 characters for your name.");
        isValid = false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError(inqEmail, inqEmailError, "Please enter a valid email address.");
        isValid = false;
      }

      if (phone.replace(/\D/g, "").length < 7) {
        setFieldError(inqPhone, inqPhoneError, "Please enter a valid contact phone number.");
        isValid = false;
      }

      if (!eventDate) {
        setFieldError(inqDate, inqDateError, "Please choose a preferred event date.");
        isValid = false;
      }

      if (!pkgKey || !PACKAGES[pkgKey]) {
        setFieldError(inqPackage, inqPackageError, "Please select a catering package.");
        isValid = false;
      }

      if (Number.isNaN(guests) || guests < 10 || guests > 250) {
        setFieldError(inqGuests, inqGuestsError, "Guest count must be between 10 and 250.");
        isValid = false;
      }

      if (!isValid) return;

      const selectedPkg = PACKAGES[pkgKey];
      const estState = getEstimatorState();
      const addonsForQuote = pkgKey === estState.pkgKey ? estState.addonsTotal : 0;
      const baseForQuote = selectedPkg.rate * guests;
      const estimatedTotal = Math.round((baseForQuote + addonsForQuote) * 1.1);
      const refCode = "SS-CAT-" + String(Date.now()).slice(-4);

      const inquiryRecord = {
        id: refCode,
        name: name,
        email: email,
        phone: phone,
        eventDate: eventDate,
        packageKey: pkgKey,
        packageName: selectedPkg.name,
        guests: guests,
        venue: venue || "To be confirmed",
        notes: notes,
        estimatedTotal: estimatedTotal,
        createdAt: new Date().toISOString()
      };

      const existing = readStoredInquiries();
      existing.unshift(inquiryRecord);
      writeStoredInquiries(existing);
      renderSavedInquiries();

      if (confirmName) confirmName.textContent = name;
      if (confirmRef) confirmRef.textContent = refCode;
      if (confirmPackage) confirmPackage.textContent = selectedPkg.name;
      if (confirmGuests) confirmGuests.textContent = guests + " Guests";
      if (confirmDate) confirmDate.textContent = eventDate;
      if (confirmEstimate) confirmEstimate.textContent = formatPKR(estimatedTotal);

      inquiryForm.hidden = true;
      if (inquiryConfirmation) inquiryConfirmation.hidden = false;

      showToast("Catering inquiry " + refCode + " submitted.");
    });
  }

  if (newInquiryBtn && inquiryForm && inquiryConfirmation) {
    newInquiryBtn.addEventListener("click", function () {
      inquiryForm.reset();
      if (inqGuests) inqGuests.value = "28";
      inquiryConfirmation.hidden = true;
      inquiryForm.hidden = false;
      if (inqName) inqName.focus();
    });
  }

  /* ------------------------------------------------------------------------
     Shared "savorCart" Drawer & localStorage Sync
     ------------------------------------------------------------------------ */
  function readCart() {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (_err) {
      showToast("Unable to save order in local storage.");
    }
    renderCart();
  }

  function updateItemQty(id, delta) {
    const cart = readCart();
    const updated = cart
      .map(function (entry) {
        if (entry.id !== id) return entry;
        return {
          id: entry.id,
          title: entry.title,
          price: entry.price,
          qty: (Number(entry.qty) || 1) + delta
        };
      })
      .filter(function (entry) {
        return entry.qty > 0;
      });

    writeCart(updated);
  }

  function renderCart() {
    const cart = readCart();
    const totalCount = cart.reduce(function (sum, item) {
      return sum + (Number(item.qty) || 1);
    }, 0);
    const subtotalAmount = cart.reduce(function (sum, item) {
      return sum + (Number(item.price) || 0) * (Number(item.qty) || 1);
    }, 0);

    if (cartBadge) {
      cartBadge.textContent = String(totalCount);
    }
    if (cartSubtotal) {
      cartSubtotal.textContent = formatPKR(subtotalAmount);
    }

    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    if (!cart.length) {
      const emptyEl = document.createElement("p");
      emptyEl.className = "cart-empty";
      emptyEl.textContent =
        "Your order drawer is currently empty. Add signature plates, elixirs, or desserts from the gallery or menu.";
      cartItemsContainer.appendChild(emptyEl);
      return;
    }

    cart.forEach(function (item) {
      const row = document.createElement("div");
      row.className = "cart-item";

      const info = document.createElement("div");
      info.className = "cart-item-info";

      const title = document.createElement("p");
      title.className = "cart-item-title";
      title.textContent = item.title;

      const price = document.createElement("p");
      price.className = "cart-item-price";
      price.textContent = formatPKR(item.price);

      info.appendChild(title);
      info.appendChild(price);

      const controls = document.createElement("div");
      controls.className = "cart-item-controls";

      const decBtn = document.createElement("button");
      decBtn.type = "button";
      decBtn.className = "qty-btn";
      decBtn.textContent = "−";
      decBtn.setAttribute("aria-label", "Decrease quantity of " + item.title);
      decBtn.addEventListener("click", function () {
        updateItemQty(item.id, -1);
      });

      const qtyVal = document.createElement("span");
      qtyVal.className = "qty-value";
      qtyVal.textContent = String(item.qty || 1);

      const incBtn = document.createElement("button");
      incBtn.type = "button";
      incBtn.className = "qty-btn";
      incBtn.textContent = "+";
      incBtn.setAttribute("aria-label", "Increase quantity of " + item.title);
      incBtn.addEventListener("click", function () {
        updateItemQty(item.id, 1);
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", "Remove " + item.title + " from order");
      removeBtn.addEventListener("click", function () {
        updateItemQty(item.id, -(Number(item.qty) || 1));
      });

      controls.appendChild(decBtn);
      controls.appendChild(qtyVal);
      controls.appendChild(incBtn);
      controls.appendChild(removeBtn);

      row.appendChild(info);
      row.appendChild(controls);
      cartItemsContainer.appendChild(row);
    });
  }

  function openCartDrawer() {
    if (!cartDrawer || !cartBackdrop) return;
    lastFocusedElement = document.activeElement;
    cartDrawer.hidden = false;
    cartBackdrop.hidden = false;
    if (cartTrigger) cartTrigger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (cartClose) cartClose.focus();
  }

  function closeCartDrawer() {
    if (!cartDrawer || !cartBackdrop || cartDrawer.hidden) return;
    cartDrawer.hidden = true;
    cartBackdrop.hidden = true;
    if (cartTrigger) cartTrigger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  if (cartTrigger) {
    cartTrigger.addEventListener("click", openCartDrawer);
  }
  if (cartClose) {
    cartClose.addEventListener("click", closeCartDrawer);
  }
  if (cartBackdrop) {
    cartBackdrop.addEventListener("click", closeCartDrawer);
  }
  if (cartClearBtn) {
    cartClearBtn.addEventListener("click", function () {
      writeCart([]);
      showToast("Cleared your SavorSpot order.");
    });
  }

  /* ------------------------------------------------------------------------
     Global Keyboard & Cross-Tab Storage Listeners
     ------------------------------------------------------------------------ */
  document.addEventListener("keydown", function (event) {
    if (cartDrawer && !cartDrawer.hidden && event.key === "Escape") {
      closeCartDrawer();
    }
  });

  window.addEventListener("storage", function (event) {
    if (event.key === CART_STORAGE_KEY) {
      renderCart();
    } else if (event.key === INQUIRIES_STORAGE_KEY) {
      renderSavedInquiries();
    }
  });

  // Initial setup on load
  setMinEventDate();
  updateEstimatorUI();
  renderSavedInquiries();
  renderCart();
})();
