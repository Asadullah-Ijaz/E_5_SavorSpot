/* SavorSpot — Live Order Tracking Interactivity
   Integrates with localStorage ("savorOrders" & "savorCart") */

(function () {
  "use strict";

  const ORDERS_KEY = "savorOrders";
  const CART_KEY = "savorCart";

  const STAGE_NAMES = [
    "Confirmed",
    "Culinary Prep",
    "Quality & Packaging",
    "Final Dispatch"
  ];

  const DEMO_ORDERS = [
    {
      id: "SAV-DEMO-8421",
      reference: "SAV-DEMO-8421",
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      status: "Culinary Prep",
      stepIndex: 1,
      isDemo: true,
      fulfillmentType: "delivery",
      customer: {
        name: "Ayesha Siddiqui",
        phone: "0300-5550192",
        email: "ayesha@example.com"
      },
      delivery: {
        sector: "F-7 Markaz / F-7",
        street: "House 21, Street 14, Sector F-7/2",
        landmark: "Near Rana Market"
      },
      notes: "Medium-rare sear, extra espresso jus on the side",
      payment: { method: "cod", label: "Cash on Delivery (PKR)" },
      items: [
        {
          id: "sav-wagyu-ribeye",
          name: "Oak-Charred Ribeye & Espresso Jus",
          category: "Signature Grill",
          price: 3850,
          quantity: 1,
          lineTotal: 3850
        },
        {
          id: "sav-espresso-tiramisu",
          name: "Single-Origin Espresso Tiramisu",
          category: "Patisserie",
          price: 1150,
          quantity: 1,
          lineTotal: 1150
        }
      ],
      pricing: {
        subtotal: 5000,
        discount: 0,
        promoCode: null,
        deliveryFee: 0,
        total: 5000,
        currency: "PKR"
      }
    },
    {
      id: "SAV-DEMO-3190",
      reference: "SAV-DEMO-3190",
      createdAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
      status: "Quality & Packaging",
      stepIndex: 2,
      isDemo: true,
      fulfillmentType: "pickup",
      customer: {
        name: "Zainab Malik",
        phone: "0321-5550844",
        email: ""
      },
      delivery: {
        sector: "F-6 Markaz Lounge",
        street: "Street 7, Super Market",
        landmark: "Concierge Desk"
      },
      notes: "Collecting at 8:15 PM",
      payment: { method: "card", label: "Card ending in 4242", last4: "4242" },
      items: [
        {
          id: "sav-truffle-risotto",
          name: "Black Truffle Wild Mushroom Risotto",
          category: "Artisan Mains",
          price: 2150,
          quantity: 2,
          lineTotal: 4300
        }
      ],
      pricing: {
        subtotal: 4300,
        discount: 430,
        promoCode: "SAVOR10",
        deliveryFee: 0,
        total: 3870,
        currency: "PKR"
      }
    }
  ];

  const state = {
    savedOrders: [],
    demoOrders: DEMO_ORDERS.map((order) => ({ ...order })),
    activeOrder: null,
    cart: []
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

    orderLookupForm: document.getElementById("orderLookupForm"),
    orderLookupInput: document.getElementById("orderLookupInput"),
    lookupFeedback: document.getElementById("lookupFeedback"),
    quickOrdersList: document.getElementById("quickOrdersList"),

    noOrderSelectedPanel: document.getElementById("noOrderSelectedPanel"),
    trackedOrderContent: document.getElementById("trackedOrderContent"),
    trackedOrderSource: document.getElementById("trackedOrderSource"),
    trackedOrderRef: document.getElementById("trackedOrderRef"),
    trackedOrderTimestamp: document.getElementById("trackedOrderTimestamp"),
    trackedStatusBadge: document.getElementById("trackedStatusBadge"),
    trackedEtaText: document.getElementById("trackedEtaText"),
    timelineProgressBar: document.getElementById("timelineProgressBar"),
    statusTimeline: document.getElementById("statusTimeline"),
    finalStageTitle: document.getElementById("finalStageTitle"),
    finalStageDesc: document.getElementById("finalStageDesc"),
    advanceStatusBtn: document.getElementById("advanceStatusBtn"),
    resetStatusBtn: document.getElementById("resetStatusBtn"),

    trackedFulfillmentType: document.getElementById("trackedFulfillmentType"),
    trackedCustomerName: document.getElementById("trackedCustomerName"),
    trackedCustomerPhone: document.getElementById("trackedCustomerPhone"),
    trackedAddressLabel: document.getElementById("trackedAddressLabel"),
    trackedAddressValue: document.getElementById("trackedAddressValue"),
    trackedPaymentMethod: document.getElementById("trackedPaymentMethod"),
    trackedOrderNotes: document.getElementById("trackedOrderNotes"),

    trackedItemCount: document.getElementById("trackedItemCount"),
    trackedItemsList: document.getElementById("trackedItemsList"),
    trackedSubtotal: document.getElementById("trackedSubtotal"),
    trackedDiscountRow: document.getElementById("trackedDiscountRow"),
    trackedDiscount: document.getElementById("trackedDiscount"),
    trackedDeliveryFee: document.getElementById("trackedDeliveryFee"),
    trackedTotal: document.getElementById("trackedTotal"),

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

  function resolveStepIndex(order) {
    if (typeof order.stepIndex === "number" && order.stepIndex >= 0 && order.stepIndex <= 3) {
      return order.stepIndex;
    }
    const statusText = String(order.status || "").toLowerCase();
    if (statusText.includes("ready") || statusText.includes("delivery") || statusText.includes("dispatch") || statusText.includes("delivered")) {
      return 3;
    }
    if (statusText.includes("pack") || statusText.includes("quality")) {
      return 2;
    }
    if (statusText.includes("prep") || statusText.includes("cook") || statusText.includes("kitchen")) {
      return 1;
    }
    return 0;
  }

  function getStageLabel(stepIndex, fulfillmentType) {
    if (stepIndex === 3) {
      return fulfillmentType === "pickup" ? "Ready for Pickup" : "Out for Delivery";
    }
    return STAGE_NAMES[stepIndex] || "Confirmed";
  }

  function getEtaLabel(stepIndex, fulfillmentType) {
    if (fulfillmentType === "pickup") {
      if (stepIndex === 0) return "Est. 20–25 mins until pickup";
      if (stepIndex === 1) return "Est. 12–15 mins until pickup";
      if (stepIndex === 2) return "Est. 4–6 mins · Sealing now";
      return "Ready at F-6 Markaz Concierge Desk";
    }
    if (stepIndex === 0) return "Est. 35–45 mins until arrival";
    if (stepIndex === 1) return "Est. 25–30 mins until arrival";
    if (stepIndex === 2) return "Est. 15–20 mins · Rider assigning";
    return "Courier en route to your Islamabad sector";
  }

  function normalizeOrder(raw, isDemo = false) {
    const ref = String(raw.reference || raw.id || raw.orderId || "SAV-ORDER");
    const fulfillmentType = raw.fulfillmentType === "pickup" ? "pickup" : "delivery";
    const stepIndex = resolveStepIndex(raw);
    const items = Array.isArray(raw.items) ? raw.items : [];
    const computedSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity ?? item.qty ?? 1) || 1), 0);
    const pricing = raw.pricing || {
      subtotal: computedSubtotal,
      discount: 0,
      deliveryFee: 0,
      total: computedSubtotal
    };

    return {
      ...raw,
      id: ref,
      reference: ref,
      isDemo,
      fulfillmentType,
      stepIndex,
      status: getStageLabel(stepIndex, fulfillmentType),
      customer: raw.customer || { name: "SavorSpot Guest", phone: "—" },
      delivery: raw.delivery || { sector: "F-6 Markaz", street: "Islamabad" },
      payment: raw.payment || { label: "Cash on Delivery (PKR)" },
      items,
      pricing
    };
  }

  function loadOrders() {
    state.savedOrders = readStorageArray(ORDERS_KEY).map((item) => normalizeOrder(item, false));
  }

  function persistSavedOrder(updatedOrder) {
    if (updatedOrder.isDemo) return;
    const existing = readStorageArray(ORDERS_KEY);
    const idx = existing.findIndex(
      (item) => String(item.reference || item.id).toUpperCase() === updatedOrder.reference.toUpperCase()
    );
    if (idx !== -1) {
      existing[idx] = {
        ...existing[idx],
        status: updatedOrder.status,
        stepIndex: updatedOrder.stepIndex
      };
      try {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(existing));
      } catch (err) {
        showToast("Could not persist status update to browser storage.", "error");
      }
    }
  }

  function getAllAvailableOrders() {
    return [...state.savedOrders, ...state.demoOrders];
  }

  function findOrderByRef(rawRef) {
    const clean = String(rawRef || "").trim().toUpperCase();
    if (!clean) return null;
    return getAllAvailableOrders().find(
      (order) => order.reference.toUpperCase() === clean || String(order.id).toUpperCase() === clean
    ) || null;
  }

  function renderQuickOrderChips() {
    const allOrders = getAllAvailableOrders().slice(0, 6);
    els.quickOrdersList.innerHTML = "";

    allOrders.forEach((order) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quick-order-chip";
      if (state.activeOrder && state.activeOrder.reference === order.reference) {
        btn.classList.add("is-active");
      }
      btn.dataset.ref = order.reference;
      btn.innerHTML = `
        <span>${escapeHTML(order.reference)}</span>
        <span class="chip-tag">${order.isDemo ? "Demo" : "Saved"}</span>
      `;
      els.quickOrdersList.appendChild(btn);
    });
  }

  function renderTrackedOrder() {
    const order = state.activeOrder;

    if (!order) {
      els.trackedOrderContent.hidden = true;
      els.noOrderSelectedPanel.hidden = false;
      renderQuickOrderChips();
      return;
    }

    els.noOrderSelectedPanel.hidden = true;
    els.trackedOrderContent.hidden = false;

    const isPickup = order.fulfillmentType === "pickup";
    const stageIndex = order.stepIndex;
    const statusLabel = getStageLabel(stageIndex, order.fulfillmentType);

    els.trackedOrderSource.textContent = order.isDemo ? "Sample Demonstration Order" : "Your SavorSpot Order";
    els.trackedOrderRef.textContent = order.reference;
    els.orderLookupInput.value = order.reference;
    els.trackedOrderTimestamp.textContent = order.createdAt
      ? "Placed " + new Date(order.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })
      : "Placed Today";

    els.trackedStatusBadge.textContent = statusLabel;
    els.trackedStatusBadge.classList.toggle("is-complete", stageIndex === 3);
    els.trackedEtaText.textContent = getEtaLabel(stageIndex, order.fulfillmentType);

    els.finalStageTitle.textContent = isPickup ? "Ready for Pickup" : "Out for Delivery";
    els.finalStageDesc.textContent = isPickup
      ? "Sealed and waiting at SavorSpot Lounge, Street 7, F-6 Markaz."
      : `Dispatched with our Islamabad courier to ${order.delivery.sector || "your sector"}.`;

    const progressPct = ((stageIndex + 1) / 4) * 100;
    els.timelineProgressBar.style.width = `${progressPct}%`;

    els.statusTimeline.querySelectorAll(".timeline-step").forEach((stepEl) => {
      const idx = Number(stepEl.dataset.step);
      const stateLabelEl = stepEl.querySelector(".step-state-label");

      stepEl.classList.remove("is-complete", "is-active", "is-upcoming");
      if (idx < stageIndex) {
        stepEl.classList.add("is-complete");
        if (stateLabelEl) stateLabelEl.textContent = "Completed";
      } else if (idx === stageIndex) {
        stepEl.classList.add("is-active");
        if (stateLabelEl) stateLabelEl.textContent = idx === 3 ? "Current · Final" : "In Progress";
      } else {
        stepEl.classList.add("is-upcoming");
        if (stateLabelEl) stateLabelEl.textContent = "Pending";
      }
    });

    els.advanceStatusBtn.disabled = stageIndex >= 3;
    els.advanceStatusBtn.textContent = stageIndex >= 3 ? "Final Stage Reached" : "Advance Stage";
    els.resetStatusBtn.disabled = stageIndex === 0;

    els.trackedFulfillmentType.textContent = isPickup ? "F-6 Markaz Pickup" : "Chauffeur Delivery";
    els.trackedCustomerName.textContent = order.customer.name || "SavorSpot Guest";
    els.trackedCustomerPhone.textContent = order.customer.phone || "—";
    els.trackedAddressLabel.textContent = isPickup ? "Collection Lounge" : "Islamabad Destination";
    els.trackedAddressValue.textContent = isPickup
      ? "SavorSpot Lounge, Street 7, F-6 Markaz, Super Market, Islamabad"
      : `${order.delivery.street || ""}, ${order.delivery.sector || "Islamabad"}${order.delivery.landmark ? ` (${order.delivery.landmark})` : ""}`;
    els.trackedPaymentMethod.textContent = order.payment.label || "Cash on Delivery";
    els.trackedOrderNotes.textContent = order.notes || "No special instructions";

    const totalItems = order.items.reduce((sum, item) => sum + (Number(item.quantity ?? item.qty ?? 1) || 1), 0);
    els.trackedItemCount.textContent = totalItems === 1 ? "1 item" : `${totalItems} items`;

    els.trackedItemsList.innerHTML = "";
    order.items.forEach((item) => {
      const qty = Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);
      const price = Number(item.price) || 0;
      const lineTotal = item.lineTotal ?? price * qty;
      const li = document.createElement("li");
      li.className = "tracked-item-row";
      li.innerHTML = `
        <div>
          <p class="tracked-item-name">${escapeHTML(item.name || "SavorSpot Dish")}</p>
          <p class="tracked-item-meta">${escapeHTML(item.category || "F-6 Markaz Kitchen")} &times; ${qty}</p>
        </div>
        <span class="tracked-item-price">${escapeHTML(formatPKR(lineTotal))}</span>
      `;
      els.trackedItemsList.appendChild(li);
    });

    els.trackedSubtotal.textContent = formatPKR(order.pricing.subtotal);
    if (order.pricing.discount > 0) {
      els.trackedDiscountRow.hidden = false;
      els.trackedDiscount.textContent = "- " + formatPKR(order.pricing.discount);
    } else {
      els.trackedDiscountRow.hidden = true;
    }

    els.trackedDeliveryFee.textContent =
      order.pricing.deliveryFee === 0 ? "Complimentary (PKR 0)" : formatPKR(order.pricing.deliveryFee);
    els.trackedTotal.textContent = formatPKR(order.pricing.total);

    renderQuickOrderChips();
  }

  function selectOrder(ref, silent = false) {
    const match = findOrderByRef(ref);
    els.lookupFeedback.classList.remove("is-error", "is-success");

    if (!match) {
      state.activeOrder = null;
      els.lookupFeedback.textContent = `No order found matching "${String(ref).trim()}". Choose a recent reference below.`;
      els.lookupFeedback.classList.add("is-error");
      renderTrackedOrder();
      if (!silent) {
        showToast("Order reference not found.", "error");
      }
      return;
    }

    state.activeOrder = match;
    els.lookupFeedback.textContent = `Tracking ${match.reference} · ${match.status}`;
    els.lookupFeedback.classList.add("is-success");
    renderTrackedOrder();
    if (!silent) {
      showToast(`Loaded tracking for ${match.reference}.`, "success");
    }
  }

  /* Cart Drawer Sync ("savorCart") */
  function normalizeCartItem(item, index) {
    return {
      ...item,
      id: String(item.id ?? item.slug ?? `item-${index + 1}`),
      name: String(item.name || item.title || "SavorSpot Selection"),
      category: String(item.category || "F-6 Markaz Kitchen"),
      price: Math.max(0, Number(item.price) || 0),
      quantity: Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10) || 1)
    };
  }

  function loadCart() {
    state.cart = readStorageArray(CART_KEY).map(normalizeCartItem);
  }

  function saveCart() {
    try {
      const serialized = state.cart.map((item) => {
        const record = { ...item, quantity: item.quantity };
        if ("qty" in record) record.qty = item.quantity;
        return record;
      });
      localStorage.setItem(CART_KEY, JSON.stringify(serialized));
    } catch (err) {
      showToast("Unable to update bag in browser storage.", "error");
    }
  }

  function updateCartItemQty(itemId, delta) {
    const target = state.cart.find((item) => item.id === itemId);
    if (!target) return;
    const nextQty = target.quantity + delta;
    if (nextQty <= 0) {
      removeCartItem(itemId);
      return;
    }
    target.quantity = nextQty;
    saveCart();
    renderCartDrawer();
  }

  function removeCartItem(itemId) {
    const removed = state.cart.find((item) => item.id === itemId);
    state.cart = state.cart.filter((item) => item.id !== itemId);
    saveCart();
    renderCartDrawer();
    if (removed) {
      showToast(`Removed "${removed.name}" from your bag.`);
    }
  }

  function renderCartDrawer() {
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    els.cartCountBadge.textContent = String(totalCount);
    els.drawerSubtotal.textContent = formatPKR(subtotal);
    els.drawerCartItems.innerHTML = "";

    if (state.cart.length === 0) {
      els.drawerCartItems.innerHTML = `
        <div class="drawer-empty">
          <h3>Your bag is empty</h3>
          <p>Explore our F-6 Markaz menu or head to checkout when ready.</p>
        </div>
      `;
      return;
    }

    state.cart.forEach((item) => {
      const article = document.createElement("article");
      article.className = "drawer-item";
      article.innerHTML = `
        <div class="drawer-item-thumb">${escapeHTML(item.name.charAt(0).toUpperCase() || "S")}</div>
        <div>
          <h3 class="drawer-item-title">${escapeHTML(item.name)}</h3>
          <p class="drawer-item-meta">${escapeHTML(item.category)} · ${escapeHTML(formatPKR(item.price))}</p>
        </div>
        <div class="drawer-item-controls">
          <span class="drawer-item-price">${escapeHTML(formatPKR(item.price * item.quantity))}</span>
          <div class="qty-bar">
            <button type="button" class="qty-btn" data-action="dec" data-id="${escapeHTML(item.id)}" aria-label="Decrease quantity of ${escapeHTML(item.name)}">&minus;</button>
            <span class="qty-value">${item.quantity}</span>
            <button type="button" class="qty-btn" data-action="inc" data-id="${escapeHTML(item.id)}" aria-label="Increase quantity of ${escapeHTML(item.name)}">+</button>
          </div>
          <button type="button" class="remove-item-btn" data-action="remove" data-id="${escapeHTML(item.id)}">Remove</button>
        </div>
      `;
      els.drawerCartItems.appendChild(article);
    });
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
    window.setTimeout(() => toast.remove(), 3400);
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

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.savorCart.classList.contains("is-open")) {
        closeCartDrawer();
      }
    });

    els.drawerCartItems.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (!id) return;
      if (action === "inc") updateCartItemQty(id, 1);
      else if (action === "dec") updateCartItemQty(id, -1);
      else if (action === "remove") removeCartItem(id);
    });

    els.orderLookupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const ref = els.orderLookupInput.value.trim();
      if (!ref) {
        els.lookupFeedback.textContent = "Enter an order reference number to track.";
        els.lookupFeedback.classList.remove("is-success");
        els.lookupFeedback.classList.add("is-error");
        els.orderLookupInput.focus();
        return;
      }
      selectOrder(ref);
    });

    els.quickOrdersList.addEventListener("click", (event) => {
      const chip = event.target.closest("button[data-ref]");
      if (!chip) return;
      selectOrder(chip.dataset.ref);
    });

    els.advanceStatusBtn.addEventListener("click", () => {
      if (!state.activeOrder || state.activeOrder.stepIndex >= 3) return;
      state.activeOrder.stepIndex += 1;
      state.activeOrder.status = getStageLabel(state.activeOrder.stepIndex, state.activeOrder.fulfillmentType);
      persistSavedOrder(state.activeOrder);
      renderTrackedOrder();
      showToast(`Order ${state.activeOrder.reference} updated to "${state.activeOrder.status}".`, "success");
    });

    els.resetStatusBtn.addEventListener("click", () => {
      if (!state.activeOrder || state.activeOrder.stepIndex === 0) return;
      state.activeOrder.stepIndex = 0;
      state.activeOrder.status = getStageLabel(0, state.activeOrder.fulfillmentType);
      persistSavedOrder(state.activeOrder);
      renderTrackedOrder();
      showToast(`Order ${state.activeOrder.reference} reset to Confirmed.`);
    });

    window.addEventListener("storage", (event) => {
      if (event.key === CART_KEY) {
        loadCart();
        renderCartDrawer();
      } else if (event.key === ORDERS_KEY) {
        loadOrders();
        if (state.activeOrder) {
          const refreshed = findOrderByRef(state.activeOrder.reference);
          if (refreshed) state.activeOrder = refreshed;
        }
        renderTrackedOrder();
      }
    });
  }

  function init() {
    loadCart();
    loadOrders();
    renderCartDrawer();

    const params = new URLSearchParams(window.location.search);
    const queryRef = params.get("ref") || params.get("orderId") || params.get("id");

    if (queryRef) {
      selectOrder(queryRef, true);
    } else if (state.savedOrders.length > 0) {
      selectOrder(state.savedOrders[0].reference, true);
    } else {
      selectOrder(state.demoOrders[0].reference, true);
    }

    bindEvents();
  }

  init();
})();
