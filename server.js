const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// YouTube Cookies File Path
const COOKIES_FILE = "./youtube-cookies.txt";

// Puppeteer Chrome Path (If Needed in Future)
const CHROME_PATH = "/data/data/com.termux/files/usr/bin/chromium";

// yt-dlp Binary Path
const YTDLP_PATH = path.join(__dirname, "yt-dlp");

// Download Folder Path (Ye file manager me dikhne ke liye serve hoga)
const DOWNLOADS_FOLDER = path.join(__dirname, "downloads");

// Ensure Downloads Folder Exists
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
    fs.mkdirSync(DOWNLOADS_FOLDER);
}

// Serve Downloads Folder Publicly
app.use("/downloads", express.static(DOWNLOADS_FOLDER));

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

        // Output File Path
        const outputFile = path.join(DOWNLOADS_FOLDER, "video.mp4");

        // Construct yt-dlp Command
        let command = `${YTDLP_PATH} --no-check-certificate -o "${outputFile}" --merge-output-format mp4 --format "bestvideo[ext=mp4]+bestaudio[ext=m4a]"`;

        // Check if Cookies File Exists
        if (fs.existsSync(COOKIES_FILE)) {
            console.log("✅ Cookies file found, using it...");
            command += ` --cookies ${COOKIES_FILE}`;
        } else {
            console.warn("⚠️ Warning: Cookies file not found. Some videos may not download.");
        }

        command += ` "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Download Error:", error.message);
                return res.status(500).send(`❌ Video Download Failed! Error: ${stderr}`);
            }

            console.log("✅ Download Success:", stdout);

            // Send Download Link
            res.send(`✅ Download Successful! <br> <a href="/downloads/video.mp4">Click Here to Download</a>`);
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
