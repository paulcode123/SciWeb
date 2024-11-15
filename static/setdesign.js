
async function setImageEl(classes, sheet){
    // add event listener to image upload input element with id="imgupload" to send a fetch request to /upload-file route
    document.getElementById('imgupload').addEventListener('change', async function() {
      // const formData = new FormData();
      // convert to Base64 with the getBase64 function
      var img = await getBase64(this.files[0]);
      // generate random 8 digit number
      let id = Math.floor(Math.random() * 90000000) + 10000000;
      const data = await fetchRequest('/upload-file', {file: img, name: id});
      
        console.log(data);
        updateClassPic(id, classes, sheet);
      
    });
    }

async function updateClassPic(id, classes, sheet){
    class_id = classes['id']
    classes['img'] = id
    const data = await fetchRequest('/update_data', {"row_value": class_id, "row_name": "id", "data": classes, "sheet": sheet});
    console.log(data);
    location.reload();
    
}

document.getElementById('colorLabel').addEventListener('click', function() {
    document.getElementById('color').style.display = 'block';
    document.getElementById('savecolor').style.display = 'block';
});

function set_color_EL(sheet, classData){
    document.getElementById('savecolor').addEventListener('click', function() {
        var color = document.getElementById('color').value;
        color = make_color_opaque(color);
        // set the background color of body to the color
        document.getElementById('class-header').style.backgroundColor = color;
        document.getElementById('color').style.display = 'none';
        document.getElementById('savecolor').style.display = 'none';
        classData['color'] = color;
        fetchRequest('/update_data', {"row_value": classData['id'], "row_name": "id", "data": classData, "sheet": sheet});
    });
}
//whatever the color is, make it a light shade of that color
function make_color_opaque(hex){

    hex = hex.replace(/^#/, '');
    if (hex.length !== 6) {
        throw new Error('Invalid hex color');
    }
    // Convert hex to RGB
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);

    return "rgba(" + r + ", " + g + ", " + b + ", 0.1)";
}

async function set_class_img(img){
    console.log("in set class img")
    // if img is "" or not a string, return
    if (img == ""){
        console.log("img is not a string", img)
    return;
    }
    let response = await fetchRequest('/get-file', {file: img.toString()});
    let b64 = response.file;
    if(b64.includes('pngbase64')){
    type = 'png';
    b64 = b64.replace('dataimage/pngbase64', 'data:image/png;base64,');
    b64 = b64.slice(0, -1);
    }
    else if(b64.includes('jpegbase64')){
    type = 'jpeg';
    b64 = b64.replace('dataimage/jpegbase64', 'data:image/jpeg;base64,');
    }
    classimg = document.createElement('img')
    classimg.src = b64;
    document.getElementById('classimgcontainer').appendChild(classimg)
}

// show_join() function: if the user is logged in but not in the class, show the join button
function show_Join(user, classData, sheet){
    console.log("in show join")
    const joinBtn = document.getElementById('joinBtn');
    if (user[1] == 404){
    return;
    }
    if (classData['OSIS'].includes(user['osis'].toString())){
        console.log("user is in class")
    return;
    }
    console.log("user is not in class", classData['OSIS'], user['osis'], user)
    joinBtn.style.display = 'block';
    join_class(classData, user, sheet);
}

// add event listener to join button
function join_class(classData, user, sheet){
    document.getElementById('joinBtn').addEventListener('click', async function() {
    var new_row = classData;
    new_row['OSIS'] = new_row['OSIS'] + ", "+user['osis']
    fetchRequest('/update_data', {"row_value": classData['id'], "row_name": "id", "data": new_row, "sheet": sheet});
    location.reload();
    });
}

    //add user bubbles to the class page, with links to the user's profile page
function add_user_bubbles(classData, users){
    var userListContainer = document.getElementById('user-list');
      console.log(classData)
    //set members as a list of osis values, taking only the numbers and not any combination of spaces and commas in between
    const members = classData['OSIS'].toString().split(/[\s,]+/).filter(item => item.length > 0);
    
    for(let x=0; x<members.length; x++){
        let name = users.find(item => item.osis == members[x]);
        // if name is not found, skip this iteration
        if(name == undefined){
          continue;
        }
        name = name['first_name'];
        var userBubble = document.createElement('div');
        userBubble.textContent = name;
        userBubble.classList.add('user-bubble');
        userBubble.addEventListener('click', function() {
            window.location.href = '/users/' + members[x]; //link to the user's profile page
        });
        userListContainer.appendChild(userBubble);
    }
    }