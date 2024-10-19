document.getElementById('inspire-button').addEventListener('click', function() {
    const userInput = document.getElementById('motivation-input').value;
    const requestBody = { data: userInput };

    fetchRequest('/inspire', requestBody)
        .then(response => {
            console.log(response);
            if (response.data) {
                // convert response.data from string to dictionary
                data = JSON.parse(response.data);
                document.getElementById('video-name').innerText = data.video_name;
                document.getElementById('video-url').innerText = "Watch Video";
                document.getElementById('video-url').href = data.video_url;

                // Set the iframe source to the video URL and display it
                const videoPlayer = document.getElementById('video-player');
                videoPlayer.src = `https://www.youtube.com/embed/${getYouTubeVideoId(data.video_url)}`;
                videoPlayer.style.display = 'block'; // Show the iframe
            } else {
                document.getElementById('video-name').innerText = "No video found.";
                document.getElementById('video-url').href = "#";
            }
        });
});

// Helper function to extract the video ID from the YouTube URL
function getYouTubeVideoId(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
}