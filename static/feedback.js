let selectedFeatures = [];
const MAX_SELECTIONS = 3;

async function loadFeatures() {
    // Use fetch_data route to get features
    const response = await fetch('/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: 'Feedback'
        })
    });
    const data = await response.json();
    const features = data.Feedback || [];
    
    // Populate feature list
    const featureList = document.getElementById('feature-list');
    featureList.innerHTML = features.map(feature => `
        <div class="feature-item" data-id="${feature.id}">
            <span class="feature-name">${feature.feature}</span>
            <button class="vote-button" onclick="toggleVote('${feature.id}')">Vote</button>
            <span class="status">${feature.status}</span>
        </div>
    `).join('');

    // Update leaderboard
    updateLeaderboard(features);
}

function updateLeaderboard(features) {
    const leaderboard = document.getElementById('feature-leaderboard');
    const sortedFeatures = [...features].sort((a, b) => b.votes - a.votes);
    
    leaderboard.innerHTML = sortedFeatures.map((feature, index) => `
        <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
            <span class="rank">#${index + 1}</span>
            <span class="feature-name">${feature.feature}</span>
            <span class="votes">${feature.votes} votes</span>
            <span class="status">${feature.status}</span>
        </div>
    `).join('');
}

async function toggleVote(featureId) {
    if (selectedFeatures.includes(featureId)) {
        selectedFeatures = selectedFeatures.filter(id => id !== featureId);
    } else if (selectedFeatures.length < MAX_SELECTIONS) {
        selectedFeatures.push(featureId);
    }
    
    updateVoteButtons();
    await submitVotes(featureId);
}

async function submitVotes(featureId) {
    // Use update_data_route to increment votes
    const response = await fetch('/update_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sheet: 'Feedback',
            row_name: 'id',
            row_value: featureId,
            data: {
                votes: '+1' // Server should handle increment
            }
        })
    });
    
    if (response.ok) {
        loadFeatures(); // Refresh the display
    }
}

document.getElementById('submit-feature').addEventListener('click', async () => {
    const featureText = document.getElementById('new-feature').value.trim();
    if (!featureText) return;

    // Generate a random 5-digit ID
    const id = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Use post_data_route to add new feature
    const response = await fetch('/post_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sheet: 'Feedback',
            data: {
                id: id,
                feature: featureText,
                votes: 0,
                suggested_by: window.OSIS, // Assuming OSIS is available globally
                timestamp: new Date().toISOString(),
                status: 'pending'
            }
        })
    });

    if (response.ok) {
        document.getElementById('new-feature').value = '';
        loadFeatures();
    }
});

function updateVoteButtons() {
    const buttons = document.querySelectorAll('.vote-button');
    buttons.forEach(button => {
        const featureId = button.parentElement.dataset.id;
        if (selectedFeatures.includes(featureId)) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
        button.disabled = selectedFeatures.length >= MAX_SELECTIONS && 
                         !selectedFeatures.includes(featureId);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', loadFeatures); 