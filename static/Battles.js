const base = window.location.origin;

// add event listener to show the gameCode element when createGame button is clicked
document.getElementById('createGame').addEventListener('click', function() {
    // Hide create button and show class selection
    document.getElementById('createGame').style.display = 'none';
    document.getElementById('classSelection').style.display = 'block';
    fetchClasses(); // Fetch available classes when create game is clicked
});

// Function to fetch available classes from the server
async function fetchClasses() {
    const data = await fetchRequest('/data', { data: 'Name, Classes' });
    const classSelect = document.getElementById('class-select');
    data.Classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.id;
        option.textContent = classItem.name;
        classSelect.appendChild(option);
    });
}

// Function to handle class selection and fetch corresponding units
document.getElementById('class-select').addEventListener('change', function() {
    const unitSelect = document.getElementById('unit-select');
    unitSelect.innerHTML = '<option value="">Select a unit</option>';
    unitSelect.disabled = true;

    const selectedClassId = this.value;
    if (!selectedClassId) return;

    fetchRequest('/get-units', { classId: selectedClassId })
        .then(data => {
            if (data.units) {
                data.units.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit;
                    option.textContent = unit;
                    unitSelect.appendChild(option);
                });
                unitSelect.disabled = false;
            }
        });
})


// Modify the confirm class selection event listener
document.getElementById('confirmClass').addEventListener('click', function() {
    const classId = document.getElementById('class-select').value;
    const unitName = document.getElementById('unit-select').value;

    if (!classId || !unitName) {
        alert('Please select both a class and a unit.');
        return;
    }

    // Hide class selection and show game mode selection
    document.getElementById('classSelection').style.display = 'none';
    document.getElementById('gameModeSelection').style.display = 'block';
});

// Add event listener for game mode selection
document.getElementById('confirmGameMode').addEventListener('click', function() {
    const gameMode = document.getElementById('gameMode').value;
    const classId = document.getElementById('class-select').value;
    const unitName = document.getElementById('unit-select').value;
    const gameCode = Math.floor(1000000 + Math.random() * 9000000);
    
    // Post game data to database
    fetch('/post_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sheet: 'Battles',
            data: {
                id: gameCode,
                class: classId,
                gameMode: gameMode,
                unit: unitName
            }
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'success') {
            // Show game code after successful database update
            document.getElementById('gameModeSelection').style.display = 'none';
            document.getElementById('gameCodeText').textContent = gameCode;
            document.getElementById('gameModeDisplay').textContent = gameMode;
            document.getElementById('gameCode').style.display = 'block';
            
            document.getElementById('copyCode').addEventListener('click', function() {
                let url = base + "/battle/" + gameCode;
                navigator.clipboard.writeText(url);
            });
        } else {
            alert('Error creating game. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating game. Please try again.');
    });
});

//add event listeners to joinGame and joinCreated buttons
document.getElementById('joinGame').addEventListener('click', function() {
    // hide createGame element
    document.getElementById('createGame').style.display = 'none';
    // get gameCode from input field
    let gameCode = document.getElementById('joinCode').value;
    // redirect to base+/battle/gameCode
    let url = base + "/battle/"+gameCode;
    window.location.href = url;
});

document.getElementById('joinCreated').addEventListener('click', function() {
    // hide createGame element
    document.getElementById('createGame').style.display = 'none';
    // get gameCode from input field
    let gameCode = document.getElementById('gameCodeText').textContent;
    // redirect to base+/battle/gameCode
    let url = base + "/battle/"+gameCode;
    window.location.href = url;
})

