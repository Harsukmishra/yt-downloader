const express = require("express");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();

// 📂 Configurations
const COOKIES_FILE = "./youtube-cookies.txt";
const YTDLP_PATH = path.join(__dirname, "yt-dlp");
const FFmpeg_PATH = path.join(__dirname, "ffmpeg/ffmpeg");
const DOWNLOAD_FOLDER = path.join(__dirname, "download");

// ✅ Install or Update yt-dlp
const installYTDLP = () => {
    console.log("🔄 Checking yt-dlp version...");
    spawn(YTDLP_PATH, ["--version"]).on("error", () => {
        console.log("⚠️ yt-dlp not found. Installing latest version...");
        const downloadProcess = spawn("sh", ["-c", `
            rm -f ${YTDLP_PATH} &&
            curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${YTDLP_PATH} &&
            chmod +x ${YTDLP_PATH}
        `]);
        downloadProcess.on("close", () => console.log("✅ yt-dlp Installed Successfully!"));
    });
};

// 🔄 Install FFmpeg Without `apt`
const installFFmpeg = () => {
    if (!fs.existsSync(FFmpeg_PATH)) {
        console.log("🔄 Downloading FFmpeg...");
        const downloadProcess = spawn("sh", ["-c", `
            mkdir -p ffmpeg &&
            cd ffmpeg &&
            curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-i686-static.tar.xz -o ffmpeg.tar.xz &&
            tar -xJf ffmpeg.tar.xz --strip-components=1 &&
            chmod +x ffmpeg
        `]);
        downloadProcess.on("close", () => console.log("✅ FFmpeg Installed Successfully!"));
    } else {
        console.log("✅ FFmpeg Already Installed.");
    }
};

// 🛠 Install Dependencies on Server Start
installYTDLP();
installFFmpeg();

// 📂 Ensure Download Folder Exists
if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    console.log("🚀 Creating download folder...");
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

// 🔗 Serve Download Folder Publicly
app.use("/download", express.static(DOWNLOAD_FOLDER));

// 🚫 Rate Limit Setup to Prevent Overload
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // Max 20 requests per 10 min
    message: "❌ Too many requests, please try again later."
});
app.use(limiter);

// 📌 API Root
app.get("/", (req, res) => {
    res.send("✅ YouTube Video Downloader API is Running!");
});

// 📥 Download Route
app.get("/download", (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send("❌ Error: Video URL required!");
    }

    console.log(`🔄 Fetching Video: ${videoUrl}`);

    // 📂 Unique Filename
    const timestamp = Date.now();
    const outputFile = path.join(DOWNLOAD_FOLDER, `video_${timestamp}.mp4`);

    // 🔻 yt-dlp Command
    let commandArgs = [
        "--ffmpeg-location", FFmpeg_PATH,
        "--no-check-certificate",
        "--force-ipv4",
        "--geo-bypass",
        "-o", outputFile,
        "-f", "best[ext=mp4]",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        videoUrl
    ];

    if (fs.existsSync(COOKIES_FILE)) {
        console.log("✅ Cookies file found, using it...");
        commandArgs.push("--cookies", COOKIES_FILE);
    } else {
        console.warn("⚠️ Cookies file not found. Some videos may not download.");
    }

    const ytProcess = spawn(YTDLP_PATH, commandArgs);

    ytProcess.stdout.on("data", (data) => console.log(`yt-dlp: ${data}`));
    ytProcess.stderr.on("data", (data) => console.error(`yt-dlp error: ${data}`));

    ytProcess.on("close", (code) => {
        if (code !== 0) {
            console.error("❌ Download Error!");
            return res.status(500).send("❌ Video Download Failed!");
        }

        console.log("✅ Download Success!");

        // ⏳ Wait & Check File Existence
        setTimeout(() => {
            if (fs.existsSync(outputFile)) {
                console.log("✅ File Ready for Download:", outputFile);

                res.sendFile(outputFile, (err) => {
                    if (err) {
                        console.error("❌ Error sending file:", err);
                        res.status(500).send("❌ Error: Unable to send the file.");
                    } else {
                        console.log("✅ File Sent Successfully!");
                    }
                });

                // 🗑️ Delete File After 5 Minutes
                setTimeout(() => {
                    console.log("🗑️ Deleting File:", outputFile);
                    fs.unlinkSync(outputFile);
                }, 5 * 60 * 1000);

            } else {
                console.error("❌ MP4 File Not Found!");
                res.status(500).send("❌ Error: MP4 file not found after download!");
            }
        }, 5000);
    });
});

// सर्वर शुरू करने के बाद
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at https://kingstatus-video-downloader.onrender.com:${PORT}`);
});

// 🔄 Automatic Server Ping
setInterval(() => {
    spawn("curl", ["-s", "https://kingstatus-video-downloader.onrender.com"])
        .on("close", () => console.log("✅ Server is active and pinged successfully!"));
}, 4 * 60 * 1000);  // हर 4 मिनट में पिंग करना
