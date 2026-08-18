const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');
const app = express();

// ════════════════════════════════════════════════════
// 🎵 NN TECH YouTube Downloader API (Multi-Fallback)
// Hosted on Netlify Serverless Functions
// ════════════════════════════════════════════════════

const TIMEOUT = 15000; // 15 seconds

// Helper: Try multiple APIs in order, return first success
async function tryApis(apiList) {
    for (const api of apiList) {
        try {
            const res = await axios.get(api.url, { 
                timeout: TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const result = api.extract(res.data);
            if (result && result.download) return result;
        } catch (e) {
            console.log(`API Failed [${api.name}]:`, e.message);
            continue;
        }
    }
    return null;
}

// ── Root Endpoint ──
app.get('/', (req, res) => {
    res.json({ 
        status: true,
        message: "YouTube Downloader API is Active (Multi-Fallback)", 
        owner: "NN TECH",
        version: "2.0.0",
        endpoints: [
            "/api/download/mp3?url=...",
            "/api/download/mp4?url=..."
        ] 
    });
});

// ── MP3 Download ──
app.get('/api/download/mp3', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });

    const apis = [
        {
            name: "Siputzx",
            url: `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
            extract: (data) => {
                if (data?.status && data?.data?.dl) {
                    return { title: data.data.title || "YouTube Audio", download: data.data.dl };
                }
                return null;
            }
        },
        {
            name: "WhiteShadow",
            url: `https://whiteshadow-x-api.onrender.com/api/download/ytmp3?url=${encodeURIComponent(url)}&quality=320&apitoken=4ehG6P`,
            extract: (data) => {
                if (data?.success && data?.result?.download_url) {
                    return { title: data.result.title || "YouTube Audio", download: data.result.download_url };
                }
                return null;
            }
        },
        {
            name: "ZantaMD",
            url: `https://api.zanta-mini.store/api/ytdl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(url)}&type=mp3&quality=320`,
            extract: (data) => {
                if (data?.success && data?.result?.download_url) {
                    return { title: data.result.title || "YouTube Audio", download: data.result.download_url };
                }
                return null;
            }
        }
    ];

    try {
        const result = await tryApis(apis);
        if (result) {
            return res.json({ 
                status: true, 
                data: {
                    title: result.title,
                    download: result.download
                }
            });
        }
        res.status(500).json({ status: false, error: "All download servers are down. Try again later." });
    } catch (e) {
        res.status(500).json({ status: false, error: "API Error: " + e.message });
    }
});

// ── MP4 Download ──
app.get('/api/download/mp4', async (req, res) => {
    const url = req.query.url;
    const quality = req.query.quality || "720";
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });

    const apis = [
        {
            name: "Siputzx",
            url: `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
            extract: (data) => {
                if (data?.status && data?.data?.dl) {
                    return { title: data.data.title || "YouTube Video", download: data.data.dl };
                }
                return null;
            }
        },
        {
            name: "ZantaMD",
            url: `https://api.zanta-mini.store/api/ytdl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(url)}&type=mp4&quality=${quality}`,
            extract: (data) => {
                if (data?.success && data?.result?.download_url) {
                    return { title: data.result.title || "YouTube Video", download: data.result.download_url };
                }
                return null;
            }
        },
        {
            name: "DXZ",
            url: `https://ytdl-new-dxz.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}&quality=${quality}`,
            extract: (data) => {
                const dl = data?.video_url || data?.download_url || data?.url;
                if (dl) {
                    return { title: data.title || "YouTube Video", download: dl };
                }
                return null;
            }
        }
    ];

    try {
        const result = await tryApis(apis);
        if (result) {
            return res.json({ 
                status: true, 
                data: {
                    title: result.title,
                    download: result.download
                }
            });
        }
        res.status(500).json({ status: false, error: "All download servers are down. Try again later." });
    } catch (e) {
        res.status(500).json({ status: false, error: "API Error: " + e.message });
    }
});

module.exports.handler = serverless(app);
