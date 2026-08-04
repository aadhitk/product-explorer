import { pageCount } from "./pagination.js";

const API = "https://dummyjson.com/products";
const PER_PAGE = 12;

let query = "";
let page = 1;
let total = 0;
let controller = null;
let debounceId;

const $ = (s) => document.querySelector(s);
const grid = $("#products");
const tmpl = $("#product-card-template");
const searchInput = $("#search");
const summary = $("#result-summary");
const pageLbl = $("#page-label");
const pageInfo = $("#page-status");
const prevBtn = $("#previous");
const nextBtn = $("#next");
const msgBox = $("#message");
const retryBtn = $("#retry");
const catalogue = $(".catalogue");

function showMsg(text, type) {
  msgBox.textContent = text;
  msgBox.className = "message" + (type ? " " + type : "");
  msgBox.hidden = !text;
  retryBtn.hidden = type !== "error";
}

function updateButtons() {
  const pages = pageCount(total, PER_PAGE);
  pageLbl.textContent = "PAGE " + String(page).padStart(2, "0");
  pageInfo.textContent = total ? "Page " + page + " of " + pages : "Page 0 of 0";
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= pages || total === 0;
}

function renderCards(products) {
  const offset = (page - 1) * PER_PAGE;
  grid.innerHTML = "";

  products.forEach(function (p, i) {
    const card = tmpl.content.cloneNode(true);
    const img = card.querySelector(".product-image");
    img.src = p.thumbnail;
    img.alt = p.title;

    img.onerror = function () {
      img.classList.add("image-missing");
      img.closest(".image-wrap").classList.add("has-missing-image");
      img.alt = p.title + " image unavailable";
    };

    card.querySelector(".item-number").textContent =
      "No. " + String(offset + i + 1).padStart(3, "0");
    card.querySelector(".product-title").textContent = p.title;
    card.querySelector(".product-price").textContent = "$" + p.price.toFixed(2);
    card.querySelector(".product-rating").textContent = "\u2605 " + p.rating.toFixed(1);

    grid.appendChild(card);
  });
}

async function fetchProducts() {
  if (controller) controller.abort();
  controller = new AbortController();
  const signal = controller.signal;

  const skip = (page - 1) * PER_PAGE;
  const endpoint = query ? API + "/search" : API;
  const params = new URLSearchParams({ limit: PER_PAGE, skip });
  if (query) params.set("q", query);

  // loading skeleton
  catalogue.setAttribute("aria-busy", "true");
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  showMsg("Fetching the latest entries\u2026", "loading");

  grid.innerHTML = "";
  for (let n = 0; n < PER_PAGE; n++) {
    const sk = document.createElement("div");
    sk.className = "skeleton";
    grid.appendChild(sk);
  }

  try {
    const res = await fetch(endpoint + "?" + params, { signal });
    if (!res.ok) throw new Error("The archive returned " + res.status);

    const data = await res.json();
    total = data.total;

    // if we're past the last page, snap back
    if (page > pageCount(total, PER_PAGE)) {
      page = pageCount(total, PER_PAGE);
      return fetchProducts();
    }

    showMsg("", "");
    renderCards(data.products);

    if (!total) {
      summary.textContent = query
        ? 'No objects match \u201c' + query + '\u201d'
        : "The archive is empty";
    } else {
      summary.textContent =
        total + (total === 1 ? " object" : " objects") +
        (query ? ' matching \u201c' + query + '\u201d' : " in the archive");
    }

    updateButtons();
  } catch (err) {
    if (err.name === "AbortError") return;
    grid.innerHTML = "";
    showMsg(err.message + ". Check your connection and try again.", "error");
    summary.textContent = "The archive is unavailable";
    updateButtons();
  } finally {
    catalogue.setAttribute("aria-busy", "false");
  }
}

// search with debounce
$(".search-form").addEventListener("submit", function (e) {
  e.preventDefault();
  clearTimeout(debounceId);
  query = searchInput.value.trim();
  page = 1;
  fetchProducts();
});

searchInput.addEventListener("input", function () {
  clearTimeout(debounceId);
  debounceId = setTimeout(function () {
    query = searchInput.value.trim();
    page = 1;
    fetchProducts();
  }, 300);
});

prevBtn.addEventListener("click", function () {
  if (page > 1) { page--; fetchProducts(); }
});

nextBtn.addEventListener("click", function () {
  if (page < pageCount(total, PER_PAGE)) { page++; fetchProducts(); }
});

retryBtn.addEventListener("click", fetchProducts);

// kick it off
fetchProducts();
