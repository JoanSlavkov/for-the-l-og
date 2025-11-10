const urlInput = document.getElementById("urlInput");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const outputContainer = document.getElementById("outputContainer");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");
const exportBtn = document.getElementById("exportBtn");

const PROXY_BASE = "/fetch?";
const FALLBACK_IMAGE = "https://via.placeholder.com/100?text=No+Image";

let allItems = [];
let allCategories = [];

/* ---------- FETCH PAGE ---------- */
async function fetchPage(url) {
  const resp = await fetch(PROXY_BASE + "url=" + encodeURIComponent(url));
  if (!resp.ok) throw new Error("Proxy fetch failed");
  return await resp.text();
}

/* ---------- SCRAPE ---------- */
function extractItemsFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const items = [];

  // Extract categories
  allCategories = Array.from(doc.querySelectorAll('h2'))
    .map(el => el.textContent.trim())
    .filter(Boolean);
  allCategories = [...new Set(allCategories)];

  // Extract dish cards
  const dishNodes = Array.from(doc.querySelectorAll('[data-test-id="horizontal-item-card"]'));
  console.log('Found dishes:', dishNodes.length);

  dishNodes.forEach(dish => {
    const name = dish.querySelector('[data-test-id="horizontal-item-card-header"]')?.textContent.trim() || "(no name)";
    const description = dish.querySelector('p')?.textContent.trim() || "";
    const price = dish.querySelector('[data-test-id="horizontal-item-card-price"]')?.textContent.trim() || "";

    let imgUrl = FALLBACK_IMAGE;
    const imgEl = dish.querySelector('[data-test-id="horizontal-item-card-image"]') || dish.querySelector("img");
    if (imgEl) {
      const s = imgEl.getAttribute("srcset") || imgEl.getAttribute("imagesrcset");
      imgUrl = s ? s.split(",").pop().trim().split(/\s+/)[0] : imgEl.src || imgUrl;
    }

    items.push({ name, description, price, imgUrl });
  });

  return items;
}

/* ---------- DISPLAY ---------- */
function displayItems(items) {
  outputContainer.innerHTML = "";
  if (!items.length && !allCategories.length) {
    outputContainer.textContent = "No items found.";
    return;
  }

  const table = document.createElement("table");
  const headers = [
    { label: "Categories", key: "categories" },
    { label: "Dish Name", key: "name" },
    { label: "Description", key: "description" },
    { label: "Price", key: "price" },
    { label: "Image URL", key: "imgUrl" }
  ];

  // Header row + copy buttons
  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");

    const span = document.createElement("span");
    span.textContent = h.label;
    th.appendChild(span);

    const btn = document.createElement("button");
    btn.textContent = "Copy";
    btn.style.display = "block";
    btn.style.marginTop = "4px";
    btn.style.fontSize = "11px";
    btn.style.padding = "2px 6px";
    btn.addEventListener("click", () => copyColumn(h.key));
    th.appendChild(btn);

    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Categories row (all categories combined)
  if (allCategories.length) {
    const catRow = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      if (h.key === "categories") td.textContent = allCategories.join("\n");
      catRow.appendChild(td);
    });
    table.appendChild(catRow);
  }

  // Dish rows
  items.forEach(item => {
    const row = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");

      if (h.key === "categories") {
        td.textContent = "";
      } else if (h.key === "imgUrl") {
        const link = document.createElement("a");
        link.href = item.imgUrl;
        link.target = "_blank";
        link.textContent = item.imgUrl;
        td.appendChild(link);
      } else if (h.key === "price") {
        td.textContent = (item.price || "").replace(",", ".");
      } else {
        td.textContent = item[h.key] || "";
      }

      row.appendChild(td);
    });
    table.appendChild(row);
  });

  outputContainer.appendChild(table);
}

/* ---------- COPY COLUMN ---------- */
function copyColumn(columnKey) {
  let values = "";
  if (columnKey === "categories") {
    values = allCategories.join("\n");
  } else {
    values = allItems.map(item => {
      if (columnKey === "price") return (item[columnKey] || "").replace(",", ".");
      return item[columnKey] || "";
    }).join("\n");
  }
  navigator.clipboard.writeText(values)
    .then(() => alert(`Copied ${columnKey}!`))
    .catch(err => alert("Copy failed: " + err));
}

/* ---------- LOAD BUTTON ---------- */
loadBtn.addEventListener("click", async () => {
  let url = urlInput.value.trim();
  if (!url) return alert("Paste a Wolt restaurant URL first.");
  if (!url.startsWith("http")) url = "https://" + url;

  outputContainer.innerHTML = "Fetching page…";
  try {
    const html = await fetchPage(url);
    allItems = extractItemsFromHTML(html);
    displayItems(allItems);
  } catch (err) {
    outputContainer.innerHTML = "Error: " + err.message;
    console.error(err);
  }
});

/* ---------- CLEAR BUTTON ---------- */
clearBtn.addEventListener("click", () => {
  urlInput.value = "";
  outputContainer.innerHTML = "";
  allItems = [];
  allCategories = [];
});

/* ---------- THEME TOGGLE ---------- */
function applyTheme(isLight) {
  document.body.classList.toggle("light-mode", isLight);
  themeLabel.textContent = isLight ? "Light Mode" : "Dark Mode";
  themeToggle.checked = isLight;
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

themeToggle.addEventListener("change", () => applyTheme(themeToggle.checked));

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  applyTheme(savedTheme === "light");
});

/* ----------------------------------------------------------
   ✅ EXCEL EXPORT (XLSX) — Categories in separate cells
-----------------------------------------------------------*/

// Load XLSX library
document.body.appendChild(Object.assign(document.createElement("script"), {
  src: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
}));

exportBtn.addEventListener("click", () => {
  if (!allItems.length && !allCategories.length) {
    alert("No data to export.");
    return;
  }

  const worksheetData = [];

  // Header row
  worksheetData.push(["Categories", "Dish Name", "Description", "Price", "Image URL"]);

  // Categories: each category gets its own cell in column A
  allCategories.forEach(cat => {
    worksheetData.push([cat, "", "", "", ""]);
  });

  // Dish rows
  allItems.forEach(item => {
    worksheetData.push([
      "", // empty category cell for dish rows
      item.name,
      item.description,
      (item.price || "").replace(",", "."),
      item.imgUrl
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  XLSX.utils.book_append_sheet(wb, ws, "Wolt Data");
  XLSX.writeFile(wb, "wolt_export.xlsx");
});


