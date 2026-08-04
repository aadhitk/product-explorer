import { pageCount } from "./pagination.js";

const API = "https://dummyjson.com/products";
const PER_PAGE = 12;

let query = "";
let page = 1;
let total = 0;
let sort = ""; // "" or "field-direction", e.g. "price-asc"
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
const sortSelect = $("#sort");

// read initial state (query, page, sort) from the URL, so a shared
// link or a refresh lands back on the same search/page/sort
function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  query = params.get("q") || "";
  sort = params.get("sort") || "";
  const p = parseInt(params.get("page"), 10);
  page = Number.isInteger(p) && p > 0 ? p : 1;

  searchInput.value = query;
  sortSelect.value = sort;
}

// keep the URL in sync with the current query/page/sort so it's
// shareable and survives a refresh, without adding a history entry
// per keystroke or page click
function writeStateToUrl() {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", page);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? "?" + qs : "");
  window.history.replaceState(null, "", url);
}

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

  if (sort) {
    const [field, direction] = sort.split("-");
    params.set("sortBy", field);
    params.set("order", direction);
  }

  writeStateToUrl();

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

sortSelect.addEventListener("change", function () {
  sort = sortSelect.value;
  page = 1;
  fetchProducts();
});

// support the browser's back/forward buttons
window.addEventListener("popstate", function () {
  readStateFromUrl();
  fetchProducts();
});

// kick it off, honoring any query/page/sort already in the URL
readStateFromUrl();
fetchProducts();
