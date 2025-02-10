const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// yt-dlp Binary Path
const YTDLP_PATH = path.join(__dirname, "yt-dlp");

// ffmpeg Path
const FFMPEG_PATH = "ffmpeg"; // Ensure ffmpeg is installed on your system

// Download Folder Path
const DOWNLOADS_FOLDER = path.join(__dirname, "downloads");

// Ensure Downloads Folder Exists
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
    fs.mkdirSync(DOWNLOADS_FOLDER);
}

// Serve Downloads Folder Publicly
app.use("/downloads", express.static(DOWNLOADS_FOLDER));

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

        // Temporary file names
        const videoFile = path.join(DOWNLOADS_FOLDER, "video.mp4");
        const audioFile = path.join(DOWNLOADS_FOLDER, "audio.m4a");
        const outputFile = path.join(DOWNLOADS_FOLDER, "final_video.mp4");

        // yt-dlp Command for Separate Video & Audio
        let command = `${YTDLP_PATH} --no-check-certificate -o "${DOWNLOADS_FOLDER}/video.%(ext)s" --format "bv*[ext=mp4]+ba[ext=m4a]" "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Download Error:", error.message);
                return res.status(500).send(`❌ Video Download Failed! Error: ${stderr}`);
            }

            console.log("✅ Download Success:", stdout);

            // Merge Video & Audio using ffmpeg
            const mergeCommand = `${FFMPEG_PATH} -i "${videoFile}" -i "${audioFile}" -c:v copy -c:a aac "${outputFile}" -y`;

            exec(mergeCommand, (mergeError, mergeStdout, mergeStderr) => {
                if (mergeError) {
                    console.error("❌ Merge Error:", mergeError.message);
                    return res.status(500).send("❌ Video Merge Failed!");
                }

                console.log("✅ Merge Success:", mergeStdout);

                // Send Download Link
                res.send(`✅ Download Successful! <br> <a href="/downloads/final_video.mp4">Click Here to Download</a>`);
            });
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
