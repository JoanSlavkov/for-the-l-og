import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing URL");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://wolt.com/"
      },
      redirect: "follow",
      timeout: 15000 // 15s timeout
    });

    const html = await response.text();

    console.log(`Fetched ${url} - Status: ${response.status} - Length: ${html.length}`);

    if (!html || html.length < 50) {
      // Likely blocked or empty response
      res.status(502).send("Received empty or blocked response");
    } else {
      res.send(html);
    }
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).send("Fetch failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
