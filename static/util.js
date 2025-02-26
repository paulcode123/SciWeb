// Utility functions for SciWeb

// Convert file to base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Make color opaque by removing any alpha channel
function make_color_opaque(color) {
    // If color is in rgba format, convert to hex
    if (color.startsWith('rgba')) {
        const rgba = color.match(/[\d.]+/g);
        color = '#' + 
            Math.round(rgba[0]).toString(16).padStart(2, '0') +
            Math.round(rgba[1]).toString(16).padStart(2, '0') +
            Math.round(rgba[2]).toString(16).padStart(2, '0');
    }
    return color;
}

// Fetch request wrapper
async function fetchRequest(endpoint, data = {}) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Error in fetchRequest:', error);
        return null;
    }
}

// Set class/league image
async function set_class_img(img) {
    if (!img || typeof img !== 'string' || img === '') {
        return;
    }

    try {
        const response = await fetchRequest('/get-file', { file: img.toString() });
        let b64 = response.file;
        
        // Handle different image types
        if (b64.includes('pngbase64')) {
            b64 = b64.replace('dataimage/pngbase64', 'data:image/png;base64,');
            b64 = b64.slice(0, -1);
        } else if (b64.includes('jpegbase64')) {
            b64 = b64.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
        }

        const container = document.getElementById('classimgcontainer');
        container.innerHTML = ''; // Clear existing images
        const classimg = document.createElement('img');
        classimg.src = b64;
        container.appendChild(classimg);
    } catch (error) {
        console.error('Error setting class image:', error);
    }
}

// Set up image upload functionality
async function setImageEl(data, sheet) {
    const imgUpload = document.getElementById('imgupload');
    if (!imgUpload) return;

    imgUpload.addEventListener('change', async function() {
        try {
            const img = await getBase64(this.files[0]);
            const id = Math.floor(Math.random() * 90000000) + 10000000;
            const response = await fetchRequest('/upload-file', { file: img, name: id });
            
            if (response) {
                await updateClassPic(id, data, sheet);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    });
}

// Update class/league picture
async function updateClassPic(id, data, sheet) {
    try {
        const updatedData = { ...data, img: id };
        const response = await fetchRequest('/update_data', {
            row_value: data.id,
            row_name: "id",
            data: updatedData,
            sheet: sheet
        });
        
        if (response) {
            location.reload();
        }
    } catch (error) {
        console.error('Error updating picture:', error);
    }
}

// Set up color picker functionality
function set_color_EL(sheet, data) {
    const saveColorBtn = document.getElementById('savecolor');
    const colorInput = document.getElementById('color');
    const colorLabel = document.getElementById('colorLabel');

    if (!saveColorBtn || !colorInput || !colorLabel) return;

    // Show color picker when label is clicked
    colorLabel.addEventListener('click', () => {
        colorInput.style.display = 'block';
        saveColorBtn.style.display = 'block';
    });

    // Save color when button is clicked
    saveColorBtn.addEventListener('click', async function() {
        const color = make_color_opaque(colorInput.value);
        document.getElementById('class-header').style.backgroundColor = color;
        colorInput.style.display = 'none';
        saveColorBtn.style.display = 'none';

        const updatedData = { ...data, color: color };
        await fetchRequest('/update_data', {
            row_value: data.id,
            row_name: "id",
            data: updatedData,
            sheet: sheet
        });
    });
}

// Show join button and handle joining
function show_Join(user, data, sheet) {
    const joinBtn = document.getElementById('joinBtn');
    if (!joinBtn || !user || user[1] === 404) return;

    const userOsis = user.osis?.toString();
    const dataOsis = data.OSIS?.toString()?.split(/[\s,]+/).filter(Boolean);

    if (!userOsis || !dataOsis || dataOsis.includes(userOsis)) return;

    joinBtn.style.display = 'block';
    join_class(data, user, sheet);
}

// Handle join button click
function join_class(data, user, sheet) {
    const joinBtn = document.getElementById('joinBtn');
    if (!joinBtn) return;

    joinBtn.addEventListener('click', async function() {
        const updatedData = {
            ...data,
            OSIS: data.OSIS ? `${data.OSIS}, ${user.osis}` : user.osis
        };

        await fetchRequest('/update_data', {
            row_value: data.id,
            row_name: "id",
            data: updatedData,
            sheet: sheet
        });

        location.reload();
    });
}

// Add user bubbles to display members
function add_user_bubbles(data, users) {
    const userListContainer = document.getElementById('user-list');
    if (!userListContainer || !data.OSIS) return;

    const members = data.OSIS.toString()
        .split(/[\s,]+/)
        .filter(item => item.length > 0);

    members.forEach(memberId => {
        const user = users.find(u => u.osis == memberId);
        if (!user) return;

        const userBubble = document.createElement('div');
        userBubble.textContent = user.first_name;
        userBubble.classList.add('user-bubble');
        userBubble.addEventListener('click', () => {
            window.location.href = '/users/' + memberId;
        });
        userListContainer.appendChild(userBubble);
    });
}

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
    if (route == '/post_data' || route == '/update_data' || route == '/delete_data') {
        const sheetToInvalidate = reqbody.sheet;
        if (sheetToInvalidate) {
            console.log('Invalidating cache for:', sheetToInvalidate);
            localStorage.removeItem(sheetToInvalidate);
        }
    }
    console.log('route', route, route == '/post_data', route === '/post_data');
    
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
                if (Date.now() - timestamp < 15 * 60 * 1000 || sheet === 'Grades') {
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