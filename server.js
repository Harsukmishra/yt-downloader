const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const puppeteer = require("puppeteer-core");
const app = express();

// YouTube Cookies File Path (If Available)
const COOKIES_FILE = "./cookies.txt";

// Puppeteer Chrome Path (Android Termux Users)
const CHROME_PATH = "/data/data/com.termux/files/usr/bin/chromium";

// Function to Install yt-dlp if not installed
const installYTDLP = () => {
    exec("pip install yt-dlp", (error, stdout, stderr) => {
        if (error) {
            console.error("❌ yt-dlp Installation Failed:", error.message);
        } else {
            console.log("✅ yt-dlp Installed Successfully!");
        }
    });
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

        // Download Command with Cookies Support
        let command = `yt-dlp --no-check-certificate -o "downloaded_video.%(ext)s" --format best`;

        // Agar cookies.txt file hai, to use karega
        if (fs.existsSync(COOKIES_FILE)) {
            command += ` --cookies ${COOKIES_FILE}`;
        }

        command += ` "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Download Error:", error.message);
                return res.status(500).send("❌ Video Download Failed!");
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

// Puppeteer Browser Test Route
app.get("/check-browser", async (req, res) => {
    try {
        const browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto("https://www.youtube.com");

        const title = await page.title();
        await browser.close();

        res.send(`✅ Browser Working! YouTube Title: ${title}`);
    } catch (err) {
        res.status(500).send(`❌ Puppeteer Error: ${err.message}`);
    }
});

// Start Server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
