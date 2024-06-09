async function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Converts the file to Base64
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  }

function fetchRequest(route, reqbody){
    console.log(reqbody)
    return fetch(route, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqbody)
    })
    .then(response => response.json())
    .then(data => {
        // console.log(data);
        return data;
    })
    .catch(error => {
        console.error('An error occurred in fetch :' +error);
    });
}

// process the date to make it more readable: today, tomorrow, Thursday, next Wednesday, etc.
function processDate(date){
    var d = new Date(date);
    var today = new Date();
    // add 1 day to d
    d = new Date(d.getTime() + 86400000);
    var day = d.toLocaleDateString('en-US', {weekday: 'long'});
    var dayString = "";
    var dayDiff = d.getDate() - today.getDate();
    if(dayDiff == 0){
      dayString = "Today";
    }
    else if(dayDiff == 1){
      dayString = "Tomorrow";
    }
    else if(dayDiff > 1 && dayDiff < 7){
      dayString = "This "+day;
    }
    else if(dayDiff >= 7 && dayDiff < 14){
      dayString = "Next "+day;
    }
    else{
      dayString = d.toDateString();
    }
    return dayString;
    
  }


  function set_create_user_add_EL(users, user_add_field, userList){

    // add event listener to user_add_field to show users that match the query
    user_add_field.addEventListener('input', () => {
        var possible_users = [];
        // loop through all users: to see if they include the query. When only one user matches the query, add the user to the list of users to be added to the league
        users.forEach(user => {
            if(((user.first_name + user.last_name).toLowerCase()).includes((user_add_field.value).toLowerCase())){
                possible_users.push(user);
            }
        });
        console.log(possible_users);
        // clear userList
        // userList.innerHTML = '';
        if (possible_users.length == 1){
            const userEl = document.createElement('div');
            // add to class
            userEl.classList.add('userEl');
            // add text
            userEl.innerText = possible_users[0].first_name + " " + possible_users[0].last_name+" ❌";
            // set value to the user's osis
            userEl.value = possible_users[0].osis;
            // clear text inside user_add_field
            user_add_field.value = '';
            // delete itself when clicked
            userEl.addEventListener('click', () => {
                userEl.remove();
            });
            // add to userList
            userList.appendChild(userEl);
        }
    });
}