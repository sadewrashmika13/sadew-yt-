const express = require('express');
const { ytmp3, ytmp4 } = require('yt-downld');
const app = express();

// මුල් පිටුව
app.get('/', (req, res) => {
    res.json({ 
        status: true,
        message: "YouTube Downloader API is Active", 
        owner: "NN TECH",
        endpoints: ["/api/download/mp3?url=...", "/api/download/mp4?url=..."] 
    });
});

// MP3 Download Endpoint
app.get('/api/download/mp3', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });
    
    try {
        const result = await ytmp3(url);
        if (!result) return res.status(500).json({ status: false, error: "Failed to fetch MP3" });
        
        const downloadUrl = result.url || result.download || (result.data ? result.data.url : null) || "";
        
        res.json({ 
            status: true, 
            data: {
                title: result.title || "Unknown Title",
                duration: result.dur || result.duration || 0,
                download: downloadUrl
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

// MP4 Download Endpoint
app.get('/api/download/mp4', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });
    
    try {
        const result = await ytmp4(url);
        if (!result) return res.status(500).json({ status: false, error: "Failed to fetch MP4" });
        
        const downloadUrl = result.url || result.download || (result.data ? result.data.url : null) || "";
        
        res.json({ 
            status: true, 
            data: {
                title: result.title || "Unknown Title",
                duration: result.dur || result.duration || 0,
                download: downloadUrl
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

module.exports = app;
