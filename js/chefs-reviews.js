/* ==========================================================================
   SavorSpot — Chefs & Guest Reviews Interactivity (js/chefs-reviews.js)
   ========================================================================== */

(function () {
  "use strict";

  const CART_STORAGE_KEY = "savorCart";
  const REVIEWS_STORAGE_KEY = "savorReviews";

  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  const occasionTabs = Array.from(document.querySelectorAll(".filter-tab"));
  const ratingFilter = document.getElementById("ratingFilter");
  const reviewsGrid = document.getElementById("reviewsGrid");
  const reviewsStatus = document.getElementById("reviewsStatus");
  const reviewsEmpty = document.getElementById("reviewsEmpty");
  const avgRatingValue = document.getElementById("avgRatingValue");
  const totalReviewsCount = document.getElementById("totalReviewsCount");

  const reviewForm = document.getElementById("reviewForm");
  const reviewerNameInput = document.getElementById("reviewerName");
  const reviewOccasionInput = document.getElementById("reviewOccasion");
  const reviewDishInput = document.getElementById("reviewDish");
  const reviewCommentInput = document.getElementById("reviewComment");
  const nameError = document.getElementById("nameError");
  const occasionError = document.getElementById("occasionError");
  const ratingError = document.getElementById("ratingError");
  const commentError = document.getElementById("commentError");

  const cartTrigger = document.getElementById("cartTrigger");
  const cartDrawer = document.getElementById("savorCart");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartClose = document.getElementById("cartClose");
  const cartBadge = document.getElementById("cartBadge");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartClearBtn = document.getElementById("cartClearBtn");
  const toastContainer = document.getElementById("toastContainer");

  let activeOccasion = "all";
  let activeRating = "all";
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
    }, 3000);
  }

  function renderStarsText(rating) {
    const clamped = Math.max(1, Math.min(5, Number(rating) || 5));
    return "\u2605".repeat(clamped) + "\u2606".repeat(5 - clamped);
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
     Guest Reviews Storage, Rendering & Filtering
     ------------------------------------------------------------------------ */
  function readStoredReviews() {
    try {
      const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeStoredReviews(reviews) {
    try {
      window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
      return true;
    } catch (_err) {
      showToast("Unable to save review in local storage.");
      return false;
    }
  }

  function createReviewCardElement(review) {
    const article = document.createElement("article");
    article.className = "review-card is-new";
    article.dataset.rating = String(review.rating || 5);
    article.dataset.occasion = review.occasion || "Date Night";
    article.dataset.storedId = review.id || "";

    const top = document.createElement("div");
    top.className = "review-top";

    const identity = document.createElement("div");
    const nameEl = document.createElement("h3");
    nameEl.className = "reviewer-name";
    nameEl.textContent = review.name;

    const dateEl = document.createElement("p");
    dateEl.className = "review-date";
    dateEl.textContent = (review.date || "Just Added") + " • Guest Submission";

    identity.appendChild(nameEl);
    identity.appendChild(dateEl);

    const starsEl = document.createElement("span");
    starsEl.className = "review-stars";
    starsEl.setAttribute("aria-label", review.rating + " out of 5 stars");
    starsEl.textContent = renderStarsText(review.rating);

    top.appendChild(identity);
    top.appendChild(starsEl);

    const tags = document.createElement("div");
    tags.className = "review-tags";

    const occasionTag = document.createElement("span");
    occasionTag.className = "card-tag";
    occasionTag.textContent = review.occasion;
    tags.appendChild(occasionTag);

    if (review.dish) {
      const dishTag = document.createElement("span");
      dishTag.className = "dish-tag";
      dishTag.textContent = review.dish;
      tags.appendChild(dishTag);
    }

    const commentEl = document.createElement("p");
    commentEl.className = "review-text";
    commentEl.textContent = '"' + review.comment + '"';

    article.appendChild(top);
    article.appendChild(tags);
    article.appendChild(commentEl);

    return article;
  }

  function loadStoredReviewsIntoGrid() {
    if (!reviewsGrid) return;
    const stored = readStoredReviews();
    if (!stored.length) return;

    // Prepend newest first (stored array keeps newest at index 0, so iterate in reverse)
    for (let i = stored.length - 1; i >= 0; i -= 1) {
      const card = createReviewCardElement(stored[i]);
      reviewsGrid.prepend(card);
    }
  }

  function updateSummaryMetrics() {
    if (!reviewsGrid) return;
    const allCards = Array.from(reviewsGrid.querySelectorAll(".review-card"));
    const count = allCards.length;
    const sum = allCards.reduce(function (acc, card) {
      return acc + (Number(card.dataset.rating) || 0);
    }, 0);
    const avg = count ? (sum / count).toFixed(1) : "0.0";

    if (avgRatingValue) avgRatingValue.textContent = avg;
    if (totalReviewsCount) totalReviewsCount.textContent = String(count);
  }

  function applyReviewFilters() {
    if (!reviewsGrid) return;
    const allCards = Array.from(reviewsGrid.querySelectorAll(".review-card"));

    occasionTabs.forEach(function (tab) {
      const isSelected = (tab.dataset.occasion || "all") === activeOccasion;
      tab.classList.toggle("is-active", isSelected);
      tab.setAttribute("aria-selected", String(isSelected));
    });

    let visibleCount = 0;
    allCards.forEach(function (card) {
      const cardOccasion = card.dataset.occasion || "";
      const cardRating = Number(card.dataset.rating) || 0;

      const matchesOccasion =
        activeOccasion === "all" || cardOccasion === activeOccasion;

      let matchesRating = true;
      if (activeRating === "5") {
        matchesRating = cardRating === 5;
      } else if (activeRating === "4") {
        matchesRating = cardRating >= 4;
      }

      const visible = matchesOccasion && matchesRating;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (reviewsStatus) {
      reviewsStatus.textContent =
        visibleCount === 1
          ? "Showing 1 guest review"
          : "Showing " + visibleCount + " guest reviews";
    }
    if (reviewsEmpty) {
      reviewsEmpty.hidden = visibleCount > 0;
    }
  }

  occasionTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activeOccasion = tab.dataset.occasion || "all";
      applyReviewFilters();
    });
  });

  if (ratingFilter) {
    ratingFilter.addEventListener("change", function () {
      activeRating = ratingFilter.value || "all";
      applyReviewFilters();
    });
  }

  /* ------------------------------------------------------------------------
     Review Form Validation & Submission
     ------------------------------------------------------------------------ */
  function setFieldError(inputEl, errorEl, message) {
    if (errorEl) errorEl.textContent = message || "";
    if (!inputEl) return;
    const wrapper = inputEl.closest(".form-field");
    if (wrapper) {
      wrapper.classList.toggle("has-error", Boolean(message));
    }
  }

  function clearFormErrors() {
    setFieldError(reviewerNameInput, nameError, "");
    setFieldError(reviewOccasionInput, occasionError, "");
    if (ratingError) ratingError.textContent = "";
    setFieldError(reviewCommentInput, commentError, "");
  }

  if (reviewForm) {
    reviewForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors();

      const name = reviewerNameInput ? reviewerNameInput.value.trim() : "";
      const occasion = reviewOccasionInput ? reviewOccasionInput.value : "";
      const dish = reviewDishInput ? reviewDishInput.value.trim() : "";
      const comment = reviewCommentInput ? reviewCommentInput.value.trim() : "";
      const selectedRatingInput = reviewForm.querySelector('input[name="reviewRating"]:checked');
      const rating = selectedRatingInput ? Number(selectedRatingInput.value) : 0;

      let isValid = true;

      if (name.length < 2) {
        setFieldError(reviewerNameInput, nameError, "Please enter at least 2 characters for your name.");
        isValid = false;
      }

      if (!occasion) {
        setFieldError(reviewOccasionInput, occasionError, "Please select a dining occasion.");
        isValid = false;
      }

      if (rating < 1 || rating > 5) {
        if (ratingError) ratingError.textContent = "Please choose a rating between 1 and 5 stars.";
        isValid = false;
      }

      if (comment.length < 15) {
        setFieldError(
          reviewCommentInput,
          commentError,
          "Please share at least 15 characters about your experience."
        );
        isValid = false;
      }

      if (!isValid) return;

      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      });

      const newReview = {
        id: "rev-" + Date.now(),
        name: name,
        occasion: occasion,
        rating: rating,
        dish: dish,
        comment: comment,
        date: formattedDate
      };

      const existing = readStoredReviews();
      existing.unshift(newReview);
      writeStoredReviews(existing);

      if (reviewsGrid) {
        const card = createReviewCardElement(newReview);
        reviewsGrid.prepend(card);
      }

      // Reset filters to show the newly submitted review immediately
      activeOccasion = "all";
      activeRating = "all";
      if (ratingFilter) ratingFilter.value = "all";

      updateSummaryMetrics();
      applyReviewFilters();

      reviewForm.reset();
      const defaultStar = document.getElementById("star5");
      if (defaultStar) defaultStar.checked = true;

      showToast("Thank you, " + name + "! Your guest review is now live.");
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
    }
  });

  // Initial sync on load
  loadStoredReviewsIntoGrid();
  updateSummaryMetrics();
  applyReviewFilters();
  renderCart();
})();
