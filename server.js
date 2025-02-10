const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// YouTube Cookies File Path (Updated)
const COOKIES_FILE = "./youtube-cookies.txt";

// Puppeteer Chrome Path (If Needed in Future)
const CHROME_PATH = "/data/data/com.termux/files/usr/bin/chromium";

// yt-dlp Binary Path
const YTDLP_PATH = path.join(__dirname, "yt-dlp");

// Function to Download yt-dlp Binary if Not Installed
const installYTDLP = () => {
    if (!fs.existsSync(YTDLP_PATH)) {
        console.log("🔄 Downloading yt-dlp...");
        exec(
            `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${YTDLP_PATH} && chmod +x ${YTDLP_PATH}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error("❌ yt-dlp Download Failed:", error.message);
                } else {
                    console.log("✅ yt-dlp Installed Successfully!");
                }
            }
        );
    }
};

// Install yt-dlp on Server Start
installYTDLP();

app.get("/", (req, res) => {
    res.send("✅ YouTube Video Downloader API is Running!");
});

app.get("/download", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send("❌ Error: Video URL required!");
    }

    try {
        console.log(`🔄 Fetching Video: ${videoUrl}`);

        // Construct yt-dlp Command
        let command = `${YTDLP_PATH} --no-check-certificate -o "downloaded_video.%(ext)s"`;

        // Check if Cookies File Exists
        if (fs.existsSync(COOKIES_FILE)) {
            console.log("✅ Cookies file found, using it...");
            command += ` --cookies ${COOKIES_FILE}`;
        } else {
            console.warn("⚠️ Warning: Cookies file not found. Some videos may not download.");
        }

        // Add Format Selection (Best Available)
        command += ` --format "bv*+ba/b" "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Download Error:", error.message);
                return res.status(500).send(`❌ Video Download Failed! Error: ${stderr}`);
            }

            console.log("✅ Download Success:", stdout);

            // Send the downloaded file to the client
            const filePath = "downloaded_video.mp4";
            if (fs.existsSync(filePath)) {
                res.download(filePath, "video.mp4", (err) => {
                    if (err) console.error("❌ File Send Error:", err);
                    // Delete file after sending
                    fs.unlinkSync(filePath);
                });
            } else {
                res.status(500).send("❌ Downloaded File Not Found!");
            }
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).send("❌ Internal Server Error!");
    }
});

// Start Server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
