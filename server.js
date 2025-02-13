const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(cors()); // ✅ CORS Enable

// 📂 Configurations
const COOKIES_FILE = "./youtube-cookies.txt";
const YTDLP_PATH = path.join(__dirname, "yt-dlp");
const FFmpeg_PATH = path.join(__dirname, "ffmpeg/ffmpeg"); 
const DOWNLOAD_FOLDER = path.join(__dirname, "download");

// ✅ Install Dependencies for yt-dlp & FFmpeg
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

// 🔗 Serve Download Folder Publicly (Temporarily)
app.use("/download", express.static(DOWNLOAD_FOLDER));

// 📌 API Root
app.get("/", (req, res) => {
    res.send("✅ YouTube Video Downloader API is Running!");
});

// 📥 Download Route
app.get("/download", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "❌ Error: Video URL required!" });
    }

    try {
        console.log(`🔄 Fetching Video: ${videoUrl}`);

        // 📂 Unique Filename
        const timestamp = Date.now();
        const outputFile = path.join(DOWNLOAD_FOLDER, `video_${timestamp}.mp4`);

        // 🔻 yt-dlp Command for Direct MP4 Download
        let command = `${YTDLP_PATH} --ffmpeg-location ${FFmpeg_PATH} --no-check-certificate -o "${outputFile}" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]"`;

        if (fs.existsSync(COOKIES_FILE)) {
            console.log("✅ Cookies file found, using it...");
            command += ` --cookies ${COOKIES_FILE}`;
        } else {
            console.warn("⚠️ Cookies file not found. Some videos may not download.");
        }

        command += ` "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Download Error:", stderr);
                return res.status(500).json({ error: `❌ Video Download Failed! Error: ${stderr}` });
            }

            console.log("✅ Download Success:", stdout);

            // 🔎 Wait & Check File Existence
            setTimeout(() => {
                if (fs.existsSync(outputFile)) {
                    console.log("✅ File Ready for Download:", outputFile);

                    // ⬇️ Send the MP4 file directly
                    res.sendFile(outputFile, (err) => {
                        if (err) {
                            console.error("❌ Error sending file:", err);
                            res.status(500).json({ error: "❌ Error: Unable to send the file." });
                        } else {
                            console.log("✅ File Sent Successfully!");
                        }
                    });

                    // ⏳ Schedule the file to be deleted after 5 minutes
                    setTimeout(() => {
                        console.log("🗑️ Deleting File:", outputFile);
                        fs.unlinkSync(outputFile); 
                    }, 5 * 60 * 1000); // 5 minutes in milliseconds

                } else {
                    console.error("❌ MP4 File Not Found!");
                    res.status(500).json({ error: "❌ Error: MP4 file not found after download!" });
                }
            }, 15000); // 🔄 15 sec wait to ensure file download is complete

        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).json({ error: "❌ Internal Server Error!" });
    }
});

// सर्वर शुरू करने के बाद
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// पिंग फीचर जोड़ना
setInterval(() => {
    exec("curl http://localhost:8000", (error, stdout, stderr) => {
        if (error) {
            console.error("❌ Error while pinging server:", stderr);
        } else {
            console.log("✅ Server is active and pinged successfully!");
        }
    });
}, 4 * 60 * 1000);  // हर 4 मिनट में पिंग करना
