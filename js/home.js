/**
 * SavorSpot — Home Page (index.html) Script
 * Handles:
 *  1. Shared localStorage cart state ("savorCart") & Evening Menu Highlights Add-to-Bag
 *  2. Live #navCartCount badge & slide-over #savorCart drawer with +/- qty & PKR 4,500 delivery progress
 *  3. Responsive mobile navigation drawer, desktop "More" dropdown, & sticky header scroll state
 *  4. Toast notifications & cross-tab storage synchronization
 */

(() => {
  "use strict";

  const CART_STORAGE_KEY = "savorCart";
  const FREE_DELIVERY_THRESHOLD = 4500;

  /** Signature dishes featured in the Evening Menu Highlights section */
  const SIGNATURE_DISHES = [
    {
      id: "salt-range-lamb-rack",
      name: "Wood-Fired Salt Range Lamb Rack",
      category: "Wood-Fired Main",
      price: 6400,
      image: "images/dish-lamb-rack.jpg"
    },
    {
      id: "espresso-duck-magret",
      name: "Espresso-Glazed Duck Magret",
      category: "House Signature",
      price: 5200,
      image: "images/dish-duck-magret.jpg"
    },
    {
      id: "valrhona-espresso-torte",
      name: "70% Valrhona & Hazelnut Torte",
      category: "Patisserie Finale",
      price: 2150,
      image: "images/dish-valrhona-torte.jpg"
    }
  ];

  // Cached DOM References
  const siteHeader = document.getElementById("site-header");
  const eveningDishesGrid = document.getElementById("evening-dishes-grid");

  const navMoreToggle = document.getElementById("nav-more-toggle");
  const navMoreMenu = document.getElementById("nav-more-menu");

  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const cartCloseBtn = document.getElementById("cart-close-btn");
  const cartDrawer = document.getElementById("savorCart");
  const cartBackdrop = document.getElementById("cart-backdrop");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartCountBadge = document.getElementById("navCartCount");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartDeliveryBox = document.getElementById("cart-delivery-box");
  const cartDeliveryNote = document.getElementById("cart-delivery-note");
  const cartDeliveryProgress = document.getElementById("cart-delivery-progress");
  const cartCheckoutBtn = document.getElementById("cart-checkout-btn");
  const cartClearBtn = document.getElementById("cart-clear-btn");

  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileNavDrawer = document.getElementById("mobile-nav-drawer");
  const mobileNavBackdrop = document.getElementById("mobile-nav-backdrop");
  const mobileNavClose = document.getElementById("mobile-nav-close");

  const toastContainer = document.getElementById("toast-container");
  const footerYear = document.getElementById("footer-year");

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
    const dish = SIGNATURE_DISHES.find((entry) => entry.id === dishId);
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
        image: dish.image,
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
    void cartCountBadge.offsetWidth;
    cartCountBadge.classList.add("is-bumped");
    window.setTimeout(() => {
      cartCountBadge.classList.remove("is-bumped");
    }, 260);
  }

  /* ------------------------------------------------------------------------
     Render Cart Drawer (#savorCart) & Delivery Progress
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

    if (cartDeliveryBox && cartDeliveryNote && cartDeliveryProgress) {
      const progressPct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
      cartDeliveryProgress.style.width = `${progressPct}%`;

      if (subtotal >= FREE_DELIVERY_THRESHOLD) {
        cartDeliveryNote.textContent =
          "Complimentary insulated Islamabad delivery unlocked for this order.";
        cartDeliveryBox.classList.add("is-unlocked");
      } else if (subtotal > 0) {
        const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
        cartDeliveryNote.textContent = `Add ${formatPKR(remaining)} more for complimentary Islamabad delivery (PKR 4,500+).`;
        cartDeliveryBox.classList.remove("is-unlocked");
      } else {
        cartDeliveryNote.textContent =
          "Complimentary insulated dispatch in Islamabad on orders of PKR 4,500+.";
        cartDeliveryBox.classList.remove("is-unlocked");
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
          <p>Choose from our Evening Menu Highlights or explore the complete seasonal menu.</p>
          <a class="btn btn-secondary" href="pages/menu.html">Explore Full Menu</a>
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
     Drawer, Dropdown & Mobile Menu Controls
     ------------------------------------------------------------------------ */
  function closeMoreDropdown() {
    if (!navMoreToggle || !navMoreMenu) return;
    navMoreToggle.setAttribute("aria-expanded", "false");
    navMoreMenu.hidden = true;
  }

  function openCartDrawer() {
    if (!cartDrawer || !cartBackdrop) return;
    closeMoreDropdown();
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
    closeMoreDropdown();
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
    window.addEventListener(
      "scroll",
      () => {
        if (!siteHeader) return;
        siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
      },
      { passive: true }
    );

    // Desktop "More" dropdown toggle
    if (navMoreToggle && navMoreMenu) {
      navMoreToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = navMoreToggle.getAttribute("aria-expanded") === "true";
        navMoreToggle.setAttribute("aria-expanded", String(!isOpen));
        navMoreMenu.hidden = isOpen;
      });

      document.addEventListener("click", (event) => {
        if (!navMoreMenu.hidden && !event.target.closest(".nav-dropdown")) {
          closeMoreDropdown();
        }
      });
    }

    // Add to Bag delegation on Evening Menu Highlights grid
    if (eveningDishesGrid) {
      eveningDishesGrid.addEventListener("click", (event) => {
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
          showToast("Add at least one signature dish before proceeding to checkout.", "info");
          return;
        }
        window.location.href = "pages/checkout.html";
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

    document.querySelectorAll(".mobile-nav-link").forEach((link) => {
      link.addEventListener("click", () => closeMobileMenu(false));
    });

    // Global Escape key handler
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeMoreDropdown();
      if (cartDrawer && !cartDrawer.hidden) closeCartDrawer(true);
      if (mobileNavDrawer && !mobileNavDrawer.hidden) closeMobileMenu(true);
    });

    // Sync bag across tabs/pages
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
    renderCart();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
