const express = require('express');
const serverless = require('serverless-http');
const app = express();

// ════════════════════════════════════════════════════
// 🎵 NN TECH YouTube Downloader API v3.1
// ✅ Uses youtubei.js (YouTube InnerTube) - No external APIs!
// ✅ Direct YouTube scraping - never goes down
// 🔧 FIX: getInfo() + multi-client fallback
// ════════════════════════════════════════════════════

let innertubeInstance = null;

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

function extractVideoId(url) {
    if (!url) return null;
    // URL එකේ query params (si=...) strip කරනවා
    const cleanUrl = url.split('?si=')[0].split('&si=')[0];
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = cleanUrl.match(p);
        if (m) return m[1];
    }
    // Last resort: URL එකේ v= parameter ගන්නවා
    try {
        const u = new URL(url);
        const v = u.searchParams.get('v');
        if (v && v.length === 11) return v;
    } catch (_) {}
    return null;
}

// 🔥 Multi-client fallback: ANDROID eke නැත්නම් IOS, ඊට පස්සේ TV
const CLIENT_TYPES = ['ANDROID', 'IOS', 'TV_EMBEDDED', 'WEB'];

async function getVideoInfo(yt, videoId) {
    let lastError = null;
    
    for (const client of CLIENT_TYPES) {
        try {
            // 🔥 getInfo() use karanava (getBasicInfo() nemei!)
            // getInfo() eka streams signature decrypt karanava automatically
            const info = await yt.getInfo(videoId, client);
            
            // Streaming data check
            const sd = info.streaming_data;
            if (!sd) continue;
            
            const allFormats = [
                ...(sd.formats || []),
                ...(sd.adaptive_formats || [])
            ];
            
            // URL thiyena format ekak hoyaganna
            const hasUrls = allFormats.some(f => f.url || f.decipher_url);
            if (hasUrls) {
                console.log(`✅ Got streams from client: ${client} (${allFormats.length} formats)`);
                return { info, client };
            }
            
            console.log(`⚠️ Client ${client}: ${allFormats.length} formats but no URLs`);
        } catch (e) {
            lastError = e;
            console.log(`❌ Client ${client} failed:`, e.message);
        }
    }
    
    throw lastError || new Error("All clients failed to get stream URLs");
}

// Format එකෙන් URL ගන්න helper
function getFormatUrl(format) {
    return format.url || format.decipher_url || format.uri || null;
}

// ── Root ──
app.get('/', (req, res) => {
    res.json({ 
        status: true,
        message: "YouTube Downloader API is Active (InnerTube v3.1)", 
        owner: "NN TECH",
        version: "3.1.0",
        engine: "youtubei.js (InnerTube - Signature Decryption)",
        endpoints: [
            "/api/download/mp3?url=<youtube_url>",
            "/api/download/mp4?url=<youtube_url>&quality=<360|480|720|1080>",
            "/api/info?url=<youtube_url>"
        ] 
    });
});

// ── MP3 Download ──
app.get('/api/download/mp3', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL parameter missing" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ status: false, error: "Invalid YouTube URL. Video ID: null" });

    try {
        const yt = await getInnertube();
        const { info, client } = await getVideoInfo(yt, videoId);
        const sd = info.streaming_data;

        const title = info.basic_info?.title || "YouTube Audio";
        const duration = info.basic_info?.duration || 0;
        const thumb = info.basic_info?.thumbnail?.[0]?.url || "";

        // 1️⃣ Audio-only adaptive formats
        const audioFormats = (sd.adaptive_formats || [])
            .filter(f => {
                const mime = f.mime_type?.toString() || "";
                return mime.includes('audio') && getFormatUrl(f);
            })
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length > 0) {
            const best = audioFormats[0];
            return res.json({
                status: true,
                data: {
                    title, duration, thumbnail: thumb,
                    download: getFormatUrl(best),
                    quality: `${Math.round((best.bitrate || 128000) / 1000)}kbps`,
                    mime: best.mime_type?.toString() || "audio/mp4",
                    client_used: client
                }
            });
        }

        // 2️⃣ Fallback: Progressive (audio+video combined)
        const progressive = (sd.formats || [])
            .filter(f => getFormatUrl(f))
            .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0)); // lowest bitrate = smallest file

        if (progressive.length > 0) {
            const fallback = progressive[0];
            return res.json({
                status: true,
                data: {
                    title, duration, thumbnail: thumb,
                    download: getFormatUrl(fallback),
                    quality: `${fallback.height || '?'}p (mixed stream)`,
                    mime: fallback.mime_type?.toString() || "video/mp4",
                    note: "Pure audio unavailable, sending lowest quality video+audio",
                    client_used: client
                }
            });
        }

        res.status(500).json({ 
            status: false, 
            error: "No audio streams found",
            debug: {
                video_id: videoId,
                adaptive_count: (sd.adaptive_formats || []).length,
                progressive_count: (sd.formats || []).length,
                client_used: client
            }
        });

    } catch (e) {
        console.error("MP3 Error:", e.message);
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
        const { info, client } = await getVideoInfo(yt, videoId);
        const sd = info.streaming_data;

        const title = info.basic_info?.title || "YouTube Video";
        const duration = info.basic_info?.duration || 0;
        const thumb = info.basic_info?.thumbnail?.[0]?.url || "";

        // 1️⃣ Progressive (video+audio) — Direct play venava
        const progressive = (sd.formats || [])
            .filter(f => {
                const mime = f.mime_type?.toString() || "";
                return mime.includes('video') && getFormatUrl(f);
            })
            .sort((a, b) => (b.height || 0) - (a.height || 0));

        // 2️⃣ Adaptive (video only — higher quality)
        const adaptive = (sd.adaptive_formats || [])
            .filter(f => {
                const mime = f.mime_type?.toString() || "";
                return mime.includes('video') && getFormatUrl(f);
            })
            .sort((a, b) => (b.height || 0) - (a.height || 0));

        // Progressive eke quality match karanna try karanava
        let bestMatch = null;
        let matchSource = "";

        if (progressive.length > 0) {
            bestMatch = progressive.find(f => (f.height || 0) <= quality) || progressive[progressive.length - 1];
            matchSource = "progressive (audio+video)";
        }

        // Progressive eke quality adu nam adaptive eken try
        if ((!bestMatch || (bestMatch.height || 0) < quality) && adaptive.length > 0) {
            const adaptiveMatch = adaptive.find(f => (f.height || 0) <= quality) || adaptive[adaptive.length - 1];
            if (!bestMatch || (adaptiveMatch.height || 0) > (bestMatch.height || 0)) {
                bestMatch = adaptiveMatch;
                matchSource = "adaptive (video only)";
            }
        }

        if (!bestMatch) {
            return res.status(500).json({ 
                status: false, 
                error: "No video streams found",
                debug: { videoId, progressive: progressive.length, adaptive: adaptive.length }
            });
        }

        const availableQualities = [
            ...progressive.map(f => `${f.height}p`),
            ...adaptive.map(f => `${f.height}p (video-only)`)
        ];

        res.json({
            status: true,
            data: {
                title, duration, thumbnail: thumb,
                download: getFormatUrl(bestMatch),
                quality: `${bestMatch.height || '?'}p`,
                source: matchSource,
                mime: bestMatch.mime_type?.toString() || "video/mp4",
                available_qualities: [...new Set(availableQualities)],
                client_used: client
            }
        });

    } catch (e) {
        console.error("MP4 Error:", e.message);
        innertubeInstance = null;
        res.status(500).json({ status: false, error: "Download failed: " + e.message });
    }
});

// ── Video Info ──
app.get('/api/info', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, error: "URL parameter missing" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ status: false, error: "Invalid YouTube URL" });

    try {
        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId, 'ANDROID');
        const b = info.basic_info || {};

        res.json({
            status: true,
            data: {
                title: b.title || "Unknown",
                duration: b.duration || 0,
                channel: b.channel?.name || b.author || "Unknown",
                views: b.view_count || 0,
                thumbnail: b.thumbnail?.[0]?.url || "",
                video_id: videoId
            }
        });
    } catch (e) {
        innertubeInstance = null;
        res.status(500).json({ status: false, error: "Info failed: " + e.message });
    }
});

module.exports.handler = serverless(app);
