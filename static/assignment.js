var assignment = {};
const description = document.getElementById('description');
const name = document.getElementById('name');
const dueDate = document.getElementById('due');
const difficulty = document.getElementById('difficulty');
const timeSpent = document.getElementById('time_spent');
const completed = document.getElementById('done');

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('assignment-form');
  startLoading();
  // Fetch assignment data and calculate averages
  fetchRequest('/data', {
    "data": "Classes, Assignments"
  })
      .then(data => {
          if (data) {
            data = data.Assignments;
            console.log(data)
              // filter assignments data to match last 4 characters of url
              let assignments = data.filter(assignment => assignment.id.toString().endsWith(window.location.pathname.slice(-4)));
              assignment = assignments[0];
              console.log(assignment)
              // Assuming data contains the necessary fields
              const averageDifficulty = calculateAverage(assignment.difficulty);
              const averageTimeSpent = calculateAverage(assignment.time_spent);
              const percentCompleted = calculatePercentage(assignment.completed);
              console.log(averageDifficulty, averageTimeSpent, percentCompleted)
              // Display the calculated values
              document.getElementById('average-difficulty').textContent = `Average Difficulty: ${averageDifficulty}`;
              document.getElementById('average-time-spent').textContent = `Average Time Spent: ${averageTimeSpent} hours`;
              document.getElementById('percent-completed').textContent = `Class Completion: ${percentCompleted}%`;
          }
          endLoading();
      })
      .catch(error => console.error('Error fetching assignment data:', error));

  form.addEventListener('submit', function(event) {
      event.preventDefault();

      assignment['name'] = name.value;
      assignment['description'] = description.value;
      assignment['due_date'] = dueDate.value;
      // for difficulty, time_spent, and completed, add to the dictionary
      // if difficulty is not a dictionary, create it
      if (typeof assignment.difficulty !== 'object') {
        assignment.difficulty = {};
      }
      if (typeof assignment.time_spent !== 'object') {
        assignment.time_spent = {};
      }
      if (typeof assignment.completed !== 'object') {
        assignment.completed = {};
      }
      assignment['difficulty'][osis] = difficulty.value;
      assignment['time_spent'][osis] = timeSpent.value;
      assignment['completed'][osis] = completed.value;

      fetchRequest('/update_data', {
          "sheet": "Assignments",
          "data": assignment,
          "row_name": "id",
          "row_value": assignment['id']
      });
  });

  // Function to calculate average
  function calculateAverage(dict) {
    // if dict is not a dictionary, return 0
    if (typeof dict !== 'object' || dict === null || Object.keys(dict).length === 0) {
      return 0;
    }
    let vals = Object.values(dict); // Extract values from the dictionary
    let total = vals.reduce((acc, val) => acc + val, 0); // Sum the values
    return (total / vals.length).toFixed(2); // Return average rounded to 2 decimal places
  }

  // Function to calculate percentage of completion of dictionary
  function calculatePercentage(completed) {
      // if completed is not a dictionary, return 0
      if (typeof completed !== 'object' || completed === null || Object.keys(completed).length === 0) {
        return 0;
      }
      // get values of completed
      let vals = Object.values(completed);
      let total = vals.reduce((acc, val) => acc + val, 0);
      return (total / vals.length).toFixed(2);
  }
});