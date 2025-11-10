const urlInput = document.getElementById("urlInput");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const outputContainer = document.getElementById("outputContainer");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");
const exportBtn = document.getElementById("exportBtn");
const exportLogsBtn = document.getElementById("exportLogsBtn"); // optional button for logs export

const PROXY_BASE = "/fetch?";
const FALLBACK_IMAGE = "https://via.placeholder.com/100?text=No+Image";

let allItems = [];
let allCategories = [];
const appLogs = []; // centralized log storage

/* ---------- LOGGING SYSTEM ---------- */
function logError(error, context = "") {
  const timestamp = new Date().toISOString();
  const message = error?.message || error || "Unknown error";
  const stack = error?.stack || "";
  
  const logEntry = { timestamp, context, message, stack };
  appLogs.push(logEntry);

  console.error(`[APP LOG] ${timestamp} - ${context}: ${message}`, logEntry);
}

// Catch synchronous errors
window.onerror = function(message, source, lineno, colno, error) {
  logError(error || message, `Source: ${source}, Line: ${lineno}, Col: ${colno}`);
  return false; // allow default handler
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
  logError(event.reason, "Unhandled promise rejection");
};

// Optional: export logs
function exportLogs() {
  if (!appLogs.length) return alert("No logs to export.");
  
  const blob = new Blob([JSON.stringify(appLogs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "app_logs.json";
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- FETCH PAGE ---------- */
async function fetchPage(url) {
  try {
    const resp = await fetch(PROXY_BASE + "url=" + encodeURIComponent(url));
    if (!resp.ok) throw new Error(`Proxy fetch failed: ${resp.status}`);
    return await resp.text();
  } catch (err) {
    logError(err, "fetchPage");
    throw err; // rethrow so UI can show error
  }
}

/* ---------- SCRAPE ---------- */
function extractItemsFromHTML(html) {
  try {
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
  } catch (err) {
    logError(err, "extractItemsFromHTML");
    throw err;
  }
}

/* ---------- DISPLAY ---------- */
function displayItems(items) {
  try {
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

    // Header row
    const headerRow = document.createElement("tr");
    headers.forEach(h => {
      const th = document.createElement("th");
      const span = document.createElement("span");
      span.textContent = h.label;
      th.appendChild(span);
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Categories row
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

        if (h.key === "categories") td.textContent = "";
        else if (h.key === "imgUrl") {
          const link = document.createElement("a");
          link.href = item.imgUrl;
          link.target = "_blank";
          link.textContent = item.imgUrl;
          td.appendChild(link);
        }
        else if (h.key === "price") td.textContent = (item.price || "").replace(",", ".");
        else td.textContent = item[h.key] || "";

        row.appendChild(td);
      });
      table.appendChild(row);
    });

    outputContainer.appendChild(table);
  } catch (err) {
    logError(err, "displayItems");
    outputContainer.textContent = "Error displaying items.";
  }
}

/* ---------- LOAD BUTTON ---------- */
loadBtn.addEventListener("click", async () => {
  try {
    let url = urlInput.value.trim();
    if (!url) return alert("Paste a Wolt restaurant URL first.");
    if (!url.startsWith("http")) url = "https://" + url;

    outputContainer.innerHTML = "Fetching page…";
    const html = await fetchPage(url);
    allItems = extractItemsFromHTML(html);
    displayItems(allItems);
  } catch (err) {
    outputContainer.innerHTML = "Error: " + err.message;
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

/* ---------- EXCEL EXPORT ---------- */
document.body.appendChild(Object.assign(document.createElement("script"), {
  src: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
}));

exportBtn.addEventListener("click", () => {
  try {
    if (!allItems.length && !allCategories.length) {
      alert("No data to export.");
      return;
    }

    const worksheetData = [];
    worksheetData.push(["Categories", "Dish Name", "Description", "Price", "Image URL"]);

    allCategories.forEach(cat => {
      worksheetData.push([cat, "", "", "", ""]);
    });

    allItems.forEach(item => {
      worksheetData.push([
        "",
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
  } catch (err) {
    logError(err, "exportExcel");
    alert("Export failed: " + err.message);
  }
});

// Optional button for exporting logs
if (exportLogsBtn) exportLogsBtn.addEventListener("click", exportLogs);




