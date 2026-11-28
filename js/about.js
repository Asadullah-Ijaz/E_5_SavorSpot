/* ==========================================================================
   SavorSpot — About / Culinary Story & Shared Cart Sync (js/about.js)
   ========================================================================== */

(() => {
  "use strict";

  const STORAGE_KEYS = {
    CART: "savorCart"
  };

  const MILESTONES = {
    "2021": {
      badge: "2021 · Chapter I",
      category: "Roastery",
      title: "The Street 7 Espresso Bar",
      narrative:
        "SavorSpot began as an intimate twelve-seat espresso counter in F-6 Markaz dedicated to proving dark-roasted coffee could be syrupy, aromatic, and naturally sweet without bitterness.",
      creation: "Obsidian Velvet Double Ristretto",
      notes: "Roasted cacao nib, toasted hazelnut, dark caramel",
      pairing: "Warm Espresso Brioche & Smoked Sea-Salt Butter"
    },
    "2022": {
      badge: "2022 · Chapter II",
      category: "Culinary",
      title: "Lighting the Obsidian Hearth",
      narrative:
        "Commissioning our custom oak-and-charcoal hearth allowed the kitchen to pair live-fire searing with 48-hour fermented sourdough flatbreads and deeply roasted marrow glazes.",
      creation: "Hearth-Charred Ribeye with Espresso Jus",
      notes: "Margalla oak smoke, black garlic, crushed Tellicherry pepper",
      pairing: "Cold-Brewed Hibiscus & Burnt Tamarind Cooler"
    },
    "2023": {
      badge: "2023 · Chapter III",
      category: "Hospitality",
      title: "Opening the Lantern Courtyard",
      narrative:
        "We extended Plot 14 into an olive-tree courtyard beneath a retractable pergola, introducing ambient fire tables and tableside cold-brew trolleys for Islamabad evenings.",
      creation: "Twilight Courtyard Aperitif Service",
      notes: "Green cardamom mist, charred rosemary, cold-extracted Arabica",
      pairing: "Cedar-Smoked Lamb Skewers & Mint Labneh Flatbread"
    },
    "2024": {
      badge: "2024 · Chapter IV",
      category: "Culinary",
      title: "Dry-Aging & Seasonal Harvest Flights",
      narrative:
        "Our dedicated aging chamber came online alongside quarterly five-course tasting flights built around Swat orchard produce, wild mountain morels, and Potohar heritage grains.",
      creation: "28-Day Dry-Aged Striploin & Morel Reduction",
      notes: "Earthy woodland mushroom, browned butter, aged beef richness",
      pairing: "Single-Origin Pour-Over & Dark Fig Tartlet"
    },
    "2025": {
      badge: "2025 · Chapter V",
      category: "Hospitality",
      title: "The Chef's Private Salon",
      narrative:
        "We unveiled our sound-insulated sixteen-seat walnut and marble salon, crafted for milestone family dinners, anniversary tastings, and diplomatic hosting in F-6 Markaz.",
      creation: "Bespoke 5-Course Private Salon Tasting",
      notes: "Tailored seasonal courses with hand-calligraphed menu keepsakes",
      pairing: "Reserve Espresso Flight & Saffron Panna Cotta"
    },
    "2026": {
      badge: "2026 · Chapter VI",
      category: "Roastery",
      title: "Reserve Pour-Over Atelier",
      narrative:
        "Our roastery launched numbered micro-lot highland releases prepared tableside, uniting specialty coffee craftsmanship with late-evening dessert and espresso pairings.",
      creation: "Numbered Highland Reserve Pour-Over",
      notes: "Bergamot peel, dark cocoa, honeyed stone fruit",
      pairing: "Obsidian Espresso Tiramisu & Candied Ginger"
    }
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

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
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
      }
    });

    renderCart();
  }

  /* --------------------------------------------------------------------------
     Philosophy Pillar Tabs (Accessible Tablist)
     -------------------------------------------------------------------------- */
  function initPhilosophyTabs() {
    const tabs = Array.from(document.querySelectorAll(".pillar-tab"));
    const panels = Array.from(document.querySelectorAll(".pillar-panel"));
    if (tabs.length === 0 || panels.length === 0) return;

    const activateTab = (targetTab, shouldFocus = false) => {
      const targetPanelId = targetTab.getAttribute("aria-controls");

      tabs.forEach((tab) => {
        const isMatch = tab === targetTab;
        tab.classList.toggle("is-active", isMatch);
        tab.setAttribute("aria-selected", String(isMatch));
        tab.setAttribute("tabindex", isMatch ? "0" : "-1");
      });

      panels.forEach((panel) => {
        const isMatch = panel.id === targetPanelId;
        panel.classList.toggle("is-active", isMatch);
        panel.hidden = !isMatch;
      });

      if (shouldFocus) {
        targetTab.focus();
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        activateTab(tab, false);
      });

      tab.addEventListener("keydown", (event) => {
        let nextIndex = null;
        if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft") {
          nextIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = tabs.length - 1;
        }

        if (nextIndex !== null) {
          event.preventDefault();
          activateTab(tabs[nextIndex], true);
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     Leadership Craft Note Toggles
     -------------------------------------------------------------------------- */
  function initLeadershipNotes() {
    const toggleButtons = document.querySelectorAll("[data-leader-toggle]");
    if (toggleButtons.length === 0) return;

    toggleButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-leader-toggle");
        const noteEl = targetId ? document.getElementById(targetId) : null;
        if (!noteEl) return;

        const willExpand = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(willExpand));
        noteEl.hidden = !willExpand;
      });
    });
  }

  /* --------------------------------------------------------------------------
     Interactive Tasting Milestones & Filter Chips
     -------------------------------------------------------------------------- */
  function initMilestones() {
    const filterButtons = Array.from(document.querySelectorAll("[data-milestone-filter]"));
    const milestoneItems = Array.from(document.querySelectorAll(".milestone-item"));
    const selectButtons = Array.from(document.querySelectorAll("[data-milestone-select]"));

    const spotlight = {
      year: document.getElementById("spotlightYear"),
      category: document.getElementById("spotlightCategory"),
      title: document.getElementById("spotlightTitle"),
      narrative: document.getElementById("spotlightNarrative"),
      creation: document.getElementById("spotlightCreation"),
      notes: document.getElementById("spotlightNotes"),
      pairing: document.getElementById("spotlightPairing")
    };

    if (milestoneItems.length === 0 || !spotlight.title) return;

    const selectMilestone = (milestoneId, announceToast = false) => {
      const data = MILESTONES[milestoneId];
      if (!data) return;

      milestoneItems.forEach((item) => {
        const isMatch = item.dataset.milestoneId === milestoneId;
        item.classList.toggle("is-selected", isMatch);
        const trigger = item.querySelector("[data-milestone-select]");
        if (trigger) trigger.setAttribute("aria-pressed", String(isMatch));
      });

      if (spotlight.year) spotlight.year.textContent = data.badge;
      if (spotlight.category) spotlight.category.textContent = data.category;
      spotlight.title.textContent = data.title;
      if (spotlight.narrative) spotlight.narrative.textContent = data.narrative;
      if (spotlight.creation) spotlight.creation.textContent = data.creation;
      if (spotlight.notes) spotlight.notes.textContent = data.notes;
      if (spotlight.pairing) spotlight.pairing.textContent = data.pairing;

      if (announceToast) {
        showToast(`${data.badge}: ${data.title}`);
      }
    };

    selectButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const milestoneId = btn.getAttribute("data-milestone-select");
        if (milestoneId) selectMilestone(milestoneId, true);
      });
    });

    filterButtons.forEach((chip) => {
      chip.addEventListener("click", () => {
        const category = chip.getAttribute("data-milestone-filter") || "all";

        filterButtons.forEach((btn) => {
          const active = btn === chip;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });

        let firstVisibleId = null;
        let currentVisible = false;

        milestoneItems.forEach((item) => {
          const matches = category === "all" || item.dataset.category === category;
          item.hidden = !matches;
          if (matches) {
            if (!firstVisibleId) firstVisibleId = item.dataset.milestoneId;
            if (item.classList.contains("is-selected")) currentVisible = true;
          }
        });

        if (!currentVisible && firstVisibleId) {
          selectMilestone(firstVisibleId, false);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const yearEl = document.getElementById("footerYear");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    initMobileNav();
    initCartDrawer();
    initPhilosophyTabs();
    initLeadershipNotes();
    initMilestones();
  });
})();
