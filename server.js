const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// 📂 Configurations
const COOKIES_FILE = "./youtube-cookies.txt";
const YTDLP_PATH = path.join(__dirname, "yt-dlp");
const FFmpeg_PATH = path.join(__dirname, "ffmpeg/ffmpeg");  
const DOWNLOAD_FOLDER = path.join(__dirname, "download");

// 📂 Ensure Download Folder Exists
if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    console.log("🚀 Creating download folder...");
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

// 🔄 Install yt-dlp if Not Exists
const installYTDLP = () => {
    if (!fs.existsSync(YTDLP_PATH)) {
        console.log("🔄 Downloading yt-dlp...");
        exec(
            `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${YTDLP_PATH} && chmod +x ${YTDLP_PATH}`,
            (error) => {
                if (error) {
                    console.error("❌ yt-dlp Download Failed:", error.message);
                } else {
                    console.log("✅ yt-dlp Installed Successfully!");
                }
            }
        );
    }
};

// 🔄 Install FFmpeg Without `apt`
const installFFmpeg = () => {
    if (!fs.existsSync(FFmpeg_PATH)) {
        console.log("🔄 Downloading FFmpeg...");
        exec(
            `mkdir -p ffmpeg && cd ffmpeg && curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-i686-static.tar.xz -o ffmpeg.tar.xz && tar -xJf ffmpeg.tar.xz --strip-components=1 && chmod +x ffmpeg`,
            (error) => {
                if (error) {
                    console.error("❌ FFmpeg Download Failed:", error.message);
                } else {
                    console.log("✅ FFmpeg Installed Successfully!");
                }
            }
        );
    } else {
        console.log("✅ FFmpeg Already Installed.");
    }
};

// 🛠 Install Dependencies on Server Start
installYTDLP();
installFFmpeg();

// 🔗 Serve Download Folder Publicly
app.use("/download", express.static(DOWNLOAD_FOLDER));

// 📌 API Root
app.get("/", (req, res) => {
    res.send("✅ YouTube Video Downloader API is Running!");
});

// 📥 Download API
app.get("/download", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ status: "error", message: "❌ Video URL required!" });
    }

    // 🆕 Unique File Name
    const timestamp = Date.now();
    const fileName = `video_${timestamp}.mp4`;
    const outputPath = path.join(DOWNLOAD_FOLDER, fileName);
    const downloadUrl = `${BASE_URL}/download/video_${timestamp}.mp4`;

    // 🔻 yt-dlp Command for MP4 Download
    let command = `${YTDLP_PATH} --ffmpeg-location ${FFmpeg_PATH} --no-check-certificate -o "${outputPath}" -f "best[ext=mp4]"`;

    if (fs.existsSync(COOKIES_FILE)) {
        console.log("✅ Cookies file found, using it...");
        command += ` --cookies ${COOKIES_FILE}`;
    } else {
        console.warn("⚠️ Cookies file not found. Some videos may not download.");
    }

    command += ` "${videoUrl}"`;

    // ✅ Background Download (Faster API Response)
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Download Error:", stderr);
        } else {
            console.log("✅ Download Success:", stdout);

            // 🔥 **Auto-delete file after 10 minutes**
            setTimeout(() => {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                    console.log(`🗑️ Deleted: ${outputPath} (After 10 minutes)`);
                }
            }, 10 * 60 * 1000); // 10 minutes
        }
    });

    // 🌟 **Immediately return the download link**
    res.json({
        status: "success",
        title: `YouTube Video ${timestamp}`,
        download_url: downloadUrl,
        message: "⏳ Video is downloading, link will be ready in a few seconds!"
    });
});

// 🚀 Start Server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
