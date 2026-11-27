/* SavorSpot — Checkout & Order Summary Interactivity
   Integrates with localStorage ("savorCart" & "savorOrders") */

(function () {
  "use strict";

  const CART_KEY = "savorCart";
  const ORDERS_KEY = "savorOrders";
  const FREE_DELIVERY_THRESHOLD = 4500;
  const STANDARD_DELIVERY_FEE = 250;
  const OUTER_DELIVERY_FEE = 400;
  const OUTER_SECTORS = new Set(["D-12 / E-11", "Bahria Town / DHA Islamabad"]);

  const PROMO_CODES = {
    SAVOR10: { type: "percent", value: 10, label: "SAVOR10 · 10% Off" },
    ESPRESSO500: { type: "flat", value: 500, label: "ESPRESSO500 · PKR 500 Off" }
  };

  const SAMPLE_TASTING_CART = [
    {
      id: "sav-wagyu-ribeye",
      name: "Oak-Charred Ribeye & Espresso Jus",
      category: "Signature Grill",
      price: 3850,
      quantity: 1,
      notes: "Smoked bone marrow butter"
    },
    {
      id: "sav-truffle-risotto",
      name: "Black Truffle Wild Mushroom Risotto",
      category: "Artisan Mains",
      price: 2150,
      quantity: 1,
      notes: "24-month Parmigiano crisp"
    },
    {
      id: "sav-espresso-tiramisu",
      name: "Single-Origin Espresso Tiramisu",
      category: "Patisserie",
      price: 1150,
      quantity: 2,
      notes: "Dark cocoa & gold leaf dust"
    }
  ];

  const state = {
    cart: [],
    fulfillmentType: "delivery",
    paymentMethod: "cod",
    appliedPromo: null
  };

  const els = {
    primaryNav: document.getElementById("primaryNav"),
    mobileMenuToggle: document.getElementById("mobileMenuToggle"),
    cartDrawerToggle: document.getElementById("cartDrawerToggle"),
    cartCountBadge: document.getElementById("cartCountBadge"),
    savorCart: document.getElementById("savorCart"),
    cartDrawerBackdrop: document.getElementById("cartDrawerBackdrop"),
    closeCartDrawer: document.getElementById("closeCartDrawer"),
    drawerCartItems: document.getElementById("drawerCartItems"),
    drawerSubtotal: document.getElementById("drawerSubtotal"),
    drawerProceedBtn: document.getElementById("drawerProceedBtn"),

    checkoutProgress: document.getElementById("checkoutProgress"),
    checkoutSection: document.getElementById("checkoutSection"),
    checkoutForm: document.getElementById("checkoutForm"),
    fulfillmentEtaBadge: document.getElementById("fulfillmentEtaBadge"),
    pickupNotice: document.getElementById("pickupNotice"),
    deliveryAddressCard: document.getElementById("deliveryAddressCard"),
    pickupNotesCard: document.getElementById("pickupNotesCard"),

    customerName: document.getElementById("customerName"),
    customerPhone: document.getElementById("customerPhone"),
    customerEmail: document.getElementById("customerEmail"),
    deliverySector: document.getElementById("deliverySector"),
    streetAddress: document.getElementById("streetAddress"),
    addressLandmark: document.getElementById("addressLandmark"),
    orderNotes: document.getElementById("orderNotes"),
    pickupNotes: document.getElementById("pickupNotes"),

    cardDetailsPanel: document.getElementById("cardDetailsPanel"),
    walletDetailsPanel: document.getElementById("walletDetailsPanel"),
    cardHolder: document.getElementById("cardHolder"),
    cardNumber: document.getElementById("cardNumber"),
    cardExpiry: document.getElementById("cardExpiry"),
    cardCvc: document.getElementById("cardCvc"),
    walletProvider: document.getElementById("walletProvider"),
    walletAccount: document.getElementById("walletAccount"),

    summaryItemCount: document.getElementById("summaryItemCount"),
    checkoutItemsList: document.getElementById("checkoutItemsList"),
    checkoutEmptyState: document.getElementById("checkoutEmptyState"),
    loadSampleCartBtn: document.getElementById("loadSampleCartBtn"),
    promoCodeInput: document.getElementById("promoCodeInput"),
    applyPromoBtn: document.getElementById("applyPromoBtn"),
    promoFeedback: document.getElementById("promoFeedback"),

    summarySubtotal: document.getElementById("summarySubtotal"),
    discountRow: document.getElementById("discountRow"),
    appliedPromoLabel: document.getElementById("appliedPromoLabel"),
    summaryDiscount: document.getElementById("summaryDiscount"),
    deliveryFeeLabel: document.getElementById("deliveryFeeLabel"),
    summaryDeliveryFee: document.getElementById("summaryDeliveryFee"),
    summaryTotal: document.getElementById("summaryTotal"),
    deliveryThresholdNote: document.getElementById("deliveryThresholdNote"),
    placeOrderBtn: document.getElementById("placeOrderBtn"),

    orderConfirmationSection: document.getElementById("orderConfirmationSection"),
    receiptOrderRef: document.getElementById("receiptOrderRef"),
    receiptFulfillment: document.getElementById("receiptFulfillment"),
    receiptTimestamp: document.getElementById("receiptTimestamp"),
    receiptCustomer: document.getElementById("receiptCustomer"),
    receiptAddress: document.getElementById("receiptAddress"),
    receiptPayment: document.getElementById("receiptPayment"),
    receiptNotes: document.getElementById("receiptNotes"),
    receiptItemsList: document.getElementById("receiptItemsList"),
    receiptSubtotal: document.getElementById("receiptSubtotal"),
    receiptDiscountRow: document.getElementById("receiptDiscountRow"),
    receiptDiscount: document.getElementById("receiptDiscount"),
    receiptDelivery: document.getElementById("receiptDelivery"),
    receiptTotal: document.getElementById("receiptTotal"),
    trackOrderLink: document.getElementById("trackOrderLink"),
    printReceiptBtn: document.getElementById("printReceiptBtn"),

    toastContainer: document.getElementById("toastContainer")
  };

  function formatPKR(amount) {
    const safe = Math.max(0, Math.round(Number(amount) || 0));
    return "PKR " + safe.toLocaleString("en-PK");
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readStorageArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function normalizeCartItem(item, index) {
    const quantity = Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10) || 1);
    const price = Math.max(0, Number(item.price) || 0);
    return {
      ...item,
      id: String(item.id ?? item.slug ?? `item-${index + 1}`),
      name: String(item.name || item.title || "SavorSpot Selection"),
      category: String(item.category || "F-6 Markaz Kitchen"),
      notes: String(item.notes || item.variant || ""),
      image: typeof item.image === "string" ? item.image : "",
      price,
      quantity
    };
  }

  function loadCart() {
    const rawItems = readStorageArray(CART_KEY);
    state.cart = rawItems.map(normalizeCartItem);
  }

  function saveCart() {
    try {
      const serialized = state.cart.map((item) => {
        const record = { ...item, quantity: item.quantity };
        if ("qty" in record) {
          record.qty = item.quantity;
        }
        return record;
      });
      localStorage.setItem(CART_KEY, JSON.stringify(serialized));
    } catch (err) {
      showToast("Unable to update browser storage for your bag.", "error");
    }
  }

  function getTotalItemCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  function computePricing() {
    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let discount = 0;
    if (state.appliedPromo && subtotal > 0) {
      if (state.appliedPromo.type === "percent") {
        discount = Math.round((subtotal * state.appliedPromo.value) / 100);
      } else {
        discount = Math.min(subtotal, state.appliedPromo.value);
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const selectedSector = els.deliverySector ? els.deliverySector.value : "";

    let deliveryFee = 0;
    if (subtotal > 0 && state.fulfillmentType === "delivery") {
      if (discountedSubtotal >= FREE_DELIVERY_THRESHOLD) {
        deliveryFee = 0;
      } else if (OUTER_SECTORS.has(selectedSector)) {
        deliveryFee = OUTER_DELIVERY_FEE;
      } else {
        deliveryFee = STANDARD_DELIVERY_FEE;
      }
    }

    const total = discountedSubtotal + deliveryFee;
    return { subtotal, discount, discountedSubtotal, deliveryFee, total };
  }

  function updateItemQuantity(itemId, delta) {
    const target = state.cart.find((item) => item.id === itemId);
    if (!target) return;

    const nextQty = target.quantity + delta;
    if (nextQty <= 0) {
      removeItem(itemId);
      return;
    }

    target.quantity = nextQty;
    saveCart();
    renderAll();
  }

  function removeItem(itemId) {
    const removed = state.cart.find((item) => item.id === itemId);
    state.cart = state.cart.filter((item) => item.id !== itemId);
    saveCart();
    renderAll();
    if (removed) {
      showToast(`Removed "${removed.name}" from your bag.`);
    }
  }

  function buildItemNode(item) {
    const article = document.createElement("article");
    article.className = "order-item";
    article.dataset.itemId = item.id;

    const thumb = document.createElement("div");
    thumb.className = "order-item-thumb";
    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = item.name.trim().charAt(0).toUpperCase() || "S";
    }

    const info = document.createElement("div");
    info.className = "order-item-info";
    const metaParts = [item.category, formatPKR(item.price) + " each"];
    if (item.notes) metaParts.push(item.notes);
    info.innerHTML = `
      <h3 class="order-item-title">${escapeHTML(item.name)}</h3>
      <p class="order-item-meta">${escapeHTML(metaParts.join(" · "))}</p>
    `;

    const controls = document.createElement("div");
    controls.className = "order-item-controls";
    controls.innerHTML = `
      <span class="order-item-price">${escapeHTML(formatPKR(item.price * item.quantity))}</span>
      <div class="qty-bar">
        <button type="button" class="qty-btn" data-action="dec" data-id="${escapeHTML(item.id)}" aria-label="Decrease quantity of ${escapeHTML(item.name)}">&minus;</button>
        <span class="qty-value">${item.quantity}</span>
        <button type="button" class="qty-btn" data-action="inc" data-id="${escapeHTML(item.id)}" aria-label="Increase quantity of ${escapeHTML(item.name)}">+</button>
      </div>
      <button type="button" class="remove-item-btn" data-action="remove" data-id="${escapeHTML(item.id)}">Remove</button>
    `;

    article.append(thumb, info, controls);
    return article;
  }

  function renderCartViews() {
    const count = getTotalItemCount();
    const hasItems = state.cart.length > 0;

    els.cartCountBadge.textContent = String(count);
    els.summaryItemCount.textContent = count === 1 ? "1 item" : `${count} items`;

    els.checkoutItemsList.innerHTML = "";
    els.drawerCartItems.innerHTML = "";

    if (!hasItems) {
      els.checkoutItemsList.hidden = true;
      els.checkoutEmptyState.hidden = false;
      els.placeOrderBtn.disabled = true;

      els.drawerCartItems.innerHTML = `
        <div class="empty-cart-panel">
          <p class="empty-title">Your bag is empty</p>
          <p class="empty-copy">Add dishes from the SavorSpot menu or load a tasting sample on checkout.</p>
        </div>
      `;
    } else {
      els.checkoutItemsList.hidden = false;
      els.checkoutEmptyState.hidden = true;
      els.placeOrderBtn.disabled = false;

      state.cart.forEach((item) => {
        els.checkoutItemsList.appendChild(buildItemNode(item));
        els.drawerCartItems.appendChild(buildItemNode(item));
      });
    }
  }

  function renderTotals() {
    const { subtotal, discount, discountedSubtotal, deliveryFee, total } = computePricing();

    els.summarySubtotal.textContent = formatPKR(subtotal);
    els.drawerSubtotal.textContent = formatPKR(subtotal);

    if (discount > 0 && state.appliedPromo) {
      els.discountRow.hidden = false;
      els.appliedPromoLabel.textContent = state.appliedPromo.code;
      els.summaryDiscount.textContent = "- " + formatPKR(discount);
    } else {
      els.discountRow.hidden = true;
    }

    if (state.fulfillmentType === "pickup") {
      els.deliveryFeeLabel.textContent = "Pickup Fee (F-6 Markaz)";
      els.summaryDeliveryFee.textContent = "PKR 0";
      els.deliveryThresholdNote.textContent = "Self-pickup selected — no delivery fee applies.";
    } else {
      els.deliveryFeeLabel.textContent = "Delivery Fee";
      els.summaryDeliveryFee.textContent = deliveryFee === 0 && subtotal > 0 ? "Complimentary" : formatPKR(deliveryFee);

      if (subtotal === 0) {
        els.deliveryThresholdNote.textContent = `Complimentary Islamabad delivery on orders over ${formatPKR(FREE_DELIVERY_THRESHOLD)}.`;
      } else if (discountedSubtotal >= FREE_DELIVERY_THRESHOLD) {
        els.deliveryThresholdNote.textContent = "Complimentary Islamabad chauffeur delivery unlocked.";
      } else {
        const remaining = FREE_DELIVERY_THRESHOLD - discountedSubtotal;
        els.deliveryThresholdNote.textContent = `Add ${formatPKR(remaining)} more to unlock complimentary Islamabad delivery.`;
      }
    }

    els.summaryTotal.textContent = formatPKR(total);
  }

  function renderAll() {
    renderCartViews();
    renderTotals();
  }

  function updateFulfillmentUI() {
    const isDelivery = state.fulfillmentType === "delivery";
    document.querySelectorAll(".toggle-option").forEach((label) => {
      const radio = label.querySelector('input[type="radio"]');
      label.classList.toggle("is-selected", Boolean(radio && radio.checked));
    });

    els.deliveryAddressCard.hidden = !isDelivery;
    els.pickupNotesCard.hidden = isDelivery;
    els.pickupNotice.hidden = isDelivery;
    els.fulfillmentEtaBadge.textContent = isDelivery ? "35–45 mins" : "20–25 mins";

    if (!isDelivery) {
      clearFieldError(els.deliverySector, "deliverySectorError");
      clearFieldError(els.streetAddress, "streetAddressError");
    }

    renderTotals();
  }

  function updatePaymentUI() {
    document.querySelectorAll(".payment-card").forEach((label) => {
      const radio = label.querySelector('input[type="radio"]');
      label.classList.toggle("is-selected", Boolean(radio && radio.checked));
    });

    els.cardDetailsPanel.hidden = state.paymentMethod !== "card";
    els.walletDetailsPanel.hidden = state.paymentMethod !== "wallet";

    if (state.paymentMethod !== "card") {
      [
        [els.cardHolder, "cardHolderError"],
        [els.cardNumber, "cardNumberError"],
        [els.cardExpiry, "cardExpiryError"],
        [els.cardCvc, "cardCvcError"]
      ].forEach(([field, errId]) => clearFieldError(field, errId));
    }

    if (state.paymentMethod !== "wallet") {
      [
        [els.walletProvider, "walletProviderError"],
        [els.walletAccount, "walletAccountError"]
      ].forEach(([field, errId]) => clearFieldError(field, errId));
    }
  }

  function setFieldError(inputEl, errorId, message) {
    if (inputEl) inputEl.classList.add("is-invalid");
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.textContent = message;
  }

  function clearFieldError(inputEl, errorId) {
    if (inputEl) inputEl.classList.remove("is-invalid");
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.textContent = "";
  }

  function isValidPhone(raw) {
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }

  function isValidExpiry(raw) {
    const match = /^(\d{2})\/(\d{2})$/.exec(raw.trim());
    if (!match) return false;
    const month = parseInt(match[1], 10);
    const year = 2000 + parseInt(match[2], 10);
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return year > currentYear || (year === currentYear && month >= currentMonth);
  }

  function validateCheckoutForm() {
    let firstInvalid = null;
    const recordInvalid = (field, errId, msg) => {
      setFieldError(field, errId, msg);
      if (!firstInvalid) firstInvalid = field;
    };

    const nameVal = els.customerName.value.trim();
    if (nameVal.length < 2) {
      recordInvalid(els.customerName, "customerNameError", "Please enter your full name (at least 2 characters).");
    } else {
      clearFieldError(els.customerName, "customerNameError");
    }

    const phoneVal = els.customerPhone.value.trim();
    if (!isValidPhone(phoneVal)) {
      recordInvalid(els.customerPhone, "customerPhoneError", "Enter a valid mobile number (e.g., 0300-1234567).");
    } else {
      clearFieldError(els.customerPhone, "customerPhoneError");
    }

    const emailVal = els.customerEmail.value.trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      recordInvalid(els.customerEmail, "customerEmailError", "Please enter a valid email address or leave blank.");
    } else {
      clearFieldError(els.customerEmail, "customerEmailError");
    }

    if (state.fulfillmentType === "delivery") {
      if (!els.deliverySector.value) {
        recordInvalid(els.deliverySector, "deliverySectorError", "Select an Islamabad delivery sector.");
      } else {
        clearFieldError(els.deliverySector, "deliverySectorError");
      }

      if (els.streetAddress.value.trim().length < 5) {
        recordInvalid(els.streetAddress, "streetAddressError", "Enter your house/apartment and street details.");
      } else {
        clearFieldError(els.streetAddress, "streetAddressError");
      }
    }

    if (state.paymentMethod === "card") {
      if (els.cardHolder.value.trim().length < 2) {
        recordInvalid(els.cardHolder, "cardHolderError", "Enter the cardholder name.");
      } else {
        clearFieldError(els.cardHolder, "cardHolderError");
      }

      const cardDigits = els.cardNumber.value.replace(/\D/g, "");
      if (cardDigits.length < 13 || cardDigits.length > 19) {
        recordInvalid(els.cardNumber, "cardNumberError", "Enter a valid 13–19 digit card number.");
      } else {
        clearFieldError(els.cardNumber, "cardNumberError");
      }

      if (!isValidExpiry(els.cardExpiry.value)) {
        recordInvalid(els.cardExpiry, "cardExpiryError", "Enter a valid future expiry in MM/YY format.");
      } else {
        clearFieldError(els.cardExpiry, "cardExpiryError");
      }

      const cvcDigits = els.cardCvc.value.replace(/\D/g, "");
      if (cvcDigits.length < 3 || cvcDigits.length > 4) {
        recordInvalid(els.cardCvc, "cardCvcError", "Enter a 3 or 4 digit security code.");
      } else {
        clearFieldError(els.cardCvc, "cardCvcError");
      }
    }

    if (state.paymentMethod === "wallet") {
      if (!els.walletProvider.value) {
        recordInvalid(els.walletProvider, "walletProviderError", "Select your digital wallet provider.");
      } else {
        clearFieldError(els.walletProvider, "walletProviderError");
      }

      if (!isValidPhone(els.walletAccount.value.trim())) {
        recordInvalid(els.walletAccount, "walletAccountError", "Enter a valid wallet mobile number.");
      } else {
        clearFieldError(els.walletAccount, "walletAccountError");
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
      showToast("Please complete the highlighted checkout fields.", "error");
      return false;
    }

    return true;
  }

  function generateOrderReference() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 4; i += 1) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SAV-${yy}${mm}${dd}-${suffix}`;
  }

  function getPaymentSummary() {
    if (state.paymentMethod === "cod") {
      return { method: "cod", label: "Cash on Delivery (PKR)" };
    }
    if (state.paymentMethod === "card") {
      const digits = els.cardNumber.value.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      return { method: "card", label: `Card ending in ${last4}`, last4 };
    }
    return {
      method: "wallet",
      label: `${els.walletProvider.value} (${els.walletAccount.value.trim()})`
    };
  }

  function saveOrderToStorage(order) {
    const existing = readStorageArray(ORDERS_KEY);
    existing.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(existing));
  }

  function renderConfirmationReceipt(order) {
    els.receiptOrderRef.textContent = order.reference;
    els.receiptFulfillment.textContent =
      order.fulfillmentType === "delivery"
        ? "Chauffeur Delivery · Est. 35–45 mins"
        : "F-6 Markaz Self-Pickup · Ready in 20–25 mins";

    els.receiptTimestamp.textContent = new Date(order.createdAt).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    els.receiptCustomer.textContent = `${order.customer.name} · ${order.customer.phone}`;
    els.receiptAddress.textContent =
      order.fulfillmentType === "delivery"
        ? `${order.delivery.street}, ${order.delivery.sector}, Islamabad`
        : "SavorSpot Lounge, Street 7, F-6 Markaz, Islamabad";

    els.receiptPayment.textContent = order.payment.label;
    els.receiptNotes.textContent = order.notes || "No special instructions";

    els.receiptItemsList.innerHTML = "";
    order.items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <span class="receipt-item-name">${escapeHTML(item.name)}</span>
          <span class="receipt-item-qty">&times; ${item.quantity}</span>
        </div>
        <strong>${escapeHTML(formatPKR(item.price * item.quantity))}</strong>
      `;
      els.receiptItemsList.appendChild(li);
    });

    els.receiptSubtotal.textContent = formatPKR(order.pricing.subtotal);
    if (order.pricing.discount > 0) {
      els.receiptDiscountRow.hidden = false;
      els.receiptDiscount.textContent = "- " + formatPKR(order.pricing.discount);
    } else {
      els.receiptDiscountRow.hidden = true;
    }

    els.receiptDelivery.textContent =
      order.pricing.deliveryFee === 0 ? "Complimentary (PKR 0)" : formatPKR(order.pricing.deliveryFee);
    els.receiptTotal.textContent = formatPKR(order.pricing.total);

    els.trackOrderLink.href = `track-order.html?ref=${encodeURIComponent(order.reference)}`;

    document.querySelectorAll("#checkoutProgress .step-item").forEach((step) => {
      step.classList.add("is-active", "is-complete");
    });

    els.checkoutSection.hidden = true;
    els.orderConfirmationSection.hidden = false;
    els.orderConfirmationSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCheckoutSubmit(event) {
    event.preventDefault();

    if (state.cart.length === 0) {
      showToast("Your bag is empty. Add dishes before placing an order.", "error");
      return;
    }

    if (!validateCheckoutForm()) {
      return;
    }

    const pricing = computePricing();
    const reference = generateOrderReference();
    const isDelivery = state.fulfillmentType === "delivery";
    const notesText = isDelivery ? els.orderNotes.value.trim() : els.pickupNotes.value.trim();

    const orderRecord = {
      id: reference,
      reference,
      createdAt: new Date().toISOString(),
      status: "Confirmed",
      fulfillmentType: state.fulfillmentType,
      customer: {
        name: els.customerName.value.trim(),
        phone: els.customerPhone.value.trim(),
        email: els.customerEmail.value.trim()
      },
      delivery: isDelivery
        ? {
            sector: els.deliverySector.value,
            street: els.streetAddress.value.trim(),
            landmark: els.addressLandmark.value.trim()
          }
        : {
            sector: "F-6 Markaz Lounge",
            street: "Street 7, Super Market",
            landmark: "Concierge Desk"
          },
      notes: notesText,
      payment: getPaymentSummary(),
      items: state.cart.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity
      })),
      pricing: {
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        promoCode: state.appliedPromo ? state.appliedPromo.code : null,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total,
        currency: "PKR"
      }
    };

    try {
      saveOrderToStorage(orderRecord);
      state.cart = [];
      state.appliedPromo = null;
      saveCart();
      renderAll();
      renderConfirmationReceipt(orderRecord);
      showToast(`Order ${reference} confirmed!`, "success");
    } catch (err) {
      showToast("Unable to save order locally. Please check browser storage settings.", "error");
    }
  }

  function handleApplyPromo() {
    const rawCode = els.promoCodeInput.value.trim().toUpperCase();
    els.promoFeedback.classList.remove("is-success", "is-error");

    if (!rawCode) {
      state.appliedPromo = null;
      els.promoFeedback.textContent = "Enter a privilege code such as SAVOR10 or ESPRESSO500.";
      els.promoFeedback.classList.add("is-error");
      renderTotals();
      return;
    }

    const promo = PROMO_CODES[rawCode];
    if (!promo) {
      state.appliedPromo = null;
      els.promoFeedback.textContent = "Code not recognized. Try SAVOR10 or ESPRESSO500.";
      els.promoFeedback.classList.add("is-error");
      renderTotals();
      return;
    }

    state.appliedPromo = { code: rawCode, ...promo };
    els.promoFeedback.textContent = `Applied: ${promo.label}`;
    els.promoFeedback.classList.add("is-success");
    renderTotals();
    showToast(`Privilege code ${rawCode} applied.`, "success");
  }

  function openCartDrawer() {
    els.savorCart.classList.add("is-open");
    els.savorCart.setAttribute("aria-hidden", "false");
    els.cartDrawerToggle.setAttribute("aria-expanded", "true");
    els.cartDrawerBackdrop.hidden = false;
    els.savorCart.focus();
  }

  function closeCartDrawer() {
    els.savorCart.classList.remove("is-open");
    els.savorCart.setAttribute("aria-hidden", "true");
    els.cartDrawerToggle.setAttribute("aria-expanded", "false");
    els.cartDrawerBackdrop.hidden = true;
  }

  function showToast(message, variant) {
    const toast = document.createElement("div");
    toast.className = "toast" + (variant ? ` is-${variant}` : "");
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3600);
  }

  function handleItemListClick(event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const itemId = btn.dataset.id;
    if (!itemId) return;

    if (action === "inc") updateItemQuantity(itemId, 1);
    else if (action === "dec") updateItemQuantity(itemId, -1);
    else if (action === "remove") removeItem(itemId);
  }

  function bindEvents() {
    els.mobileMenuToggle.addEventListener("click", () => {
      const nextOpen = !els.primaryNav.classList.contains("is-open");
      els.primaryNav.classList.toggle("is-open", nextOpen);
      els.mobileMenuToggle.setAttribute("aria-expanded", String(nextOpen));
    });

    els.cartDrawerToggle.addEventListener("click", openCartDrawer);
    els.closeCartDrawer.addEventListener("click", closeCartDrawer);
    els.cartDrawerBackdrop.addEventListener("click", closeCartDrawer);

    els.drawerProceedBtn.addEventListener("click", () => {
      closeCartDrawer();
      els.customerName.focus();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.savorCart.classList.contains("is-open")) {
        closeCartDrawer();
      }
    });

    document.querySelectorAll('input[name="fulfillmentType"]').forEach((radio) => {
      radio.addEventListener("change", (event) => {
        state.fulfillmentType = event.target.value;
        updateFulfillmentUI();
      });
    });

    document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
      radio.addEventListener("change", (event) => {
        state.paymentMethod = event.target.value;
        updatePaymentUI();
      });
    });

    els.deliverySector.addEventListener("change", () => {
      clearFieldError(els.deliverySector, "deliverySectorError");
      renderTotals();
    });

    els.cardNumber.addEventListener("input", () => {
      const digits = els.cardNumber.value.replace(/\D/g, "").slice(0, 19);
      els.cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    });

    els.cardExpiry.addEventListener("input", () => {
      const digits = els.cardExpiry.value.replace(/\D/g, "").slice(0, 4);
      els.cardExpiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    });

    els.checkoutItemsList.addEventListener("click", handleItemListClick);
    els.drawerCartItems.addEventListener("click", handleItemListClick);

    els.loadSampleCartBtn.addEventListener("click", () => {
      state.cart = SAMPLE_TASTING_CART.map(normalizeCartItem);
      saveCart();
      renderAll();
      showToast("Loaded Chef's Tasting Sample into your bag.", "success");
    });

    els.applyPromoBtn.addEventListener("click", handleApplyPromo);
    els.promoCodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleApplyPromo();
      }
    });

    els.checkoutForm.addEventListener("submit", handleCheckoutSubmit);
    els.printReceiptBtn.addEventListener("click", () => window.print());

    window.addEventListener("storage", (event) => {
      if (event.key === CART_KEY) {
        loadCart();
        renderAll();
      }
    });
  }

  function init() {
    loadCart();
    updateFulfillmentUI();
    updatePaymentUI();
    renderAll();
    bindEvents();
  }

  init();
})();
