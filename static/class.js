// classData is predefined in the html

// create user bubbles
var userListContainer = document.getElementById('user-list');
members = classData['members'].split(", ")
members.forEach(function(user) {
    var userBubble = document.createElement('div');
    userBubble.textContent = user;
    userBubble.classList.add('user-bubble');
    userBubble.addEventListener('click', function() {
        window.location.href = 'profile.html?user=' + user; // link to profile page
    });
    userListContainer.appendChild(userBubble);
});

// 