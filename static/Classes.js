const pushList = [];

var classList = 0;


//initialize html elements in join/create class form
    const joinButton = document.getElementById('joinButton');
    const classForm = document.getElementById('classForm');
    const periodInput = document.getElementById('periodInput');
    const teacherInput = document.getElementById('teacherInput');
  const nameInput = document.getElementById('nameInput');
    const classOptions = document.getElementById('classOptions');
//when join/create class button is clicked, show form
    joinButton.addEventListener('click', () => {
      joinButton.style.display = 'none';
      classForm.classList.remove('hidden');
    });
//add event listeners to input fields, so that class options are updated as the user types
    periodInput.addEventListener('input', updateClassOptions);
    teacherInput.addEventListener('input', updateClassOptions);
    nameInput.addEventListener('input', updateClassOptions);

    function updateClassOptions() {
      // Get the variables for the current values of the input fields
      const periodValue = periodInput.value;
      const teacherValue = teacherInput.value.toLowerCase();
      const nameValue = nameInput.value.toLowerCase();
      // Filter the class list based on the input values
      //get the period, teacher, and name of each class
      const filteredOptions = classList.filter(classData => {
        const { period, teacher, name} = classData;
        //return true if the period, teacher, and name of the class match the input values
        return period.includes(periodValue) && teacher.toLowerCase().includes(teacherValue) && name.toLowerCase().includes(nameValue);
      });
      showOptions(classOptions, filteredOptions);
    }
//show class options
    function showOptions(container, options) {
      // Clear the current options
      container.innerHTML = '';
      // Create an option for each class
      options.forEach(({ period, teacher, name}) => {
        //set the text content of the option to the period, teacher, and name of the class
        const option = document.createElement('li');
        option.textContent = `${name} - ${teacher}`;
        //add styles to the option
        option.style.padding = '10px';
option.style.borderRadius = '4px';
option.style.backgroundColor = 'gray';
option.style.transition = 'background-color 0.3s';
//turn the option green when the user hovers over it
option.addEventListener('mouseover', () => {
  option.style.backgroundColor = '#4CAF50';
});
//turn the option gray when the user stops hovering over it
option.addEventListener('mouseout', () => {
  option.style.backgroundColor = 'gray';
});
//when the user clicks on the option, set the input values to the period, teacher, and name of the class
        option.addEventListener('click', () => {
          periodInput.value = period;
          teacherInput.value = teacher;
          nameInput.value = name;
          container.innerHTML = '';
        });
        // Add the option to the container, which stores the list of options
        container.appendChild(option);
      });
    }


//when the user submits the form, get the input values and create a class object
classForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Prevent the form from submitting and refreshing the page

  // Get the input values
  const periodInput = document.getElementById('periodInput').value;
  const teacherInput = document.getElementById('teacherInput').value;
  const nameInput = document.getElementById('nameInput').value;
  const categories = document.getElementById('categories').value;
  var update = 0;
  //for each class in the existing class list, if the period, class, and teacher match the input values, add the user's osis to the class's osis
for (var i = 0; i < classList.length; i++) {
  if (classList[i].period === periodInput && classList[i].teacher === teacherInput) {
    classList[i].OSIS = classList[i].OSIS + ", " + osis;
    update = classList[i].id; 
    post_classes(classList[i], update);
    break;
  }
}
//if the class already exists, the user has been added to the class, so reset the form, hide it, and end the function
if (update != 0){
  classForm.reset();
  classForm.style.display = 'none';
  return;
}
//continues to here if the class does not yet exist

// parse categories string
const parts = categories.split(/,\s+/);

// Initialize an empty result array
const result = [];

// Iterate over the parts and extract the name and percentage
parts.forEach(part => {
  const [name, percentage] = part.split(': ');
  result.push(name, parseInt(percentage));
});
  // Create an object with the captured values
  const classData = {
    period: parseInt(periodInput),
    teacher: teacherInput,
    name: nameInput,
    OSIS: osis,
    id: Math.floor(Math.random() * 9000)+1000, // Generate a random ID between 1000 and 9999
    categories: result
  };

  // Reset the form inputs
  classForm.reset();
  classForm.style.display = 'none';
  
  post_classes(classData, update);
  
});


//display the classes that the user is a member of
function display_classes(classList, user_data){
  const classListContainer = document.getElementById('classList');
    //for each class in the database...
    classList.forEach(classData => {
      //if the user's osis is not in the class's osis list, skip the class
      if(!((classData.OSIS).includes(user_data['osis']))){return;}
      //otherwise, create a div for the class and add it to the class list container
      const classItem = document.createElement('div');
      classItem.classList.add('class-item');
      classItem.innerHTML = `
        <h3>Period ${classData.period}</h3>
        <p>Teacher: ${classData.teacher}</p>
        <p>Name: ${classData.name}</p>
      `;
      // if the class is clicked, go to the class page
      classItem.addEventListener('click', () => {
        window.location.href = "/class/" + classData.name + classData.id;
      });
      //add the class element to the class list container
      classListContainer.appendChild(classItem);
    });
  
}

//wait before running the function to ensure that the user's osis is defined
setTimeout(() => {
      init_fetch()
    }, 0.1);
function init_fetch(){
  console.log("in init_fetch")
fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "Classes, Name" }) //get Classes and Name data from the database
})
.then(response => response.json())
.then(data => {
  
  
  classList = data['Classes']
  user_data = data['Name']
  console.log(classList)
  display_classes(classList, user_data)
  document.getElementById('loadingWheel').style.display = "none";
  
  
})
.catch(error => {
  console.log('An error occurred:' +error);
});
}

//if the user joined or created a class, update the class sheet in the database
function post_classes(data, update){

  fetch('/post-classes', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      update:update,
      class: data
      
    })
})
.then(response => response.json())
.then(data => {
  console.log(data);
  location.reload();
  })
}