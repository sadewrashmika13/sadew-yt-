const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios'); // yt-downld වෙනුවට අපි axios පාවිච්චි කරනවා
const app = express();

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
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });
    
    try {
        // වෙනත් වැඩ කරන සර්වර් එකකින් ඩේටා එක අරගන්නවා
        const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`);
        
        if (response.data && response.data.status) {
            res.json({ 
                status: true, 
                data: {
                    title: response.data.data.title || "YouTube Audio",
                    download: response.data.data.dl
                }
            });
        } else {
            res.status(500).json({ status: false, error: "Failed to scrape MP3 link. Try another video." });
        }
    } catch (e) {
        res.status(500).json({ status: false, error: "API Error: " + e.message });
    }
});

// MP4 Download Endpoint
app.get('/api/download/mp4', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL missing" });
    
    try {
        const response = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`);
        
        if (response.data && response.data.status) {
            res.json({ 
                status: true, 
                data: {
                    title: response.data.data.title || "YouTube Video",
                    download: response.data.data.dl
                }
            });
        } else {
            res.status(500).json({ status: false, error: "Failed to scrape MP4 link. Try another video." });
        }
    } catch (e) {
        res.status(500).json({ status: false, error: "API Error: " + e.message });
    }
});

module.exports.handler = serverless(app);
