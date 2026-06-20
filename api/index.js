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
    
    // Cache එකතු කිරීම - මෙය API එකේ වේගය බෙහෙවින් වැඩි කරනු ඇත
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    try {
        const result = await ytmp3(url);
        if (!result) return res.status(500).json({ status: false, error: "Failed to fetch MP3" });
        
        // Metadata සහ Download URL සහිත සම්පූර්ණ ප්‍රතිචාරය
        res.json({ status: true, data: result });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

// MP4 Download Endpoint
app.get('/api/download/mp4', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });
    
    // Cache එකතු කිරීම - මෙය API එකේ වේගය බෙහෙවින් වැඩි කරනු ඇත
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    try {
        const result = await ytmp4(url);
        if (!result) return res.status(500).json({ status: false, error: "Failed to fetch MP4" });
        
        // Metadata සහ Download URL සහිත සම්පූර්ණ ප්‍රතිචාරය
        res.json({ status: true, data: result });
    } catch (e) {
        res.status(500).json({ status: false, error: e.message });
    }
});

module.exports = app;
