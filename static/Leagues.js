// add event listener to create league button to show league form
const createLeagueButton = document.getElementById('createLeague');
const leagueForm = document.getElementById('leagueForm');

createLeagueButton.addEventListener('click', () => {
    leagueForm.style.display = 'block';
    });

// hide loading wheel
document.getElementById('loadingWheel').style.display = 'none';

async function main() {
    // get all leagues
    const data = await fetchRequest('/data', { data: "Users, Leagues, Name" })
    const leagues = data.Leagues;
    const users = data.Users;
    set_create_user_add_EL(users);
}

function set_create_user_add_EL(users){
    const user_add_field = document.getElementById('addUsers');
    // add event listener to user_add_field to show users that match the query
    user_add_field.addEventListener('input', () => {
        var possible_users = [];
        // loop through all users: to see if they include the query. When only one user matches the query, add the user to the list of users to be added to the league
        users.forEach(user => {
            if((user.first_name + user.last_name).includes(user_add_field.value)){
                possible_users.push(user);
            }
        });
        if (possible_users.length == 1){
            const userEl = document.createElement('div');
            // add to class
            userEl.classList.add('userEl');
            // add text
            userEl.innerText = possible_users[0].first_name + " " + possible_users[0].last_name;
            // add to user_add_field
            user_add_field.appendChild(userEl);
        }
    });
}