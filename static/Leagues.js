// add event listener to create league button to show league form
const createLeagueButton = document.getElementById('createLeague');
const leagueForm = document.getElementById('leagueForm');
const userList = document.getElementById('userList');
const user_add_field = document.getElementById('addUsers');
console.log(userList);

createLeagueButton.addEventListener('click', () => {
    leagueForm.style.display = 'block';
    });



async function main() {
    // get all leagues
    const data = await fetchRequest('/data', { data: "Name, Users, Leagues" })
    const leagues = data.Leagues;
    const users = data.Users;
    
    set_create_user_add_EL(users, user_add_field, userList);
    displayLeagues(leagues);
    
    // Only try to hide loading wheel if it exists
    const loadingWheel = document.getElementById('loadingWheel');
    if (loadingWheel) {
        loadingWheel.style.display = 'none';
    }
}
main();


function displayLeagues(leagues) {
    console.log(leagues);
    // get league list
    const leagueList = document.getElementById('leagueList');
    // loop through all leagues
    leagues.forEach(league => {
        // create league element
        const leagueEl = document.createElement('div');
        // add to class
        leagueEl.classList.add('leagueEl');
        // add text
        leagueEl.innerText = league.Name;
        // redirect to league page when clicked
        leagueEl.addEventListener('click', () => {
            window.location.href = `/league/${league.id}`;
        });
        // add to leagueList
        leagueList.appendChild(leagueEl);
    });
}

// Initialize activity card selection
document.querySelectorAll('.activity-card').forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('selected');
    });
});

// add event listener when form is submitted
leagueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const leagueName = document.getElementById('leagueName').value;
    var leagueUsers = [osis.toString()]; // Convert first OSIS to string
    // loop through all users in userList
    userList.childNodes.forEach(user => {
        // add user to leagueUsers as string
        leagueUsers.push(user.value.toString());
    });
    
    // Get selected activities
    const leagueActivities = [];
    document.querySelectorAll('.activity-card.selected').forEach(card => {
        leagueActivities.push(card.dataset.id);
    });
    
    // make random 8 digit id
    const id = Math.floor(Math.random() * 100000000);
    
    try {
        // create league with proper data structure for Firebase
        const response = await fetchRequest('/post_data', {
            "sheet": "Leagues", 
            "data": {
                "id": id,
                "Name": leagueName, 
                "OSIS": leagueUsers, // Array of OSIS strings
                "Activities": leagueActivities
            }
        });
        
        console.log('League creation response:', response);
        
        if (response && response.message === "success") {
            // Create and add the new league element to the list
            const leagueList = document.getElementById('leagueList');
            const leagueEl = document.createElement('div');
            leagueEl.classList.add('leagueEl');
            leagueEl.innerText = leagueName;
            leagueEl.addEventListener('click', () => {
                window.location.href = `/league/${id}`;
            });
            leagueList.appendChild(leagueEl);
            
            // Reset form
            leagueForm.reset();
            leagueForm.style.display = 'none';
            // Unselect all activity cards
            document.querySelectorAll('.activity-card.selected').forEach(card => {
                card.classList.remove('selected');
            });
            // Clear user list
            userList.innerHTML = '';
        } else {
            console.error('Failed to create league:', response);
            alert('Failed to create league. Please try again.');
        }
    } catch (error) {
        console.error('Error creating league:', error);
        alert('An error occurred while creating the league. Please try again.');
    }
});