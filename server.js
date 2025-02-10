const express = require('express');
const ytDl = require('yt-dlp-exec');
const app = express();
const PORT = process.env.PORT || 8000;

// Home route to check API status
app.get('/', (req, res) => {
  res.send('✅ YouTube Video Downloader API is running!');
});

// Download route to handle video download
app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;

  // Validate YouTube URL
  if (!videoUrl) {
    return res.status(400).json({ error: '❌ Invalid YouTube URL' });
  }

  try {
    // Set headers for download
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    res.header('Content-Type', 'video/mp4');

    // Fetch and stream video using yt-dlp
    const videoStream = ytDl(videoUrl, {
      output: '-',
      format: 'bestvideo+bestaudio/best',
    });

    // Pipe the video stream to response
    videoStream.pipe(res);
    
    videoStream.on('error', (err) => {
      console.error('Error during video streaming:', err);
      res.status(500).json({ error: '❌ Error downloading video' });
    });

  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).json({ error: '❌ Error downloading video' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

