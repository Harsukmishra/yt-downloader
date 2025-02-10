const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// 📂 Configurations
const COOKIES_FILE = "./youtube-cookies.txt";
const YTDLP_PATH = path.join(__dirname, "yt-dlp");
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

// 🔄 Install FFmpeg if Not Exists
const installFFmpeg = () => {
    console.log("🔄 Checking FFmpeg installation...");
    exec("ffmpeg -version", (error, stdout, stderr) => {
        if (error) {
            console.log("⚠️ FFmpeg not found. Installing...");
            exec(
                `apt update && apt install -y ffmpeg`,
                (err, out, errOut) => {
                    if (err) {
                        console.error("❌ FFmpeg Installation Failed:", errOut);
                    } else {
                        console.log("✅ FFmpeg Installed Successfully!");
                    }
                }
            );
        } else {
            console.log("✅ FFmpeg is already installed.");
        }
    });
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

// 📥 Download Route
app.get("/download", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send("❌ Error: Video URL required!");
    }

    try {
        console.log(`🔄 Fetching Video: ${videoUrl}`);

        // 📂 Unique Filename
        const timestamp = Date.now();
        const outputFile = path.join(DOWNLOAD_FOLDER, `video_${timestamp}.mp4`);

        // 🔻 yt-dlp Command with FFmpeg Support
        let command = `${YTDLP_PATH} --no-check-certificate -o "${outputFile}" -f "bestvideo+bestaudio" --merge-output-format mp4`;

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
                return res.status(500).send(`❌ Video Download Failed! Error: ${stderr}`);
            }

            console.log("✅ Download Success:", stdout);

            // 🔎 Wait & Check File Existence
            setTimeout(() => {
                if (fs.existsSync(outputFile)) {
                    console.log("✅ File exists, sending response...");
                    res.send(`✅ Download Successful! <br> <a href="/download/video_${timestamp}.mp4">Click Here to Download</a>`);
                } else {
                    console.error("❌ File not found in download folder!");
                    res.status(500).send("❌ Error: File not found after download!");
                }
            }, 5000);
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).send("❌ Internal Server Error!");
    }
});

// 🚀 Start Server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
