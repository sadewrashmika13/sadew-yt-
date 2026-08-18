const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');
const app = express();

app.use(express.json());

// YouTube URL එක clean කර standard format එකට හැරවීම
function cleanYoutubeUrl(url) {
    try {
        const parsed = new URL(url);
        // youtu.be/ID format
        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.replace('/', '');
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
        // youtube.com/watch?v=ID format
        if (parsed.searchParams.has('v')) {
            const videoId = parsed.searchParams.get('v');
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
        return url;
    } catch {
        return url;
    }
}

app.get('/', (req, res) => {
    res.json({ 
        status: true, 
        message: "YouTube Downloader API is Active (Fixed Version)", 
        owner: "NN TECH",
        endpoints: ["/api/download/mp3?url=...", "/api/download/mp4?url=..."] 
    });
});

// MP3 Download Endpoint
app.get('/api/download/mp3', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl) return res.status(400).json({ status: false, error: "URL missing" });

    const cleanUrl = cleanYoutubeUrl(rawUrl);

    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(cleanUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 9000 // Netlify timeout එකට පෙර handle කරගැනීමට
        });

        console.log("MP3 API Upstream Response:", JSON.stringify(response.data));

        if (response.data && response.data.status) {
            const resData = response.data.data || response.data.result || {};
            const downloadUrl = resData.dl || resData.url || resData.download || resData.link;

            if (!downloadUrl) {
                return res.status(500).json({
                    status: false,
                    error: "Download link property not found in API response",
                    raw: response.data
                });
            }

            res.json({ 
                status: true, 
                data: {
                    title: resData.title || "YouTube Audio",
                    download: downloadUrl
                }
            });
        } else {
            res.status(500).json({ 
                status: false, 
                error: response.data?.message || "Failed to scrape MP3 link. External API error.",
                details: response.data 
            });
        }
    } catch (e) {
        console.error("MP3 Fetch Error:", e.response?.data || e.message);
        res.status(500).json({ 
            status: false, 
            error: "API Error: " + (e.response?.data?.message || e.message) 
        });
    }
});

// MP4 Download Endpoint
app.get('/api/download/mp4', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl) return res.status(400).json({ status: false, error: "URL missing" });

    const cleanUrl = cleanYoutubeUrl(rawUrl);

    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(cleanUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 9000
        });

        if (response.data && response.data.status) {
            const resData = response.data.data || response.data.result || {};
            res.json({ 
                status: true, 
                data: {
                    title: resData.title || "YouTube Video",
                    download: resData.dl || resData.url || resData.download
                }
            });
        } else {
            res.status(500).json({ status: false, error: "Failed to scrape MP4 link." });
        }
    } catch (e) {
        res.status(500).json({ status: false, error: "API Error: " + e.message });
    }
});

module.exports.handler = serverless(app);
