const express = require('express');
const { ytmp3, ytmp4 } = require('yt-downld');
const app = express();

// ✅ CORS middleware — hemma request ekatama apply wenawa
// (mehema express ekema dapoth, vercel.json headers config eka
//  apply wuna na unath, browser eke CORS error eka enne na)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    // browser eken preflight (OPTIONS) request ekak awoth methenma reply karanna
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

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
    
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    try {
        const result = await ytmp3(url);
        if (!result) return res.status(500).json({ status: false, error: "Failed to fetch MP3" });
        
        // මෙහිදී අපි result එකේ URL එක සොයා ගැනීමට විවිධ keys උත්සාහ කරමු
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
    
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    try {
        const result = await ytmp4(url);
        if (!result) return res.status(500).json({ status: false, error: "Failed to fetch MP4" });
        
        // මෙහිදී අපි result එකේ URL එක සොයා ගැනීමට විවිධ keys උත්සාහ කරමු
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
