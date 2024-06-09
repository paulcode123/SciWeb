async function main() {
  var data = await fetchRequest('/data', { data: "Assignments, FILTERED Classes" });
  
  // Get the class id from the last 4 characters of the URL
  var class_id = window.location.href.slice(-4);
  // Filter the assignments to only show the one for the class that the user is currently on
  var assignment = data['Assignments'].filter(item => item.id.toString() == class_id.toString())[0];
  // Filter classes to find the matching class
  var current_class = data['Classes'].find(item => item.id === assignment.class);
  
  // Change values of HTML elements to reflect the assignment
  document.getElementById('class-name').textContent = 'Class: ' + assignment.class_name;
  document.getElementById('due-date').textContent = 'Due: ' + assignment.due;
  document.getElementById('points').textContent = 'Points: ' + assignment.points;
  document.getElementById('categories').textContent = 'Category: ' + assignment.category;

  set_EL(assignment);  // Call the function to set the event listener
  set_sliders(assignment);  // Call the function to set initial slider values
  await get_impact(assignment.category, current_class, parseFloat(assignment.points));
  calculate_averages(data['Assignments'], assignment.class);
}

main();

async function get_impact(category, current_class, worth) {
  data = await fetchRequest('/impact', { 'category': category, 'class': (current_class.name).toLowerCase() });
  
  var category_grade = data['current_grade'];
  var category_points = data['total_points'];
  var category_weight = data['category_weight'];
  document.getElementById('slider').value = category_grade;
  document.getElementById('slider-value').textContent = category_grade.toString() + '%';
  console.log('category grade: ' + category_grade);
  console.log('category points: ' + category_points);
  console.log('worth: ' + worth);
  
  // Add event listener to the slider to update the value of the slider
  document.getElementById('slider').addEventListener('input', function() {
    document.getElementById('slider-value').textContent = "If your score on this is: " + this.value + '%:';
    let new_category_grade = ((this.value * worth) + (category_points * category_grade)) / (worth + category_points);
    let category_impact = new_category_grade - category_grade;
    let class_impact = category_impact * category_weight / 1;
    console.log('category weight: ' + category_weight);
    document.getElementById('category-impact').textContent = 'Impact on ' + category + ' category grade: ' + category_impact.toFixed(3) + '%';
    document.getElementById('class-impact').textContent = 'Impact on ' + current_class.name + ' grade: ' + class_impact.toFixed(3) + '%';
  });
}

function set_EL(assignment) {
  document.getElementById('update-button').addEventListener('click', async function() {
    // Get the values of the three sliders
    let percentCompletion = document.getElementById('percent-completion').value;
    let timeSpent = document.getElementById('time-spent').value;
    let difficulty = document.getElementById('difficulty').value;

    // Set the assignment values
    assignment['perc_comp'] = percentCompletion;
    assignment['time_spent'] = timeSpent;
    assignment['difficulty'] = difficulty;
    assignment[assignment['user_osis']] = document.getElementById('slider').value;  // Assuming user's OSIS is stored in the assignment object

    // Call fetchRequest to update the data
    await fetchRequest('/update_date', {
      row_name: "id",
      row_value: assignment.id,
      data: assignment,
      sheet: "Assignments"
    });

    console.log('Updated assignment:', assignment);
  });
}

function set_sliders(assignment) {
  // Assuming `user_osis` is a property of the assignment object and is a unique identifier for the user
  const user_osis = assignment['user_osis'];

  // Set the sliders to the values corresponding to the user's OSIS
  if (assignment[user_osis]) {
    document.getElementById('percent-completion').value = assignment[user_osis]['perc_comp'] || 0;
    document.getElementById('time-spent').value = assignment[user_osis]['time_spent'] || 0;
    document.getElementById('difficulty').value = assignment[user_osis]['difficulty'] || 0;
  }
}

function calculate_averages(assignments, class_id) {
  let totalDifficulty = 0;
  let totalPercentCompletion = 0;
  let totalTimeSpent = 0;
  let count = 0;

  assignments.forEach(assignment => {
    if (assignment.class == class_id) {
      totalDifficulty += parseFloat(assignment.difficulty);
      totalPercentCompletion += parseFloat(assignment.perc_comp);
      totalTimeSpent += parseFloat(assignment.time_spent) * (100 / parseFloat(assignment.perc_comp));
      count++;
    }
  });

  let averageDifficulty = totalDifficulty / count;
  let averagePercentCompletion = totalPercentCompletion / count;
  let averageTimeSpent = totalTimeSpent / count;

  document.getElementById('avg-difficulty').textContent = 'Average Difficulty: ' + averageDifficulty.toFixed(2);
  document.getElementById('avg-percent-completion').textContent = 'Average Percent Completion: ' + averagePercentCompletion.toFixed(2) + '%';
  document.getElementById('avg-time-spent').textContent = 'Average Time Spent: ' + averageTimeSpent.toFixed(2) + ' hours';
}