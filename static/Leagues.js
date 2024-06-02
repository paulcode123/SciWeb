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
    const data = await fetchRequest('/data', { data: "Users, FILTERED Leagues, Name" })
    const leagues = data.Leagues;
    const users = data.Users;
    
    set_create_user_add_EL(users, user_add_field, userList);
    displayLeagues(leagues);
    // hide loading wheel
    document.getElementById('loadingWheel').style.display = 'none';
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

// add event listener when form is submitted
leagueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const leagueName = document.getElementById('leagueName').value;
    const activitiesChecklist = document.getElementById('activityOptions')
    var leagueUsers = [osis];
    // loop through all users in userList
    userList.childNodes.forEach(user => {
        // add user to leagueUsers
        leagueUsers.push(user.value);
    });
    leagueUsers = leagueUsers.join(", ");
    // list all of the checked activities
    const leagueActivities = [];
    activitiesChecklist.childNodes.forEach(activity => {
        // if element is a label
        if(activity.nodeName != "LABEL"){
            return;
        }
        activity = activity.childNodes[0];
        
        if(activity.checked){
            
            // push id of element value to leagueActivities
            leagueActivities.push(activity.id);
        }
    });
    // make random 8 digit id
    const id = Math.floor(Math.random() * 100000000);
    // create league
    await fetchRequest('/post_data', {"sheet": "Leagues", "data": {"Name": leagueName, "OSIS": leagueUsers, "Activities": leagueActivities, "id": id}});
    //reload page
    location.reload();
});