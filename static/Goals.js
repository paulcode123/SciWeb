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
        "date_set": new Date().toLocaleDateString(),
        "OSIS": osis.toString(),
        "id": (Math.floor(Math.random() * 10000)).toString()
      }
      post_goal(goal);

      // You can perform further actions with the goal data here

      // Reset the form
      gradeForm.reset();
      categoryCheckboxes.style.display = "none";
    });


async function post_goal(goal){
  const result = await fetchRequest('/post_data', {"sheet": "Goals", "data": goal});
  console.log(result);  // Log the response from Python
}

// Get the classes for the user
async function main(){
  const data = await fetchRequest('/data', { data: 'FILTERED Classes' });

  var classes = data['Classes']
  console.log(classes)
  setClassOptions(classes)
  console.log("setting EL")
  classDropdown.addEventListener("change", () => {optionSelected(classes)});
  console.log("EL set")
  document.getElementById('loadingWheel').style.display = "none";  


}
main()

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
// selectElement.removeChild(selectElement.querySelector('option[value="default"]'));
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
    console.log("in optionSelected")
    console.log(classes);
    var selectedClass = document.getElementById("classDropdown").value;
    var categoryElement = document.getElementById("categoryDropdown");
    // If the user selects "All", add 'all' to the category dropdown
    if(selectedClass == "all"){
      const newOption = document.createElement("option");
      newOption.value = "All";
      newOption.textContent = "All";
      categoryElement.appendChild(newOption);
      return;
    }
    var categories = classes.filter(item => item.name == selectedClass)[0].categories;
    
    if(categories){
      if (typeof categories === 'string'){
        categories = JSON.parse(categories);
      }
      categories = categories.filter(item => typeof item === 'string');
    
      
    
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
    
    
    }
    
  }
  