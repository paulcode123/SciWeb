const pushList = [];
var full_name;
var classList = 0;

 setTimeout(() => {
      init_buttons()
    }, 200);
function init_buttons(){
    const joinButton = document.getElementById('joinButton');
    const classForm = document.getElementById('classForm');
    const periodInput = document.getElementById('periodInput');
    const teacherInput = document.getElementById('teacherInput');
  const nameInput = document.getElementById('nameInput');
    const classOptions = document.getElementById('classOptions');

    joinButton.addEventListener('click', () => {
      joinButton.style.display = 'none';
      classForm.classList.remove('hidden');
    });
}
    periodInput.addEventListener('input', updateClassOptions);
    teacherInput.addEventListener('input', updateClassOptions);
    nameInput.addEventListener('input', updateClassOptions);

    function updateClassOptions() {
      const periodValue = periodInput.value;
      const teacherValue = teacherInput.value.toLowerCase();
      const nameValue = nameInput.value.toLowerCase();
      const filteredOptions = classList.filter(classData => {
        const { period, teacher, name} = classData;
        return period.includes(periodValue) && teacher.toLowerCase().includes(teacherValue) && name.toLowerCase().includes(nameValue);
      });
      showOptions(classOptions, filteredOptions);
    }

    function showOptions(container, options) {
      container.innerHTML = '';
      options.forEach(({ period, teacher, name}) => {
        const option = document.createElement('li');
        option.textContent = `${name} - ${teacher}`;
        option.style.padding = '10px';
option.style.borderRadius = '4px';
option.style.backgroundColor = 'gray';
option.style.transition = 'background-color 0.3s';

option.addEventListener('mouseover', () => {
  option.style.backgroundColor = '#4CAF50';
});

option.addEventListener('mouseout', () => {
  option.style.backgroundColor = 'gray';
});
        option.addEventListener('click', () => {
          periodInput.value = period;
          teacherInput.value = teacher;
          nameInput.value = name;
          container.innerHTML = '';
        });
        container.appendChild(option);
      });
    }



classForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Prevent the form from submitting and refreshing the page

  // Get the input values
  const periodInput = document.getElementById('periodInput').value;
  const teacherInput = document.getElementById('teacherInput').value;
  const nameInput = document.getElementById('nameInput').value;
  var update = 0;
  var old_row_members= "";
for (var i = 0; i < classList.length; i++) {
  if (classList[i].period === periodInput && classList[i].teacher === teacherInput) {
    old_row_members = classList[i].members;
    update = classList[i].id; // Add 1 to match the desired behavior of setting update to the index + 1
    break;
  }
}
  
  // Create an object with the captured values
  const classData = {
    period: parseInt(periodInput),
    teacher: teacherInput,
    name: nameInput,
    members: full_name + ", " + old_row_members,
    id: Math.floor(Math.random() * 10000)
  };

  // Add the class data object to the classList array
  
  
  // Display the updated classList in the console (you can modify this part as per your requirement)
  

  // Reset the form inputs
  classForm.reset();
  classForm.style.display = 'none';
  
  post_classes(classData, update);
  
});



function display_classes(classList, full_name){
  const classListContainer = document.getElementById('classList');

    classList.forEach(classData => {
      if(!((classData.members).includes(full_name))){return;}
      const classItem = document.createElement('div');
      classItem.classList.add('class-item');
      classItem.innerHTML = `
        <h3>Period ${classData.period}</h3>
        <p>Teacher: ${classData.teacher}</p>
        <p>Name: ${classData.name}</p>
      `;
      
      classItem.addEventListener('click', () => {
        window.location.href = "/class/" + classData.name;
      });

      classListContainer.appendChild(classItem);
    });
}
setTimeout(() => {
      init_fetch()
    }, 400);
function init_fetch(){
fetch('/Classes-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "data being sent Py=>JS" })
})
.then(response => response.json())
.then(data => {
  
  
  classList = data['Classes']
  display_classes(classList, full_name)
  // alert(full_name); // Handle the response from Python
  
})
.catch(error => {
  alert('An error occurred:' +error);
});
  fetch('/name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ "message":"blank" })
})
.then(response => response.json())
.then(data => {
  full_name = JSON.stringify(data)
  full_name = full_name.slice(1, -1);
  // alert(full_name); // Handle the response from Python
  if (full_name != "Login"){
    
  
  document.getElementById('Cslink').textContent = full_name;
  document.getElementById('Cslink').href = "/Profile";
  }
})
}
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