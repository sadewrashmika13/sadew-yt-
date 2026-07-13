# 🚀 YouTube Downloader API

A fast, lightweight, and reliable YouTube video/audio downloader API built with Node.js and deployed on Vercel.

[![Stars](https://img.shields.io/github/stars/NethminaNawanjana/yt-downld-api?style=social)](https://github.com/NethminaNawanjana/yt-downld-api)
[![Forks](https://img.shields.io/github/forks/NethminaNawanjana/yt-downld-api?style=social)](https://github.com/NethminaNawanjana/yt-downld-api/fork)

---

## 📺 About
Hi! I am **R.A Nethmina Nawanjana**. This API was developed to simplify downloading YouTube content efficiently. 
Check out my YouTube channel for more tech tutorials and updates: 
[**Subscribe to NN TECH**](https://youtube.com/@NNTECH)

---

## 🔗 Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/download/mp3?url=` | Download YouTube audio as MP3 |
| `GET` | `/api/download/mp4?url=` | Download YouTube video as MP4 |

---

## ⚡ Usage Example

**Request:**
```text
GET /api/download/mp3?url=[https://youtu.be/EXAMPLE_ID](https://youtu.be/EXAMPLE_ID)
