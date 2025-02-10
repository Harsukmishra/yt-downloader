const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// Configurations
const COOKIES_FILE = "./youtube-cookies.txt";
const YTDLP_PATH = path.join(__dirname, "yt-dlp");
const DOWNLOAD_FOLDER = path.join(__dirname, "download"); // Fixed path

// Ensure Download Folder Exists
if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

// Serve Download Folder Publicly
app.use("/download", express.static(DOWNLOAD_FOLDER));

// Install yt-dlp if Not Exists
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

        // Unique Filename for Each Download
        const timestamp = Date.now();
        const outputFile = path.join(DOWNLOAD_FOLDER, `video_${timestamp}.mp4`);

        // yt-dlp Command
        let command = `${YTDLP_PATH} --no-check-certificate -o "${outputFile}" --merge-output-format mp4 --format "bv*+ba/best"`;

        if (fs.existsSync(COOKIES_FILE)) {
            console.log("✅ Cookies file found, using it...");
            command += ` --cookies ${COOKIES_FILE}`;
        } else {
            console.warn("⚠️ Warning: Cookies file not found. Some videos may not download.");
        }

        command += ` "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Download Error:", stderr);
                return res.status(500).send(`❌ Video Download Failed! Error: ${stderr}`);
            }

            console.log("✅ Download Success:", stdout);

            // Wait and Check if File Exists Before Sending Response
            setTimeout(() => {
                if (fs.existsSync(outputFile)) {
                    console.log("✅ File exists, sending response...");
                    res.send(`✅ Download Successful! <br> <a href="/download/video_${timestamp}.mp4">Click Here to Download</a>`);
                } else {
                    console.error("❌ File not found in download folder!");
                    res.status(500).send("❌ Error: File not found after download!");
                }
            }, 5000); // Delay to allow file to be properly saved

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
