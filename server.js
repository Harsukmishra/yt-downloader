const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

// yt-dlp Binary Path
const YTDLP_PATH = path.join(__dirname, "yt-dlp");

// ffmpeg Path
const FFMPEG_PATH = "ffmpeg";

// Download Folder Path
const DOWNLOADS_FOLDER = path.join(__dirname, "downloads");

// Ensure Downloads Folder Exists
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
    fs.mkdirSync(DOWNLOADS_FOLDER);
}

// Function to Install yt-dlp if Not Installed
const installYTDLP = () => {
    if (!fs.existsSync(YTDLP_PATH)) {
        console.log("🔄 Installing yt-dlp...");
        exec(
            `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${YTDLP_PATH} && chmod +x ${YTDLP_PATH}`,
            (error) => {
                if (error) {
                    console.error("❌ yt-dlp Installation Failed:", error.message);
                } else {
                    console.log("✅ yt-dlp Installed Successfully!");
                }
            }
        );
    }
};

// Function to Install ffmpeg if Not Installed
const installFFMPEG = () => {
    exec(`${FFMPEG_PATH} -version`, (error) => {
        if (error) {
            console.log("🔄 Installing ffmpeg...");
            exec(
                "pkg install -y ffmpeg || sudo apt install -y ffmpeg",
                (installError, stdout, stderr) => {
                    if (installError) {
                        console.error("❌ ffmpeg Installation Failed:", stderr);
                    } else {
                        console.log("✅ ffmpeg Installed Successfully!");
                    }
                }
            );
        } else {
            console.log("✅ ffmpeg Already Installed!");
        }
    });
};

// Install yt-dlp & ffmpeg on Server Start
installYTDLP();
installFFMPEG();

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

        // Unique File Name
        const timestamp = Date.now();
        const videoFile = path.join(DOWNLOADS_FOLDER, `video_${timestamp}.mp4`);
        const audioFile = path.join(DOWNLOADS_FOLDER, `audio_${timestamp}.m4a`);
        const outputFile = path.join(DOWNLOADS_FOLDER, `final_${timestamp}.mp4`);

        // yt-dlp Command for Separate Video & Audio
        let command = `${YTDLP_PATH} --no-check-certificate -o "${DOWNLOADS_FOLDER}/video_${timestamp}.%(ext)s" --format "bv*[ext=mp4]+ba[ext=m4a]" "${videoUrl}"`;

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

                // **🔽 Auto-Download in User's File Manager 🔽**
                res.download(outputFile, "downloaded_video.mp4", (err) => {
                    if (err) {
                        console.error("❌ File Download Error:", err);
                        res.status(500).send("❌ File Download Failed!");
                    } else {
                        console.log("✅ File Sent to User for Download!");

                        // **🔥 Delete Files from Server After Download 🔥**
                        setTimeout(() => {
                            [videoFile, audioFile, outputFile].forEach((file) => {
                                if (fs.existsSync(file)) {
                                    fs.unlinkSync(file);
                                    console.log(`🗑 Deleted: ${file}`);
                                }
                            });
                        }, 5000); // Delete after 5 seconds
                    }
                });
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
