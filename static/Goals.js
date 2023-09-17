const classDropdown = document.getElementById("classDropdown");
    const categoryCheckboxes = document.getElementById("categoryCheckboxes");

    classDropdown.addEventListener("change", function() {
      categoryCheckboxes.style.display = this.value ? "block" : "none";
    });

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
    alert('An error occurred:', error);
});
}