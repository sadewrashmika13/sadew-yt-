const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');
const app = express();

// ════════════════════════════════════════════════════
// 🎵 NN TECH YouTube Downloader API v4.0 (Anti-Bot Bypass)
// Hosted on Netlify Serverless Functions
// ════════════════════════════════════════════════════

const TIMEOUT = 15000;

// Helper: Bypass Cloudflare/Anti-Bot redirect pages (e.g. ryzendesu, agatz)
async function fetchWithBypass(apiUrl) {
    try {
        const res = await axios.get(apiUrl, { timeout: TIMEOUT });
        let data = res.data;
        
        // Anti-bot page ekak awoth (redirect_link = ...) bypass karanava
        if (typeof data === 'string' && data.includes('redirect_link')) {
            const match = data.match(/redirect_link\s*=\s*'(.*?)'/);
            if (match && match[1]) {
                const bypassUrl = match[1] + "fp=-5"; // bypass token
                const bypassRes = await axios.get(bypassUrl, { timeout: TIMEOUT });
                data = bypassRes.data;
            }
        }
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        return null;
    }
}

// ── MP3 Download Endpoint ──
app.get('/api/download/mp3', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });

    // APIs to try in order
    const apis = [
        {
            name: "Agatz API",
            url: `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(url)}`,
            extract: (d) => {
                if (d?.status === 200 && d?.data?.downloadUrl) {
                    return { title: d.data.title || "YouTube Audio", download: d.data.downloadUrl };
                }
                return null;
            }
        },
        {
            name: "Ryzendesu API",
            url: `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
            extract: (d) => {
                if (d?.url) { // Ryzendesu returns direct json sometimes after bypass
                    return { title: "YouTube Audio", download: d.url };
                }
                return null;
            }
        },
        {
            name: "Siputzx API",
            url: `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
            extract: (d) => {
                if (d?.status && d?.data?.dl) {
                    return { title: d.data.title || "YouTube Audio", download: d.data.dl };
                }
                return null;
            }
        }
    ];

    for (const api of apis) {
        try {
            const data = await fetchWithBypass(api.url);
            if (data) {
                const result = api.extract(data);
                if (result && result.download) {
                    return res.json({
                        status: true,
                        data: {
                            title: result.title,
                            download: result.download,
                            source: api.name
                        }
                    });
                }
            }
        } catch (e) {
            console.log(`[${api.name}] Failed`);
        }
    }

    res.status(500).json({ status: false, error: "All download servers are down or blocked." });
});

// ── MP4 Download Endpoint ──
app.get('/api/download/mp4', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });

    const apis = [
        {
            name: "Agatz API",
            url: `https://api.agatz.xyz/api/ytmp4?url=${encodeURIComponent(url)}`,
            extract: (d) => {
                if (d?.status === 200 && d?.data?.downloadUrl) {
                    return { title: d.data.title || "YouTube Video", download: d.data.downloadUrl };
                }
                return null;
            }
        },
        {
            name: "Ryzendesu API",
            url: `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(url)}`,
            extract: (d) => {
                if (d?.url) {
                    return { title: "YouTube Video", download: d.url };
                }
                return null;
            }
        },
        {
            name: "Siputzx API",
            url: `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
            extract: (d) => {
                if (d?.status && d?.data?.dl) {
                    return { title: d.data.title || "YouTube Video", download: d.data.dl };
                }
                return null;
            }
        }
    ];

    for (const api of apis) {
        try {
            const data = await fetchWithBypass(api.url);
            if (data) {
                const result = api.extract(data);
                if (result && result.download) {
                    return res.json({
                        status: true,
                        data: {
                            title: result.title,
                            download: result.download,
                            source: api.name
                        }
                    });
                }
            }
        } catch (e) {
            console.log(`[${api.name}] Failed`);
        }
    }

    res.status(500).json({ status: false, error: "All download servers are down or blocked." });
});

app.get('/', (req, res) => {
    res.json({ 
        status: true,
        message: "YouTube Downloader API Active (Anti-Bot Bypass)", 
        owner: "NN TECH",
        endpoints: ["/api/download/mp3?url=...", "/api/download/mp4?url=..."] 
    });
});

module.exports.handler = serverless(app);
