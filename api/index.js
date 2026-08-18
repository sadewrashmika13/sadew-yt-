const express = require('express');
const serverless = require('serverless-http');
const app = express();

// ════════════════════════════════════════════════════
// 🎵 NN TECH YouTube Downloader API v3.0
// ✅ Uses youtubei.js (YouTube InnerTube) - No external APIs!
// ✅ Direct YouTube scraping - never goes down
// Hosted on Netlify Serverless Functions
// ════════════════════════════════════════════════════

let innertubeInstance = null;

// Innertube singleton (reuse across requests for speed)
async function getInnertube() {
    if (!innertubeInstance) {
        const { Innertube } = await import('youtubei.js');
        innertubeInstance = await Innertube.create({
            retrieve_player: true,
            generate_session_locally: true
        });
    }
    return innertubeInstance;
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/  // direct ID
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ── Root Endpoint ──
app.get('/', (req, res) => {
    res.json({ 
        status: true,
        message: "YouTube Downloader API is Active (InnerTube Engine)", 
        owner: "NN TECH",
        version: "3.0.0",
        engine: "youtubei.js (InnerTube)",
        endpoints: [
            "/api/download/mp3?url=<youtube_url>",
            "/api/download/mp4?url=<youtube_url>&quality=<360|480|720|1080>"
        ] 
    });
});

// ── MP3 Download ──
app.get('/api/download/mp3', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL parameter missing" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ status: false, error: "Invalid YouTube URL" });

    try {
        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId, 'ANDROID');

        const title = info.basic_info?.title || "YouTube Audio";
        const duration = info.basic_info?.duration || 0;
        const thumbnail = info.basic_info?.thumbnail?.[0]?.url || "";

        // Audio-only formats ටික ගන්නවා
        const formats = info.streaming_data?.adaptive_formats || [];
        
        // Best audio format eka හොයනවා (highest bitrate)
        const audioFormats = formats.filter(f => 
            f.mime_type?.includes('audio') && f.url
        ).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length === 0) {
            // Fallback: progressive format eka ගන්නවා (audio + video mixed)
            const progressive = info.streaming_data?.formats || [];
            const withAudio = progressive.filter(f => f.url).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            
            if (withAudio.length > 0) {
                return res.json({
                    status: true,
                    data: {
                        title: title,
                        duration: duration,
                        thumbnail: thumbnail,
                        download: withAudio[0].url,
                        quality: "mixed (audio+video)",
                        note: "Pure audio not available, sending mixed stream"
                    }
                });
            }
            return res.status(500).json({ status: false, error: "No audio streams found for this video" });
        }

        const bestAudio = audioFormats[0];

        res.json({
            status: true,
            data: {
                title: title,
                duration: duration,
                thumbnail: thumbnail,
                download: bestAudio.url,
                quality: `${Math.round((bestAudio.bitrate || 0) / 1000)}kbps`,
                mime: bestAudio.mime_type || "audio/mp4"
            }
        });

    } catch (e) {
        console.error("MP3 Error:", e.message);
        // Instance cache clear karala retry
        innertubeInstance = null;
        res.status(500).json({ status: false, error: "Download failed: " + e.message });
    }
});

// ── MP4 Download ──
app.get('/api/download/mp4', async (req, res) => {
    const url = req.query.url;
    const quality = parseInt(req.query.quality) || 720;
    if (!url) return res.status(400).json({ status: false, error: "URL parameter missing" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ status: false, error: "Invalid YouTube URL" });

    try {
        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId, 'ANDROID');

        const title = info.basic_info?.title || "YouTube Video";
        const duration = info.basic_info?.duration || 0;
        const thumbnail = info.basic_info?.thumbnail?.[0]?.url || "";

        // 1. Progressive formats (video + audio combined) - best for direct play
        const progressive = (info.streaming_data?.formats || [])
            .filter(f => f.url && f.mime_type?.includes('video'))
            .sort((a, b) => (b.height || 0) - (a.height || 0));

        // 2. Adaptive formats (video only - higher quality but no audio)
        const adaptive = (info.streaming_data?.adaptive_formats || [])
            .filter(f => f.url && f.mime_type?.includes('video'))
            .sort((a, b) => (b.height || 0) - (a.height || 0));

        // Progressive eke requested quality ekata ළඟම එක හොයනවා
        let bestMatch = null;
        
        // First try progressive (has audio built in - plays directly)
        if (progressive.length > 0) {
            bestMatch = progressive.find(f => (f.height || 0) <= quality) || progressive[progressive.length - 1];
        }

        // Progressive eke නැත්නම් adaptive try
        if (!bestMatch && adaptive.length > 0) {
            bestMatch = adaptive.find(f => (f.height || 0) <= quality) || adaptive[adaptive.length - 1];
        }

        if (!bestMatch) {
            return res.status(500).json({ status: false, error: "No video streams found for this video" });
        }

        // Available qualities list eka ගන්නවා
        const availableQualities = [
            ...progressive.map(f => `${f.height}p (progressive)`),
            ...adaptive.map(f => `${f.height}p (adaptive)`)
        ];

        res.json({
            status: true,
            data: {
                title: title,
                duration: duration,
                thumbnail: thumbnail,
                download: bestMatch.url,
                quality: `${bestMatch.height || '?'}p`,
                mime: bestMatch.mime_type || "video/mp4",
                available_qualities: [...new Set(availableQualities)]
            }
        });

    } catch (e) {
        console.error("MP4 Error:", e.message);
        innertubeInstance = null;
        res.status(500).json({ status: false, error: "Download failed: " + e.message });
    }
});

// ── Video Info (Bonus Endpoint) ──
app.get('/api/info', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL parameter missing" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ status: false, error: "Invalid YouTube URL" });

    try {
        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId, 'ANDROID');
        const basic = info.basic_info || {};

        res.json({
            status: true,
            data: {
                title: basic.title || "Unknown",
                duration: basic.duration || 0,
                channel: basic.channel?.name || basic.author || "Unknown",
                views: basic.view_count || 0,
                thumbnail: basic.thumbnail?.[0]?.url || "",
                video_id: videoId
            }
        });
    } catch (e) {
        console.error("Info Error:", e.message);
        innertubeInstance = null;
        res.status(500).json({ status: false, error: "Failed to get video info: " + e.message });
    }
});

module.exports.handler = serverless(app);
