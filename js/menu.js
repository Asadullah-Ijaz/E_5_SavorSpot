/**
 * SavorSpot — Menu Page (pages/menu.html) Script
 * Handles:
 *  1. Full seasonal menu catalog across Signature Mains, Small Plates, Desserts, & Beverages
 *  2. Category pill filtering & live search query filtering (name, description, ingredients, tags)
 *  3. Shared localStorage cart state ("savorCart"), #navCartCount badge, & #savorCart slide-over drawer
 *  4. Responsive mobile navigation drawer, desktop "More" dropdown, toast alerts, & storage sync
 */

(() => {
  "use strict";

  const CART_STORAGE_KEY = "savorCart";
  const FREE_DELIVERY_THRESHOLD = 4500;

  /**
   * Builds a bespoke obsidian-and-gold SVG illustration data URI for dishes
   * that do not map to a dedicated photograph in images/, avoiding 404 requests.
   */
  function createCourseIllustration(monogram, subtitle, motifType) {
    const motifMap = {
      plate:
        '<circle cx="200" cy="145" r="74" stroke="#d4af37" stroke-opacity="0.35" stroke-width="1.2"/><circle cx="200" cy="145" r="56" stroke="#e7c68e" stroke-opacity="0.65" stroke-width="1" stroke-dasharray="4 5"/>',
      coupe:
        '<path d="M164 108h72c-2 29-16 48-36 48s-34-19-36-48Z" stroke="#e7c68e" stroke-opacity="0.7" stroke-width="1.4"/><path d="M200 156v42M178 198h44" stroke="#d4af37" stroke-opacity="0.6" stroke-width="1.4" stroke-linecap="round"/>',
      pastry:
        '<path d="M144 176l56-68 56 68H144Z" stroke="#e7c68e" stroke-opacity="0.65" stroke-width="1.3" stroke-linejoin="round"/><circle cx="200" cy="148" r="46" stroke="#d4af37" stroke-opacity="0.28" stroke-width="1"/>'
    };

    const motif = motifMap[motifType] || motifMap.plate;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stop-color="#2a2019"/>
          <stop offset="58%" stop-color="#15100d"/>
          <stop offset="100%" stop-color="#0a0807"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <rect x="16" y="16" width="368" height="268" rx="8" fill="none" stroke="#d4af37" stroke-opacity="0.22" stroke-width="1"/>
      ${motif}
      <text x="200" y="156" text-anchor="middle" fill="#e7c68e" font-family="Georgia, serif" font-size="34" font-style="italic">${monogram}</text>
      <text x="200" y="246" text-anchor="middle" fill="#c5b8a8" font-family="sans-serif" font-size="11" letter-spacing="3">${subtitle.toUpperCase()}</text>
    </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  /** Complete SavorSpot Islamabad seasonal menu catalog */
  const MENU_DISHES = [
    // Signature Mains
    {
      id: "salt-range-lamb-rack",
      name: "Wood-Fired Salt Range Lamb Rack",
      category: "Signature Mains",
      tag: "Wood-Fired Main",
      price: 6400,
      image: "images/dish-lamb-rack.jpg",
      previewSrc: "../images/dish-lamb-rack.jpg",
      description:
        "Herb-crusted prime rack seared over aged olive wood, paired with black garlic pomme purée, confit shallots, and 18-hour rosemary jus.",
      ingredients: "Salt Range lamb rack, black garlic, olive wood ember, rosemary jus, confit shallots",
      priceLabel: "Chef's Plate"
    },
    {
      id: "espresso-duck-magret",
      name: "Espresso-Glazed Duck Magret",
      category: "Signature Mains",
      tag: "House Signature",
      price: 5200,
      image: "images/dish-duck-magret.jpg",
      previewSrc: "../images/dish-duck-magret.jpg",
      description:
        "Crisp-skinned duck breast lacquered in single-origin Arabica reduction, served alongside spiced fig compote and braised celeriac fondant.",
      ingredients: "Duck magret, single-origin Arabica glaze, black fig compote, celeriac fondant",
      priceLabel: "Chef's Plate"
    },
    {
      id: "hearth-charred-ribeye",
      name: "Hearth-Charred Ribeye & Marrow Jus",
      category: "Signature Mains",
      tag: "Prime Cut",
      price: 7850,
      image: "images/hero-feast.jpg",
      previewSrc: "../images/hero-feast.jpg",
      description:
        "28-day dry-aged prime ribeye kissed by live embers, finished with smoked sea salt, charred baby leeks, and roasted bone marrow demi-glace.",
      ingredients: "Dry-aged ribeye, roasted bone marrow, charred leeks, Sarawak peppercorn jus",
      priceLabel: "320g Cut"
    },
    {
      id: "gilgit-saffron-seabass",
      name: "Gilgit Saffron & White Miso Sea Bass",
      category: "Signature Mains",
      tag: "Coastal Hearth",
      price: 6900,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("SB", "Gilgit Saffron • Sea Bass", "plate"),
      description:
        "Pan-roasted Chilean sea bass glazed in delicate white miso, served over braised fennel bulb and luminous Gilgit saffron velouté.",
      ingredients: "Chilean sea bass, Gilgit saffron, white miso, braised fennel, preserved lemon",
      priceLabel: "Chef's Plate"
    },

    // Small Plates
    {
      id: "swat-morel-truffle-tartlet",
      name: "Black Truffle & Swat Morel Tartlet",
      category: "Small Plates",
      tag: "Foraged Start",
      price: 2450,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("MT", "Swat Morels • Truffle", "plate"),
      description:
        "Crisp buckwheat tartlet filled with sautéed Swat valley wild morels, whipped aged Comté mousse, shaved black truffle, and lemon thyme oil.",
      ingredients: "Swat wild morels, black truffle, aged Comté, buckwheat pastry, thyme oil",
      priceLabel: "2 Pieces"
    },
    {
      id: "smoked-burrata-roasted-fig",
      name: "Olive-Wood Smoked Burrata & Fig",
      category: "Small Plates",
      tag: "Artisanal Cold",
      price: 2650,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("BF", "Smoked Burrata • Fig", "plate"),
      description:
        "Creamy artisanal burrata infused with cold olive-wood smoke, Margalla wildflower honey, blistered black figs, and toasted pistachio dukkah.",
      ingredients: "Artisanal burrata, Margalla wild honey, black figs, roasted pistachio dukkah",
      priceLabel: "Starter"
    },
    {
      id: "charred-octopus-rose-harissa",
      name: "Charred Octopus & Rose Harissa",
      category: "Small Plates",
      tag: "Hearth Starter",
      price: 3200,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("OH", "Charred Octopus • Harissa", "plate"),
      description:
        "Tender wood-grilled octopus resting over smoked chickpea mousseline, house rose harissa oil, crispy capers, and charred lemon.",
      ingredients: "Grilled octopus, smoked chickpea, Damask rose harissa, crispy capers",
      priceLabel: "Starter"
    },
    {
      id: "seared-tenderloin-carpaccio",
      name: "Seared Beef Carpaccio & Black Garlic",
      category: "Small Plates",
      tag: "Cured & Seared",
      price: 2950,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("BC", "Beef Carpaccio • Garlic", "plate"),
      description:
        "Paper-thin seared prime tenderloin crowned with 24-month aged Parmigiano shards, black garlic emulsion, wild rocket, and walnut oil.",
      ingredients: "Prime beef tenderloin, black garlic aioli, Parmigiano Reggiano, walnut oil",
      priceLabel: "Starter"
    },

    // Desserts
    {
      id: "valrhona-espresso-torte",
      name: "70% Valrhona & Hazelnut Torte",
      category: "Desserts",
      tag: "Patisserie Finale",
      price: 2150,
      image: "images/dish-valrhona-torte.jpg",
      previewSrc: "../images/dish-valrhona-torte.jpg",
      description:
        "Warm dark chocolate ganache, caramelized hazelnut praline, house-churned espresso gelato, and delicate edible gold leaf.",
      ingredients: "70% Valrhona couverture, roasted hazelnut praline, espresso gelato, gold leaf",
      priceLabel: "Patisserie"
    },
    {
      id: "saffron-pistachio-millefeuille",
      name: "Saffron & Pistachio Mille-Feuille",
      category: "Desserts",
      tag: "Artisanal Pastry",
      price: 1950,
      image: "images/dish-valrhona-torte.jpg",
      previewSrc: createCourseIllustration("MF", "Saffron • Pistachio", "pastry"),
      description:
        "Caramelized inverted puff pastry layered with Gilgit saffron diplomat cream, green cardamom chantilly, and crushed roasted pistachios.",
      ingredients: "Inverted puff pastry, Gilgit saffron, green cardamom, roasted pistachios",
      priceLabel: "Patisserie"
    },
    {
      id: "burnt-honey-espresso-panna",
      name: "Margalla Burnt Honey Panna Cotta",
      category: "Desserts",
      tag: "Salon Classic",
      price: 1750,
      image: "images/dish-valrhona-torte.jpg",
      previewSrc: createCourseIllustration("PC", "Burnt Honey • Espresso", "pastry"),
      description:
        "Silky single-origin espresso cream set gently and finished with torched Margalla wild honey tuile, sea-salt caramel, and cocoa nib crumble.",
      ingredients: "Single-origin espresso, Margalla wild honey, sea-salt caramel, cacao nibs",
      priceLabel: "Patisserie"
    },

    // Beverages
    {
      id: "smoked-rosemary-espresso-tonic",
      name: "Smoked Rosemary Espresso Tonic",
      category: "Beverages",
      tag: "Zero-Proof Craft",
      price: 950,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("ET", "Rosemary • Espresso", "coupe"),
      description:
        "Double ristretto of Ethiopian Yirgacheffe pulled over crisp botanical tonic water, charred rosemary smoke, and candied blood orange.",
      ingredients: "Ethiopian ristretto, botanical quinine tonic, charred rosemary, blood orange",
      priceLabel: "Zero-Proof"
    },
    {
      id: "saffron-damask-rose-spritz",
      name: "Gilgit Saffron & Damask Rose Spritz",
      category: "Beverages",
      tag: "Botanical Infusion",
      price: 1100,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("RS", "Saffron • Damask Rose", "coupe"),
      description:
        "Cold-brewed white tea infused with Gilgit saffron threads, aromatic Damask rosewater, sparkling spring water, and pink peppercorn.",
      ingredients: "Silver needle white tea, Gilgit saffron, Damask rosewater, pink peppercorn",
      priceLabel: "Zero-Proof"
    },
    {
      id: "obsidian-reserve-pourover",
      name: "Obsidian Reserve Pour-Over & Truffle",
      category: "Beverages",
      tag: "House Roastery",
      price: 1250,
      image: "images/ambiance-dining.jpg",
      previewSrc: createCourseIllustration("OR", "Single-Origin Roast", "coupe"),
      description:
        "Hand-poured single-origin Arabica served with spiced cardamom demerara syrup and a house-made 70% dark chocolate espresso truffle.",
      ingredients: "Single-origin Arabica, green cardamom syrup, 70% Valrhona espresso truffle",
      priceLabel: "Roastery"
    }
  ];

  // State
  let activeCategory = "All";
  let searchQuery = "";

  // Cached DOM References
  const siteHeader = document.getElementById("site-header");
  const filterPillsContainer = document.getElementById("menu-filter-pills");
  const searchInput = document.getElementById("menu-search-input");
  const searchClearBtn = document.getElementById("menu-search-clear");
  const resultsCountEl = document.getElementById("menu-results-count");
  const dishesGrid = document.getElementById("menu-dishes-grid");
  const emptyStateEl = document.getElementById("menu-empty-state");
  const emptyMessageEl = document.getElementById("menu-empty-message");
  const resetBtn = document.getElementById("menu-reset-btn");

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
     Menu Filtering & Rendering
     ------------------------------------------------------------------------ */
  function getFilteredDishes() {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return MENU_DISHES.filter((dish) => {
      const matchesCategory = activeCategory === "All" || dish.category === activeCategory;
      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      const searchableText = [
        dish.name,
        dish.category,
        dish.tag,
        dish.description,
        dish.ingredients
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }

  function renderDishGrid() {
    if (!dishesGrid) return;

    const filtered = getFilteredDishes();
    const totalCount = MENU_DISHES.length;

    if (resultsCountEl) {
      const dishNoun = filtered.length === 1 ? "dish" : "dishes";
      if (activeCategory === "All" && !searchQuery.trim()) {
        resultsCountEl.innerHTML = `Showing all <strong>${totalCount}</strong> seasonal dishes`;
      } else if (searchQuery.trim()) {
        resultsCountEl.innerHTML = `Showing <strong>${filtered.length}</strong> ${dishNoun} in <strong>${escapeHTML(activeCategory)}</strong> matching &ldquo;${escapeHTML(searchQuery.trim())}&rdquo;`;
      } else {
        resultsCountEl.innerHTML = `Showing <strong>${filtered.length}</strong> ${dishNoun} in <strong>${escapeHTML(activeCategory)}</strong>`;
      }
    }

    if (filtered.length === 0) {
      dishesGrid.innerHTML = "";
      dishesGrid.hidden = true;
      if (emptyStateEl) {
        emptyStateEl.hidden = false;
      }
      if (emptyMessageEl) {
        emptyMessageEl.textContent = searchQuery.trim()
          ? `No dishes matched "${searchQuery.trim()}" under ${activeCategory}. Try another ingredient or reset filters.`
          : `No dishes are currently listed under ${activeCategory}.`;
      }
      return;
    }

    dishesGrid.hidden = false;
    if (emptyStateEl) {
      emptyStateEl.hidden = true;
    }

    dishesGrid.innerHTML = filtered
      .map((dish, index) => {
        const delayMs = Math.min(index * 40, 240);
        return `
          <article class="dish-card" data-dish-id="${escapeHTML(dish.id)}" style="animation-delay: ${delayMs}ms">
            <div class="dish-media">
              <img
                src="${escapeHTML(dish.previewSrc)}"
                alt="${escapeHTML(dish.name)} — ${escapeHTML(dish.category)}"
                class="dish-img"
                loading="lazy"
                onerror="this.parentElement.classList.add('is-fallback'); this.remove();"
              >
              <div class="dish-fallback" aria-hidden="true"><span>${escapeHTML(dish.tag)}</span></div>
              <div class="dish-badges">
                <span class="dish-tag">${escapeHTML(dish.tag)}</span>
                <span class="dish-category-pill">${escapeHTML(dish.category)}</span>
              </div>
            </div>
            <div class="dish-body">
              <h3 class="dish-name">${escapeHTML(dish.name)}</h3>
              <p class="dish-desc">${escapeHTML(dish.description)}</p>
              <p class="dish-ingredients"><strong>Notes:</strong> ${escapeHTML(dish.ingredients)}</p>
              <div class="dish-card-footer">
                <div class="dish-price-group">
                  <span class="dish-price-label">${escapeHTML(dish.priceLabel || "Chef's Plate")}</span>
                  <span class="dish-price">${formatPKR(dish.price)}</span>
                </div>
                <button type="button" class="add-bag-btn" data-add-id="${escapeHTML(dish.id)}">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" stroke-linecap="round"/>
                  </svg>
                  <span>Add to Bag</span>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function setCategory(nextCategory) {
    activeCategory = nextCategory;
    if (filterPillsContainer) {
      filterPillsContainer.querySelectorAll(".filter-pill").forEach((pill) => {
        const isSelected = pill.dataset.category === nextCategory;
        pill.classList.toggle("is-active", isSelected);
        pill.setAttribute("aria-pressed", String(isSelected));
      });
    }
    renderDishGrid();
  }

  function resetFilters() {
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    if (searchClearBtn) searchClearBtn.hidden = true;
    setCategory("All");
  }

  /* ------------------------------------------------------------------------
     Cart State (Shared localStorage: "savorCart")
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

  function addToCart(dishId, triggerButton) {
    const dish = MENU_DISHES.find((entry) => entry.id === dishId);
    if (!dish) return;

    const cart = readCart();
    const existing = cart.find((item) => item.id === dish.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: dish.id,
        name: dish.name,
        category: dish.tag || dish.category,
        price: dish.price,
        image: dish.image,
        quantity: 1
      });
    }

    writeCart(cart);
    bumpCartBadge();
    showToast(`Added "${dish.name}" to your dining bag.`);

    if (triggerButton) {
      const labelSpan = triggerButton.querySelector("span");
      triggerButton.classList.add("is-added");
      if (labelSpan) labelSpan.textContent = "Added";
      window.setTimeout(() => {
        triggerButton.classList.remove("is-added");
        if (labelSpan) labelSpan.textContent = "Add to Bag";
      }, 900);
    }
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
          <p>Select any Signature Main, Small Plate, Dessert, or Beverage from our seasonal menu.</p>
          <button type="button" class="btn btn-secondary" data-close-drawer>Browse Menu</button>
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

    // Category filter pills
    if (filterPillsContainer) {
      filterPillsContainer.addEventListener("click", (event) => {
        const pill = event.target.closest(".filter-pill");
        if (!pill || !pill.dataset.category) return;
        setCategory(pill.dataset.category);
      });
    }

    // Live search input & clear button
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value;
        if (searchClearBtn) {
          searchClearBtn.hidden = searchQuery.length === 0;
        }
        renderDishGrid();
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener("click", () => {
        searchQuery = "";
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        searchClearBtn.hidden = true;
        renderDishGrid();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", resetFilters);
    }

    // Add to Bag delegation on menu grid
    if (dishesGrid) {
      dishesGrid.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-add-id]");
        if (!btn) return;
        addToCart(btn.dataset.addId, btn);
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
        const closeTrigger = event.target.closest("[data-close-drawer]");
        if (closeTrigger) {
          closeCartDrawer(true);
          return;
        }

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
          showToast("Add at least one dish before proceeding to checkout.", "info");
          return;
        }
        window.location.href = "checkout.html";
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
    renderDishGrid();
    renderCart();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
