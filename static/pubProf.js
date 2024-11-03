async function postFriend(data) {
    try {
        await fetchRequest('/post-friend', data);
        // Show success message
        const button = document.getElementById('invite-friend');
        button.innerHTML = '<i class="fas fa-check"></i> Friend Request Sent';
        button.style.backgroundColor = '#888';
        button.disabled = true;
    } catch (error) {
        console.error('Error sending friend request:', error);
    }
}

function inviteFriend() {
    let location = window.location.href;
    let osis = location.slice(-7);
    let data = {
        "OSIS": "void",
        "status": "pending",
        "targetOSIS": osis,
        "id": Math.floor(Math.random() * 10000)
    };
    postFriend(data);
}

// Add getFile function
async function getFile(fileId) {
    const data = await fetchRequest('/get-file', {file: fileId});
    let file = data.file;
    file = file.replace('dataimage/pngbase64', 'data:image/png;base64,');
    file = file.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
    file = file.slice(0, -1);
    return file;
}

// Update the profile picture when page loads
window.addEventListener('load', async function() {
    const profilePic = document.querySelector('.profile-avatar');
    if (!profilePic) return;
    
    if (profileData.fileId && profileData.fileId !== "" && profileData.fileId !== "default") {
        try {
            const imageData = await getFile(profileData.fileId);
            profilePic.src = imageData;
        } catch (error) {
            console.error('Error loading profile picture:', error);
            profilePic.src = "/static/media/default-profile.png";
        }
    } else {
        profilePic.src = "/static/media/default-profile.png";
    }
});
