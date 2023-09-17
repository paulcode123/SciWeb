const pushList = [];

var classList = 0;



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
    old_row_members = classList[i].OSIS;
    
    update = classList[i].id; 
    break;
  }
}
  
  // Create an object with the captured values
  const classData = {
    period: parseInt(periodInput),
    teacher: teacherInput,
    name: nameInput,
    OSIS: osis + ", " + old_row_members,
    id: Math.floor(Math.random() * 10000)
  };

  // Reset the form inputs
  classForm.reset();
  classForm.style.display = 'none';
  
  post_classes(classData, update);
  
});



function display_classes(classList, user_data){
  const classListContainer = document.getElementById('classList');

    classList.forEach(classData => {
      
      if(!((classData.OSIS).includes(user_data['osis']))){return;}
      
      const classItem = document.createElement('div');
      classItem.classList.add('class-item');
      classItem.innerHTML = `
        <h3>Period ${classData.period}</h3>
        <p>Teacher: ${classData.teacher}</p>
        <p>Name: ${classData.name}</p>
      `;
      
      classItem.addEventListener('click', () => {
        window.location.href = "/class/" + classData.name + classData.id;
      });

      classListContainer.appendChild(classItem);
    });
  
}
setTimeout(() => {
      init_fetch()
    }, 1);
function init_fetch(){
  console.log("in init_fetch")
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
  user_data = data['UserData']
  console.log(classList)
  display_classes(classList, user_data)
  
  
})
.catch(error => {
  alert('An error occurred:' +error);
});
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