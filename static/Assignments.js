//add event lister to button with id=authorizeGclass to redirect to /init_oauth
// document.getElementById('authorizeGclass').addEventListener('click', function() {
//   window.location.href = "/init_oauth";
// });

//create a fetch request to /get-gclasses to get the user's classes from google classroom, then log them to the console
// document.getElementById('getGclasses').addEventListener('click', function() {
//   fetch('/get-gclasses', {
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       data: {"data":"none"}
      
//     })
// })
//   .then(response => response.json())
//   .then(data => {
//     console.log(data);
//   })
//   .catch(error => {
//     console.log('Assignments.js: An error occurred:' +error);
//   });
// });

//add the assignments to the page
// ... existing code ...

function display_assignments(assignmentList, classList) {
  console.log("in display_assignments", assignmentList.length)
  const assignmentListContainer = document.getElementById('assignmentList');
  assignmentListContainer.innerHTML = ''; // Clear existing assignments

  assignmentList.forEach(assignmentData => {
    
    let class_name, class_id, class_color;

    for (const item of classList) {
      if (item.id === assignmentData['class'].toString()) {
        class_name = item.name;
        class_id = item.id.toString();
        class_color = item.color;
        break;
      }
    }

    
    const assignmentItem = document.createElement('div');
    assignmentItem.classList.add('assignment-item');
    assignmentItem.style.borderLeft = `5px solid ${class_color}`;
    const duedate = processDate(assignmentData.due_date);
    
    assignmentItem.innerHTML = `
      <h3>${assignmentData.name}</h3>
      <p><strong>Due:</strong> ${duedate}</p>
      <p><strong>Class:</strong> <a href="/class/${class_name+class_id}">${class_name}</a></p>
      <p><strong>Type:</strong> ${assignmentData.category}</p>
      <button class="view-details">View Details</button>
    `;

    assignmentItem.querySelector('.view-details').addEventListener('click', () => {
      window.location.href = "/assignment/" + assignmentData.id;
    });

    assignmentListContainer.appendChild(assignmentItem);
    
  });
}

// ... rest of the existing code ...

// Add this new function to toggle the filter form
function toggleFilterForm() {
  const filterForm = document.getElementById('filterForm');
  filterForm.style.display = filterForm.style.display === 'none' ? 'block' : 'none';
}

// Add event listener for the filter button
document.addEventListener('DOMContentLoaded', function() {
  const filterButton = document.getElementById('filterButton');
  filterButton.addEventListener('click', toggleFilterForm);
});




//fetch the assignments from the database
async function get_assignment(){
  var data = await fetchRequest('/data', { data: "FILTERED Classes, FILTERED Assignments" })
  
  
  
  assignmentList = data['Assignments']
  classList = data["Classes"]
  console.log(classList, assignmentList)
  display_assignments(assignmentList, classList)
  document.getElementById('loadingWheel').style.display = "none";
  
}
get_assignment()




// filter classes data where period is 3
// data['Classes'].filter(classObj => classObj.period == 3)

// Function to handle image upload
document.getElementById('assignmentImage').addEventListener('change', async function() {
  console.log("in assignmentImage")
    const fileInput = document.getElementById('assignmentImage');
    const file = fileInput.files[0];

    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64Image = reader.result.split(',')[1]; // Get base64 string without the prefix
        const response = await fetchRequest('/upload_assignments', { image: base64Image });

        if (response && response.data) {
            get_assignment()
        } else {
            console.error("Failed to upload assignments.");
        }
    };

    reader.readAsDataURL(file); // Convert image to base64
});

// Add event listener to the upload button to trigger the file input
document.getElementById('uploadButton').addEventListener('click', function() {
  document.getElementById('assignmentImage').click();
});

function processDate(dateString) {
  // Assuming dateString is in the format 'yyyy-mm-dd'
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`; // Convert to 'mm/dd/yyyy' or any desired format
}
