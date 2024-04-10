console.log("CourseSelection.js loaded");
const color_key = {
    'science': 'rgb(255, 99, 132)',
    'math': 'rgb(54, 162, 235)',
    'english': 'rgb(255, 205, 86)',
    'history': 'rgb(75, 192, 192)',
    'language': 'rgb(153, 102, 255)',
    'elective': 'rgb(255, 159, 64)',
    'lunch': 'rgb(255, 99, 132)',
    'free': 'rgb(54, 162, 235)',
    'research': 'rgb(255, 205, 86)',
}
// const categories = ['science', 'math', 'english', 'history', 'language', 'elective', 'lunch', 'free', 'research', 'chem', 'bio', 'physics', 'CS', 'AP']
//write fetch request to /data for Courses sheet
fetch('/data', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: "Courses" })
    })
    .then(response => response.json())
    .then(data => {
        var courses = data['Courses']
        display_courses(courses)
        set_event_listeners()
        set_search(courses)
    })
    .catch(error => {
        console.error('An error occurred in Home.js :' +error);
    });

//display the courses in the courses container
function display_courses(courses){
    var courseListContainer = document.getElementById('classList');
    courses.forEach(courseData => {
        if ((courseData.grade_rec).includes(grade.toString())){
            display_course(courseData, courseListContainer)
        }
    });
}

function display_course(courseData, location){
    let categories = courseData.categories.split(', ')
    let color = color_key[categories[0]];
    let courseItem = document.createElement('div');
    let courseName = document.createElement('p');
    courseItem.draggable = true;
    courseItem.id = courseData.id;
    courseItem.classList.add('course-item');
    console.log(color)
    courseItem.style.backgroundColor = color
    courseName.textContent = courseData.Name;
    courseItem.appendChild(courseName);
    location.appendChild(courseItem);
}

function set_event_listeners(){
// Select draggable elements
const draggableElements = document.querySelectorAll('[draggable="true"]');

// Add 'dragstart' event listeners
draggableElements.forEach(el => {
  el.addEventListener('dragstart', (event) => {
    console.log(el.id)
    event.dataTransfer.setData('text/plain', el.id);
    // Optionally, add some style or indication for dragging
  });
});

// Select all period elements (drop targets)
const periodElements = document.querySelectorAll('.period');
var original_text = '';
periodElements.forEach(period => {
  period.addEventListener('dragover', (event) => {
    event.preventDefault(); // This allows us to drop.
    period.classList.add('dragover'); // Change style or class
    if(period.textContent !== 'Drop to add to schedule'){
    original_text = period.textContent; // Store original text content
    }
    period.textContent = "Drop to add to schedule"; // Change text content
  });

  period.addEventListener('dragleave', () => {
    period.classList.remove('dragover'); // Revert style or class
    period.textContent = original_text; // Revert text content
  });

  period.addEventListener('drop', (event) => {
    event.preventDefault(); // Prevent default to allow handling the data
    period.classList.remove('dragover'); // Revert style or class
    // get id of dragged element
    const course_id = event.dataTransfer.getData('text/plain');
    const course_element = document.getElementById(course_id);
    period.textContent = course_element.textContent; // Example action
    //set background color of period to color of course
    period.style.backgroundColor = course_element.style.backgroundColor;
    //change text font and size
    period.style.fontSize = '20px';
    period.style.fontFamily = 'Arial';
    //turn off italics
    period.style.fontStyle = 'normal';
    //turn text black
    period.style.color = 'black';
    period.id = data;
  });
});
}

function set_search(courseData){
    // add event listener on input box with id=search
    const searchBar = document.getElementById('search');
    const searchResultList = document.getElementById('searchResults');
    searchBar.addEventListener('input', function() {
    // clear search results
    searchResultList.innerHTML = '';
    // get search value
    const searchValue = this.value.toLowerCase();
    for (const course of courseData) {
        // get course name
        const courseName = course.Name.toLowerCase();
        // check if course name includes search value
        if (courseName.includes(searchValue)) {
            display_course(course, searchResultList)
        }
        else if(course.categories.includes(searchValue)){
            display_course(course, searchResultList)
        }
    }   
});
}

