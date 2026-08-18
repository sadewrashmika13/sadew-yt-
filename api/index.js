const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');

const app = express();
const router = express.Router();

app.use(express.json());

// YouTube URL එක clean කිරීම
function cleanYoutubeUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.replace('/', '');
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
        if (parsed.searchParams.has('v')) {
            const videoId = parsed.searchParams.get('v');
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
        return url;
    } catch {
        return url;
    }
}

// Base Route
router.get('/', (req, res) => {
    res.json({
        status: true,
        message: "YouTube Downloader API is Active",
        owner: "NN TECH",
        endpoints: ["/api/download/mp3?url=...", "/api/download/mp4?url=..."]
    });
});

// MP3 Route
router.get('/api/download/mp3', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl) return res.status(400).json({ status: false, error: "URL query parameter missing" });

    const cleanUrl = cleanYoutubeUrl(rawUrl);

    try {
        // Netlify timeout එක 10s බැවින් axios timeout එක 8s ලෙස සකසා ඇත
        const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(cleanUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });

        const resData = response.data?.data || response.data?.result;
        const downloadUrl = resData?.dl || resData?.url || resData?.download || resData?.link;

        if (downloadUrl) {
            return res.json({
                status: true,
                data: {
                    title: resData.title || "YouTube Audio",
                    download: downloadUrl
                }
            });
        }

        return res.status(502).json({
            status: false,
            error: "Audio stream link not found in upstream response.",
            upstream_response: response.data
        });

    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            return res.status(504).json({
                status: false,
                error: "Upstream server took too long to process audio (Timeout)."
            });
        }
        return res.status(500).json({
            status: false,
            error: "Request failed: " + (err.response?.data?.message || err.message)
        });
    }
});

// MP4 Route
router.get('/api/download/mp4', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl) return res.status(400).json({ status: false, error: "URL query parameter missing" });

    const cleanUrl = cleanYoutubeUrl(rawUrl);

    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(cleanUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });

        const resData = response.data?.data || response.data?.result;
        const downloadUrl = resData?.dl || resData?.url || resData?.download;

        if (downloadUrl) {
            return res.json({
                status: true,
                data: {
                    title: resData.title || "YouTube Video",
                    download: downloadUrl
                }
            });
        }

        return res.status(502).json({
            status: false,
            error: "Video link not found in upstream response.",
            upstream_response: response.data
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            error: "Request failed: " + (err.response?.data?.message || err.message)
        });
    }
});

// Routes Handle කිරීම (Local සහ Netlify routes දෙකටම සහය දැක්වීමට)
app.use('/.netlify/functions/index', router);
app.use('/', router);

module.exports.handler = serverless(app);
