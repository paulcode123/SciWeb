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