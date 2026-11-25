/**
 * SavorSpot — Home Page (index.html) Script
 * Handles:
 *  1. Dynamic rendering & category filtering of Chef's Signature Dishes
 *  2. Slide-over Dining Bag / Cart Drawer synced with localStorage ("savorCart")
 *  3. Responsive mobile navigation drawer & header scroll state
 *  4. Toast notifications & placeholder group page feedback
 */

(() => {
  "use strict";

  const CART_STORAGE_KEY = "savorCart";
  const FREE_DELIVERY_THRESHOLD = 6000;

  /** @type {Array<{id: string, name: string, category: string, badge: string, description: string, price: number}>} */
  const FEATURED_DISHES = [
    {
      id: "wagyu-truffle-tartare",
      name: "Hand-Cut Wagyu & Black Truffle Tartare",
      category: "Artisanal Starters",
      badge: "Chef's Opening",
      description:
        "Dry-aged tenderloin diced to order, shaved Périgord truffle, cured egg yolk emulsion, caper berries, and toasted brioche soldiers.",
      price: 3450
    },
    {
      id: "saffron-lobster-veloute",
      name: "Roasted Lobster & Gilgit Saffron Velouté",
      category: "Artisanal Starters",
      badge: "Seasonal Reserve",
      description:
        "Slow-simmered shellfish bisque infused with northern saffron threads, charred fennel oil, and blistered sourdough crisp.",
      price: 2950
    },
    {
      id: "salt-range-lamb-rack",
      name: "Wood-Fired Rack of Salt Range Lamb",
      category: "Wood-Fired Mains",
      badge: "House Signature",
      description:
        "Herb-crusted prime rack seared over aged olive wood, paired with black garlic pomme purée, confit shallots, and rosemary jus.",
      price: 6400
    },
    {
      id: "espresso-duck-magret",
      name: "Espresso-Glazed Duck Magret",
      category: "Wood-Fired Mains",
      badge: "Guest Favorite",
      description:
        "Crisp-skinned duck breast lacquered in roasted Arabica reduction, spiced fig compote, and braised celeriac fondant.",
      price: 5650
    },
    {
      id: "cedar-miso-black-cod",
      name: "Charred Cedar & Miso Black Cod",
      category: "Coastal Reserve",
      badge: "Limited Catch",
      description:
        "Caramelized sablefish fillet over charred leek fondue, pickled sea fennel, crispy shallots, and warm citrus beurre blanc.",
      price: 5900
    },
    {
      id: "valrhona-espresso-torte",
      name: "70% Valrhona & Roasted Hazelnut Torte",
      category: "Patisserie",
      badge: "Pastry Finale",
      description:
        "Warm dark chocolate ganache, caramelized Piedmont hazelnut praline, single-origin espresso gelato, and delicate gold leaf.",
      price: 2150
    }
  ];

  // Cached DOM References
  const siteHeader = document.getElementById("site-header");
  const dishesGrid = document.getElementById("featured-dishes-grid");
  const filterButtons = document.querySelectorAll(".filter-pill");

  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const cartCloseBtn = document.getElementById("cart-close-btn");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartBackdrop = document.getElementById("cart-backdrop");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartCountBadge = document.getElementById("cart-count");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartDeliveryNote = document.getElementById("cart-delivery-note");
  const cartCheckoutBtn = document.getElementById("cart-checkout-btn");
  const cartClearBtn = document.getElementById("cart-clear-btn");

  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileNavDrawer = document.getElementById("mobile-nav-drawer");
  const mobileNavBackdrop = document.getElementById("mobile-nav-backdrop");
  const mobileNavClose = document.getElementById("mobile-nav-close");

  const toastContainer = document.getElementById("toast-container");
  const footerYear = document.getElementById("footer-year");

  let activeCategory = "all";

  /* ------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------ */
  function formatPKR(amount) {
    return `PKR ${Number(amount || 0).toLocaleString("en-PK")}`;
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  /* ------------------------------------------------------------------------
     Cart State (localStorage: "savorCart")
     ------------------------------------------------------------------------ */
  function readCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          Number.isFinite(Number(item.price)) &&
          Number(item.quantity) > 0
      );
    } catch {
      return [];
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      showToast("Unable to save your dining bag to local storage.", "info");
    }
    renderCart();
  }

  function addToCart(dishId) {
    const dish = FEATURED_DISHES.find((entry) => entry.id === dishId);
    if (!dish) return;

    const cart = readCart();
    const existing = cart.find((item) => item.id === dish.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: dish.id,
        name: dish.name,
        category: dish.category,
        price: dish.price,
        quantity: 1
      });
    }

    writeCart(cart);
    bumpCartBadge();
    showToast(`Added "${dish.name}" to your dining bag.`);
  }

  function updateItemQuantity(dishId, delta) {
    const cart = readCart();
    const targetIndex = cart.findIndex((item) => item.id === dishId);
    if (targetIndex === -1) return;

    const target = cart[targetIndex];
    const nextQty = Number(target.quantity) + delta;

    if (nextQty <= 0) {
      cart.splice(targetIndex, 1);
      writeCart(cart);
      showToast(`Removed "${target.name}" from your dining bag.`, "info");
      return;
    }

    target.quantity = nextQty;
    writeCart(cart);
  }

  function removeItemFromCart(dishId) {
    const cart = readCart();
    const target = cart.find((item) => item.id === dishId);
    const updated = cart.filter((item) => item.id !== dishId);
    writeCart(updated);
    if (target) {
      showToast(`Removed "${target.name}" from your dining bag.`, "info");
    }
  }

  function clearCart() {
    const cart = readCart();
    if (cart.length === 0) {
      showToast("Your dining bag is already empty.", "info");
      return;
    }
    writeCart([]);
    showToast("Your dining bag has been cleared.", "info");
  }

  function bumpCartBadge() {
    if (!cartCountBadge) return;
    cartCountBadge.classList.remove("is-bumped");
    // Trigger reflow to restart CSS scale pulse
    void cartCountBadge.offsetWidth;
    cartCountBadge.classList.add("is-bumped");
    window.setTimeout(() => {
      cartCountBadge.classList.remove("is-bumped");
    }, 260);
  }

  /* ------------------------------------------------------------------------
     Render Signature Dishes
     ------------------------------------------------------------------------ */
  function renderDishes(category = "all") {
    if (!dishesGrid) return;

    const filtered =
      category === "all"
        ? FEATURED_DISHES
        : FEATURED_DISHES.filter((dish) => dish.category === category);

    if (filtered.length === 0) {
      dishesGrid.innerHTML = `<p class="noscript-note">No signature dishes found in this selection.</p>`;
      return;
    }

    dishesGrid.innerHTML = filtered
      .map(
        (dish) => `
        <article class="dish-card" data-dish-id="${escapeHTML(dish.id)}">
          <div class="dish-card-top">
            <span class="dish-category">${escapeHTML(dish.category)}</span>
            <span class="dish-badge">${escapeHTML(dish.badge)}</span>
          </div>
          <h3 class="dish-name">${escapeHTML(dish.name)}</h3>
          <p class="dish-desc">${escapeHTML(dish.description)}</p>
          <div class="dish-card-footer">
            <div class="dish-price-group">
              <span class="dish-price-label">Chef's Plate</span>
              <span class="dish-price">${formatPKR(dish.price)}</span>
            </div>
            <button type="button" class="add-bag-btn" data-add-id="${escapeHTML(dish.id)}">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke-linecap="round"/>
              </svg>
              Add to Bag
            </button>
          </div>
        </article>
      `
      )
      .join("");
  }

  /* ------------------------------------------------------------------------
     Render Cart Drawer
     ------------------------------------------------------------------------ */
  function renderCart() {
    const cart = readCart();
    const totalCount = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    if (cartCountBadge) {
      cartCountBadge.textContent = String(totalCount);
    }

    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = formatPKR(subtotal);
    }

    if (cartDeliveryNote) {
      if (subtotal >= FREE_DELIVERY_THRESHOLD) {
        cartDeliveryNote.textContent =
          "Complimentary insulated Islamabad delivery unlocked for this order.";
        cartDeliveryNote.classList.add("is-unlocked");
      } else if (subtotal > 0) {
        const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
        cartDeliveryNote.textContent = `Add ${formatPKR(remaining)} more for complimentary insulated Islamabad delivery.`;
        cartDeliveryNote.classList.remove("is-unlocked");
      } else {
        cartDeliveryNote.textContent =
          "Complimentary insulated dispatch across Islamabad on orders above PKR 6,000.";
        cartDeliveryNote.classList.remove("is-unlocked");
      }
    }

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 7h12l1 13H5L6 7z"/>
              <path d="M9 7a3 3 0 0 1 6 0"/>
            </svg>
          </div>
          <h3>Your bag is awaiting selection</h3>
          <p>Choose from Chef Tariq's signature plates or explore the complete seasonal menu.</p>
          <a class="btn btn-secondary" href="pages/menu.html">Browse Full Menu</a>
        </div>
      `;
      return;
    }

    cartItemsContainer.innerHTML = cart
      .map((item) => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        return `
          <div class="cart-item" data-cart-id="${escapeHTML(item.id)}">
            <div class="cart-item-info">
              <span class="cart-item-cat">${escapeHTML(item.category || "Signature Plate")}</span>
              <h3 class="cart-item-name">${escapeHTML(item.name)}</h3>
              <span class="cart-item-unit">${formatPKR(item.price)} each</span>
            </div>
            <div class="cart-item-controls">
              <div class="qty-stepper" aria-label="Quantity controls for ${escapeHTML(item.name)}">
                <button type="button" class="qty-btn" data-qty-action="dec" data-id="${escapeHTML(item.id)}" aria-label="Decrease quantity of ${escapeHTML(item.name)}">&minus;</button>
                <span class="qty-value">${Number(item.quantity)}</span>
                <button type="button" class="qty-btn" data-qty-action="inc" data-id="${escapeHTML(item.id)}" aria-label="Increase quantity of ${escapeHTML(item.name)}">+</button>
              </div>
              <div class="cart-item-bottom">
                <span class="cart-line-total">${formatPKR(lineTotal)}</span>
                <button type="button" class="cart-remove-btn" data-remove-id="${escapeHTML(item.id)}">Remove</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /* ------------------------------------------------------------------------
     Drawer & Mobile Menu Controls
     ------------------------------------------------------------------------ */
  function openCartDrawer() {
    if (!cartDrawer || !cartBackdrop) return;
    closeMobileMenu(false);
    cartBackdrop.hidden = false;
    cartDrawer.hidden = false;
    requestAnimationFrame(() => {
      cartDrawer.classList.add("is-open");
    });
    document.body.classList.add("drawer-open");
    if (cartToggleBtn) cartToggleBtn.setAttribute("aria-expanded", "true");
    if (cartCloseBtn) cartCloseBtn.focus();
  }

  function closeCartDrawer(restoreFocus = true) {
    if (!cartDrawer || !cartBackdrop || cartDrawer.hidden) return;
    cartDrawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    if (cartToggleBtn) cartToggleBtn.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      cartDrawer.hidden = true;
      cartBackdrop.hidden = true;
    }, 320);
    if (restoreFocus && cartToggleBtn) cartToggleBtn.focus();
  }

  function openMobileMenu() {
    if (!mobileNavDrawer || !mobileNavBackdrop) return;
    closeCartDrawer(false);
    mobileNavBackdrop.hidden = false;
    mobileNavDrawer.hidden = false;
    requestAnimationFrame(() => {
      mobileNavDrawer.classList.add("is-open");
    });
    document.body.classList.add("drawer-open");
    if (mobileMenuToggle) mobileMenuToggle.setAttribute("aria-expanded", "true");
    if (mobileNavClose) mobileNavClose.focus();
  }

  function closeMobileMenu(restoreFocus = true) {
    if (!mobileNavDrawer || !mobileNavBackdrop || mobileNavDrawer.hidden) return;
    mobileNavDrawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    if (mobileMenuToggle) mobileMenuToggle.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      mobileNavDrawer.hidden = true;
      mobileNavBackdrop.hidden = true;
    }, 320);
    if (restoreFocus && mobileMenuToggle) mobileMenuToggle.focus();
  }

  /* ------------------------------------------------------------------------
     Toast Notifications
     ------------------------------------------------------------------------ */
  function showToast(message, variant = "gold") {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${variant}`;
    toast.setAttribute("role", "status");

    const dot = document.createElement("span");
    dot.className = "toast-dot";
    dot.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = message;

    toast.append(dot, text);
    toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => {
        toast.remove();
      }, 240);
    }, 3000);
  }

  /* ------------------------------------------------------------------------
     Event Listeners
     ------------------------------------------------------------------------ */
  function bindEvents() {
    // Sticky header scroll shadow
    window.addEventListener(
      "scroll",
      () => {
        if (!siteHeader) return;
        siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
      },
      { passive: true }
    );

    // Filter pills
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selected = btn.dataset.category || "all";
        if (selected === activeCategory) return;
        activeCategory = selected;

        filterButtons.forEach((pill) => {
          const isMatch = pill === btn;
          pill.classList.toggle("is-active", isMatch);
          pill.setAttribute("aria-selected", String(isMatch));
        });

        renderDishes(activeCategory);
      });
    });

    // Add to Bag delegation on signature grid
    if (dishesGrid) {
      dishesGrid.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-add-id]");
        if (!btn) return;
        addToCart(btn.dataset.addId);
      });
    }

    // Cart Drawer interactions
    if (cartToggleBtn) {
      cartToggleBtn.addEventListener("click", openCartDrawer);
    }
    if (cartCloseBtn) {
      cartCloseBtn.addEventListener("click", () => closeCartDrawer(true));
    }
    if (cartBackdrop) {
      cartBackdrop.addEventListener("click", () => closeCartDrawer(true));
    }

    if (cartItemsContainer) {
      cartItemsContainer.addEventListener("click", (event) => {
        const qtyBtn = event.target.closest("[data-qty-action]");
        if (qtyBtn) {
          const delta = qtyBtn.dataset.qtyAction === "inc" ? 1 : -1;
          updateItemQuantity(qtyBtn.dataset.id, delta);
          return;
        }

        const removeBtn = event.target.closest("[data-remove-id]");
        if (removeBtn) {
          removeItemFromCart(removeBtn.dataset.removeId);
        }
      });
    }

    if (cartClearBtn) {
      cartClearBtn.addEventListener("click", clearCart);
    }

    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener("click", () => {
        const cart = readCart();
        if (cart.length === 0) {
          showToast("Add at least one signature dish before checking out.", "info");
          return;
        }
        const subtotal = cart.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0
        );
        showToast(
          `Order draft saved (${formatPKR(subtotal)}). Continue to Menu or Deals to finalize.`
        );
      });
    }

    // Mobile Menu interactions
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener("click", () => {
        const isOpen = mobileMenuToggle.getAttribute("aria-expanded") === "true";
        if (isOpen) {
          closeMobileMenu(true);
        } else {
          openMobileMenu();
        }
      });
    }
    if (mobileNavClose) {
      mobileNavClose.addEventListener("click", () => closeMobileMenu(true));
    }
    if (mobileNavBackdrop) {
      mobileNavBackdrop.addEventListener("click", () => closeMobileMenu(true));
    }

    // Close mobile menu when clicking a link
    document.querySelectorAll(".mobile-nav-link").forEach((link) => {
      link.addEventListener("click", () => closeMobileMenu(false));
    });

    // Global Escape key handler
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (cartDrawer && !cartDrawer.hidden) closeCartDrawer(true);
      if (mobileNavDrawer && !mobileNavDrawer.hidden) closeMobileMenu(true);
    });

    // Keep cart synced across open tabs/pages
    window.addEventListener("storage", (event) => {
      if (event.key === CART_STORAGE_KEY) {
        renderCart();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Initialize
     ------------------------------------------------------------------------ */
  function init() {
    if (footerYear) {
      footerYear.textContent = String(new Date().getFullYear());
    }
    renderDishes("all");
    renderCart();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
