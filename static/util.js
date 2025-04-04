cacheTimeout = 40; // 40 minutes

async function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Converts the file to Base64
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  }

  async function fetchRequest(route, reqbody) {
    // Show fetch bubble if fetching data
    if (route === '/data') {
        document.querySelector('.fetch-bubble').style.display = 'flex';
    }

    try {
        // Update cache when modifying data
        if (route === '/post_data' || route === '/update_data' || route === '/delete_data') {
            const sheetToUpdate = reqbody.sheet;
            if (sheetToUpdate) {
                const cachedItem = localStorage.getItem(sheetToUpdate);
                if (cachedItem) {
                    const { data: cachedData, timestamp } = JSON.parse(cachedItem);
                    
                    if (route === '/post_data') {
                        // Add new item to cached data
                        cachedData.push(reqbody.data);
                        localStorage.setItem(sheetToUpdate, JSON.stringify({
                            data: cachedData,
                            timestamp: Date.now()
                        }));
                    } else if (route === '/update_data') {
                        // Update existing item in cached data
                        const updatedData = cachedData.map(item => 
                            item.id === reqbody.data.id ? reqbody.data : item
                        );
                        localStorage.setItem(sheetToUpdate, JSON.stringify({
                            data: updatedData,
                            timestamp: Date.now()
                        }));
                    } else if (route === '/delete_data') {
                        // Remove item from cached data
                        const filteredData = cachedData.filter(item => item.id !== reqbody.data.id);
                        localStorage.setItem(sheetToUpdate, JSON.stringify({
                            data: filteredData,
                            timestamp: Date.now()
                        }));
                    }
                }
            }
        }
        
        // Only apply caching for /data route
        if (route === '/data') {
            const requestedSheets = reqbody.data.split(', ');
            let response = {};
            let sheetsToFetch = [];
            let cachedSheets = {};  // Store cached sheets to pass as prev_sheets
            
            // Check if Classes is needed but not requested
            const needsClasses = !requestedSheets.includes('Classes');
            if (needsClasses) {
                requestedSheets.push('Classes');
            }
            
            // First, check cache for each sheet
            for (const sheet of requestedSheets) {
                // Skip caching for real-time data
                if (sheet === 'Chat' || sheet === 'Battles') {
                    sheetsToFetch.push(sheet);
                    continue;
                }
                
                // Check cache in localStorage
                const cachedItem = localStorage.getItem(sheet);
                // console.log('cachedItem', sheet, cachedItem);
                if (cachedItem) {
                    const { data, timestamp } = JSON.parse(cachedItem);
                    

                    // Check if cache is still valid (less than 15 minutes old)
                    if (Date.now() - timestamp < cacheTimeout * 60 * 1000 || sheet === 'Grades') {
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
            // if Grades is in sheetsToFetch, remove it and set response['Grades'] to a blank array
            if (sheetsToFetch.includes('Grades')) {
                sheetsToFetch = sheetsToFetch.filter(sheet => sheet !== 'Grades');
                response['Grades'] = [{'name': 'Please pull grades from Jupiter'}];
            }

            // Fetch any uncached sheets
            if (sheetsToFetch.length > 0) {
                console.log('Fetching sheets:', sheetsToFetch, "with prev_sheets", cachedSheets);
                document.querySelector('.fetch-bubble span:last-child').textContent = `Fetching ${sheetsToFetch.join(', ')}`;
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
            
            // Update the cache info display after any changes
            updateCacheInfoDisplay();
            
            return response;
        }
        
        // For all other routes, just fetch normally
        return await normalFetch(route, reqbody);
    } finally {
        // Hide fetch bubble after request completes
        if (route === '/data') {
            document.querySelector('.fetch-bubble').style.display = 'none';
        }
    }
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

// Loading state management
window.loadingState = window.loadingState || {
    currentImageIndex: 0,
    interval: null
};

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
    window.loadingState.currentImageIndex = 0;
    
    window.loadingState.interval = setInterval(() => {
        images[window.loadingState.currentImageIndex].classList.remove('active');
        window.loadingState.currentImageIndex = (window.loadingState.currentImageIndex + 1) % images.length;
        images[window.loadingState.currentImageIndex].classList.add('active');
    }, 1500);
}

function endLoading() {
    const container = document.querySelector('.loading-container');
    const images = container.querySelectorAll('.loading-image');
    
    clearInterval(window.loadingState.interval);
    container.style.display = 'none';
    images.forEach(img => img.classList.remove('active'));
    
    // document.body.style.pointerEvents = 'auto';
    document.body.style.opacity = '1';
}

// Cache Info Display Functions
function updateCacheInfoDisplay() {
    const cachedSheetsList = document.getElementById('cached-sheets-list');
    if (!cachedSheetsList) return;

    cachedSheetsList.innerHTML = '';
    
    // Get all items from localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            const value = JSON.parse(localStorage.getItem(key));
            if (value && value.timestamp) {
                const timeAgo = Math.round((Date.now() - value.timestamp) / 60000); // Convert to minutes
                // Use the same timeout as defined at the top
                if (timeAgo < cacheTimeout) {
                    const item = document.createElement('div');
                    item.className = 'cached-sheet-item';
                    item.innerHTML = `
                        <span>${key} (${timeAgo}m ago)</span>
                        <span class="delete-cache" onclick="clearCacheAndUpdate('${key}')">×</span>
                    `;
                    cachedSheetsList.appendChild(item);
                } else {
                    // Remove expired cache
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            // Skip non-JSON items in localStorage
            continue;
        }
    }
}

function clearCacheAndUpdate(sheet) {
    clearCache(sheet);
    updateCacheInfoDisplay();
}

// Initialize cache info display when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initial update
    updateCacheInfoDisplay();
    
    // Update every minute
    setInterval(updateCacheInfoDisplay, 60000);
});