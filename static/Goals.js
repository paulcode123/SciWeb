const classDropdown = document.getElementById("classDropdown");
const categoryCheckboxes = document.getElementById("categoryCheckboxes");

    //Once user has selected a class, display the category checkboxes and the rest of the form
    classDropdown.addEventListener("change", function() {
      categoryCheckboxes.style.display = this.value ? "block" : "none";
    });
    //When the user submits the form, get the values from the form and create a goal object
    const gradeForm = document.getElementById("gradeForm");
    gradeForm.addEventListener("submit", function(event) {
      event.preventDefault();

      const selectedClass = classDropdown.value;
      const selectedCategory = document.getElementById("categoryDropdown").value;
      var goalDate = document.getElementById("goalDate").value;
      const parts = goalDate.split("-");
      goalDate = parts[1] + "/" + parts[2] + "/" + parts[0];
      const goalGrade = document.getElementById("goalGrade").value;

      const goal = {
        "class": selectedClass,
        "category": selectedCategory,
        "date": goalDate,
        "grade": goalGrade,
        "osis": osis,
        "id": Math.floor(Math.random() * 10000)
      }
      post_goal(goal);

      // You can perform further actions with the goal data here

      // Reset the form
      gradeForm.reset();
      categoryCheckboxes.style.display = "none";
    });


function post_goal(goal){
  fetch('/post-goal', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({"goal":goal})
})
.then(response => response.text())
.then(result => {
    console.log(result);  // Log the response from Python
})
.catch(error => {
    console.log('An error occurred:', error);
});
}

// Get the classes for the user
fetch('/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'Classes' })
})
.then(response => response.json())
.then(data => {
  var rawclasses = data['Classes']
  const classes = rawclasses.filter(item => item.OSIS.includes(osis));
  setClassOptions(classes)
  
  document.getElementById("classDropdown").addEventListener("change", () => {optionSelected(classes)});
  document.getElementById('loadingWheel').style.display = "none";  
})
.catch(error => {
  console.log('An error occurred:' +error);
});

// Set the options for the class dropdown
function setClassOptions(filteredClasses){
  
    const selectElement = document.getElementById("classDropdown");
    for(let x=0; x<filteredClasses.length; x++){
      // Create a new option element
      const newOption = document.createElement("option");
      newOption.value = filteredClasses[x].name;
      newOption.textContent = filteredClasses[x].name;

      // Add the new option to the select element
      selectElement.appendChild(newOption);
    }

// Remove the "Please add classes first" option
if(filteredClasses.length != 0){
selectElement.removeChild(selectElement.querySelector('option[value="default"]'));
// add "all" option to selectElement
const newOption = document.createElement("option");
newOption.value = "all";
newOption.textContent = "All";
selectElement.appendChild(newOption);
} else {
  selectElement.querySelector('option[value="default"]').textContent = "Please join classes first"
}
  }
  

//After the user has selected a class, display the associated category dropdown
  function optionSelected(classes){
    
    console.log(classes);
    var selectedClass = document.getElementById("classDropdown").value;
    var categories = classes.filter(item => item.name == selectedClass)[0].categories;
    
    if(categories){
      
    categories = JSON.parse(categories).filter(item => typeof item === 'string');
      
    var categoryElement = document.getElementById("categoryDropdown")
    // Remove all existing options
    while (categoryElement.firstChild) {
      categoryElement.removeChild(categoryElement.firstChild);
  }
    // Add nex options
    for(let x=0; x<categories.length; x++){
    const newOption = document.createElement("option");
    newOption.value = categories[x];
    newOption.textContent = categories[x];
        // Add the new option to the select element
  categoryElement.appendChild(newOption);
    }
    // Add "All" option
    const newOption = document.createElement("option");
    newOption.value = "All";
    newOption.textContent = "All";
    categoryElement.appendChild(newOption);
    
    }
  }
  