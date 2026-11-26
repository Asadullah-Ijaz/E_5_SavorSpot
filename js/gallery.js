/* ==========================================================================
   SavorSpot — Culinary & Ambiance Gallery Interactivity (js/gallery.js)
   ========================================================================== */

(function () {
  "use strict";

  const CART_STORAGE_KEY = "savorCart";

  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  const filterTabs = Array.from(document.querySelectorAll(".filter-tab"));
  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
  const galleryStatus = document.getElementById("galleryStatus");

  const lightbox = document.getElementById("galleryLightbox");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCategory = document.getElementById("lightboxCategory");
  const lightboxCounter = document.getElementById("lightboxCounter");
  const lightboxTitle = document.getElementById("lightboxTitle");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxMeta = document.getElementById("lightboxMeta");
  const lightboxAddCart = document.getElementById("lightboxAddCart");
  const lightboxReserveLink = document.getElementById("lightboxReserveLink");

  const cartTrigger = document.getElementById("cartTrigger");
  const cartDrawer = document.getElementById("savorCart");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartClose = document.getElementById("cartClose");
  const cartBadge = document.getElementById("cartBadge");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartClearBtn = document.getElementById("cartClearBtn");
  const toastContainer = document.getElementById("toastContainer");

  let activeCategory = "all";
  let currentLightboxIndex = 0;
  let lastFocusedElement = null;

  /* ------------------------------------------------------------------------
     Utility Helpers
     ------------------------------------------------------------------------ */
  function formatPKR(amount) {
    return "PKR " + Number(amount || 0).toLocaleString("en-PK");
  }

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);

    window.setTimeout(function () {
      toast.remove();
    }, 2800);
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
     Gallery Category Filtering
     ------------------------------------------------------------------------ */
  function getVisibleCards() {
    return galleryCards.filter(function (card) {
      return !card.hidden;
    });
  }

  function applyFilter(category) {
    activeCategory = category;

    filterTabs.forEach(function (tab) {
      const isSelected = tab.dataset.category === category;
      tab.classList.toggle("is-active", isSelected);
      tab.setAttribute("aria-selected", String(isSelected));
    });

    let visibleCount = 0;
    galleryCards.forEach(function (card) {
      const matches = category === "all" || card.dataset.category === category;
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (galleryStatus) {
      galleryStatus.textContent =
        visibleCount === 1
          ? "Showing 1 curated moment"
          : "Showing " + visibleCount + " curated moments";
    }
  }

  filterTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      applyFilter(tab.dataset.category || "all");
    });
  });

  /* ------------------------------------------------------------------------
     Lightbox Preview Modal
     ------------------------------------------------------------------------ */
  function renderLightbox(index) {
    const visibleCards = getVisibleCards();
    if (!visibleCards.length || !lightbox) return;

    currentLightboxIndex = (index + visibleCards.length) % visibleCards.length;
    const card = visibleCards[currentLightboxIndex];
    const img = card.querySelector("img");

    if (lightboxImage && img) {
      lightboxImage.src = img.getAttribute("src") || "";
      lightboxImage.alt = img.getAttribute("alt") || card.dataset.title || "";
    }

    if (lightboxCategory) {
      lightboxCategory.textContent = card.dataset.categoryLabel || "";
    }
    if (lightboxCounter) {
      lightboxCounter.textContent =
        currentLightboxIndex + 1 + " / " + visibleCards.length;
    }
    if (lightboxTitle) {
      lightboxTitle.textContent = card.dataset.title || "";
    }
    if (lightboxCaption) {
      lightboxCaption.textContent = card.dataset.caption || "";
    }
    if (lightboxMeta) {
      lightboxMeta.textContent = card.dataset.meta || "";
    }

    const isOrderable = card.dataset.orderable === "true";
    if (lightboxAddCart) {
      lightboxAddCart.hidden = !isOrderable;
      lightboxAddCart.dataset.id = card.dataset.id || "";
      lightboxAddCart.dataset.title = card.dataset.title || "";
      lightboxAddCart.dataset.price = card.dataset.price || "0";
    }
    if (lightboxReserveLink) {
      lightboxReserveLink.hidden = isOrderable;
    }
  }

  function openLightbox(card) {
    const visibleCards = getVisibleCards();
    const index = visibleCards.indexOf(card);
    if (index === -1 || !lightbox) return;

    lastFocusedElement = document.activeElement;
    renderLightbox(index);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  galleryCards.forEach(function (card) {
    const mediaBtn = card.querySelector(".card-media-btn");
    const previewBtn = card.querySelector(".btn-preview");

    if (mediaBtn) {
      mediaBtn.addEventListener("click", function () {
        openLightbox(card);
      });
    }
    if (previewBtn) {
      previewBtn.addEventListener("click", function () {
        openLightbox(card);
      });
    }
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", function () {
      renderLightbox(currentLightboxIndex - 1);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", function () {
      renderLightbox(currentLightboxIndex + 1);
    });
  }
  if (lightbox) {
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
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

  function addItemToCart(item) {
    if (!item || !item.id || !item.title) return;
    const cart = readCart();
    const existing = cart.find(function (entry) {
      return entry.id === item.id;
    });

    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + 1;
    } else {
      cart.push({
        id: item.id,
        title: item.title,
        price: Number(item.price) || 0,
        qty: 1
      });
    }

    writeCart(cart);
    showToast("Added " + item.title + " to your SavorSpot order.");
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

  galleryCards.forEach(function (card) {
    const addBtn = card.querySelector(".btn-add-cart");
    if (!addBtn) return;

    addBtn.addEventListener("click", function () {
      addItemToCart({
        id: card.dataset.id,
        title: card.dataset.title,
        price: Number(card.dataset.price) || 0
      });
    });
  });

  if (lightboxAddCart) {
    lightboxAddCart.addEventListener("click", function () {
      addItemToCart({
        id: lightboxAddCart.dataset.id,
        title: lightboxAddCart.dataset.title,
        price: Number(lightboxAddCart.dataset.price) || 0
      });
    });
  }

  /* ------------------------------------------------------------------------
     Global Keyboard & Cross-Tab Storage Listeners
     ------------------------------------------------------------------------ */
  document.addEventListener("keydown", function (event) {
    if (lightbox && !lightbox.hidden) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") renderLightbox(currentLightboxIndex - 1);
      if (event.key === "ArrowRight") renderLightbox(currentLightboxIndex + 1);
      return;
    }

    if (cartDrawer && !cartDrawer.hidden && event.key === "Escape") {
      closeCartDrawer();
    }
  });

  window.addEventListener("storage", function (event) {
    if (event.key === CART_STORAGE_KEY) {
      renderCart();
    }
  });

  // Initial sync on load
  applyFilter(activeCategory);
  renderCart();
})();
