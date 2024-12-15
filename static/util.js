async function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Converts the file to Base64
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  }

  async function fetchRequest(route, reqbody) {
    // console.log(reqbody);
    
    // Clear cache when modifying data
    if (route === '/post_data' || route === '/update_data' || route === '/delete_data') {
        const sheetToInvalidate = reqbody.data.sheet;
        if (sheetToInvalidate) {
            console.log('Invalidating cache for:', sheetToInvalidate);
            localStorage.removeItem(sheetToInvalidate);
        }
    }
    
    // Only apply caching for /data route
    if (route === '/data') {
        const requestedSheets = reqbody.data.split(', ');
        let response = {};
        let sheetsToFetch = [];
        let cachedSheets = {};  // Store cached sheets to pass as prev_sheets
        
        // First, check cache for each sheet
        for (const sheet of requestedSheets) {
            // Skip caching for real-time data
            if (sheet === 'Chat' || sheet === 'Battles') {
                sheetsToFetch.push(sheet);
                continue;
            }
            
            // Check cache in localStorage
            const cachedItem = localStorage.getItem(sheet);
            if (cachedItem) {
                const { data, timestamp } = JSON.parse(cachedItem);
                
                // Check if cache is still valid (less than 15 minutes old)
                if (Date.now() - timestamp < 15 * 60 * 1000) {
                    console.log('Using cached data for:', sheet);
                    response[sheet] = data;
                    cachedSheets[sheet] = data;  // Add to cachedSheets
                    console.log('CachedSheets:', cachedSheets);
                    continue;
                } else {
                    // Remove expired cache
                    localStorage.removeItem(sheet);
                }
            }
            
            sheetsToFetch.push(sheet);
        }
        console.log("cachedSheets", cachedSheets);
        
        // Fetch any uncached sheets
        if (sheetsToFetch.length > 0) {
            console.log('Fetching sheets:', sheetsToFetch, "with prev_sheets", cachedSheets);
            const freshData = await normalFetch(route, { 
                ...reqbody, 
                data: sheetsToFetch.join(', '),
                prev_sheets: cachedSheets  // Pass cached sheets to backend
            });
            
            // Cache the fresh data
            for (const sheet of sheetsToFetch) {
                if (sheet !== 'Chat' && sheet !== 'Battles') {
                    localStorage.setItem(sheet, JSON.stringify({
                        data: freshData[sheet],
                        timestamp: Date.now()
                    }));
                    console.log('Caching data for:', sheet);
                }
                response[sheet] = freshData[sheet];
            }
        }
        
        return response;
    }
    
    // For all other routes, just fetch normally
    return await normalFetch(route, reqbody);
}

// Helper function for normal fetch
async function normalFetch(route, reqbody) {
    return fetch(route, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqbody)
    })
    .then(response => response.json())
    .catch(error => {
        console.error('An error occurred in fetch:', error);
        throw error;
    });
}

// function to clear the cache for a specific sheet
function clearCache(sheet) {
    console.log("Clearing cache for:", sheet);
    localStorage.removeItem(sheet);
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
let currentLoadingImage = 0;
let loadingInterval;

function startLoading(fixedTop = null) {
    const container = document.querySelector('.loading-container');
    const images = container.querySelectorAll('.loading-image');
    container.style.display = 'block';
    document.body.style.opacity = '0.7';
    
    // Position the loading container
    if (fixedTop !== null) {
        container.style.position = 'absolute';
        container.style.top = `${fixedTop}px`;
        container.style.transform = 'translateX(-50%)'; // Only center horizontally
    } else {
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.transform = 'translate(-50%, -50%)'; // Center both horizontally and vertically
    }
    
    // Show first image
    images[0].classList.add('active');
    currentLoadingImage = 0;
    
    loadingInterval = setInterval(() => {
        images[currentLoadingImage].classList.remove('active');
        currentLoadingImage = (currentLoadingImage + 1) % images.length;
        images[currentLoadingImage].classList.add('active');
    }, 1500);
}

function endLoading() {
    const container = document.querySelector('.loading-container');
    const images = container.querySelectorAll('.loading-image');
    
    clearInterval(loadingInterval);
    container.style.display = 'none';
    images.forEach(img => img.classList.remove('active'));
    
    // document.body.style.pointerEvents = 'auto';
    document.body.style.opacity = '1';
}