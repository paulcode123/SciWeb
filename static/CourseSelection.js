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
    'art': 'rgb(75, 192, 192)',
    'music': 'rgb(153, 102, 255)',
    'PE': 'rgb(255, 159, 64)',
    'CS': 'rgb(255, 99, 132)',
    'health': 'rgb(54, 162, 235)'
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
        set_event_listeners(courses)
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
    let infobutton = document.createElement('button');
    courseItem.draggable = true;
    courseItem.id = courseData.id;
    courseItem.classList.add('course-item');
    console.log(color)
    courseItem.style.backgroundColor = color
    courseItem.addEventListener('dragstart', (event) => {
        console.log(courseItem.id)
        event.dataTransfer.setData('text/plain', courseItem.id);
        // Optionally, add some style or indication for dragging
      });
    courseName.textContent = courseData.Name;
    infobutton.textContent = 'ℹ️';
    infobutton.classList.add('info-button');
    infobutton.addEventListener('click', function(){
        //redirect to /reviews/courseData.id
        window.location.href = `/reviews/${courseData.id}`
    });
    courseItem.appendChild(infobutton);
    courseItem.appendChild(courseName);
    location.appendChild(courseItem);
}

function set_event_listeners(courses){
// Select draggable elements
const draggableElements = document.querySelectorAll('[draggable="true"]');

// Add 'dragstart' event listeners


// Select all period elements (drop targets)
const periodElements = document.querySelectorAll('.period');
var original_text = '';
periodElements.forEach(period => {
  period.addEventListener('dragover', (event) => {
    //if 'Drop Class' is still in the period element text content, meaning it has not been set to a class
    if (period.textContent.includes('Drop to add')){
        event.preventDefault(); // This allows us to drop.
    }
    if (period.textContent.includes('Drop Class')){
        
    
    period.classList.add('dragover'); // Change style or class
    if(period.textContent !== 'Drop to add to schedule'){
    original_text = period.textContent; // Store original text content
    }
    period.textContent = "Drop to add to schedule"; // Change text content
}
sleep(100)
});

  period.addEventListener('dragleave', () => {
    //if dragover is in period classList
    if (period.classList.contains('dragover')){
    period.classList.remove('dragover'); // Revert style or class
    period.textContent = original_text; // Revert text content
    }
  });

  period.addEventListener('drop', (event) => {
    if (period.classList.contains('dragover')){
        console.log("Dropped")
    event.preventDefault(); // Prevent default to allow handling the data
    // get id of dragged element
    const course_id = event.dataTransfer.getData('text/plain');
    handle_drop(period, course_id, courses, original_text);
    }
    else{
        console.log(period.classList)
    }
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
    // if the search bar is empty, clear the search results
    if (searchValue === '') {
        searchResultList.innerHTML = '';
    } 
});
}

function handle_drop(period, course_id, courses, original_text){
    var current_width = 97;
    //if period.style.width exists and is not 100%, check if the class can be added to the period
    if (period.style.width !== '' && period.style.width !== '100%'){
        console.log("Checking if allowed")
        current_width = parseInt(period.style.width.slice(0, -1));
        //get course_id of the class in the previous element
        const prev_element = period.previousElementSibling;
        const prev_element_id = prev_element.classList[1].slice(1);
        const allowed = is_allowed(prev_element_id, course_id, courses);
        if (!allowed){
            console.log("Not allowed")
            period.classList.remove('dragover'); // Revert style or class
            period.textContent = original_text;
            return;
        }
    }
    console.log(current_width)
    period.classList.remove('dragover'); // Revert style or class
    const course_element = document.getElementById(course_id);
    // get class from courses given course_id
    console.log(courses)
    console.log(course_id)
    const course = courses.find(course => course.id === course_id);
    console.log(course)
    // get periods per day of the class: format: [2, 2, 1, 1, 1, 2, 1, 1, 1, 1] where the first 5 are PPD in semester 1, and the second 5 in semester 2
    const periods = course.PPD.split(',');
    var next_period = period.nextElementSibling;
    var parent = period.parentElement;
    // if all elements of periods are 2, then set the current period and period below to the class
    if(periods.every(period => period === '2')){
        set_to_class(period, course_element, course_id, original_text);
        set_to_class(period.nextElementSibling, course_element, course_id, 0);
    }
    else if(periods.every(period => period === '1')){
        set_to_class(period, course_element, course_id, original_text);
    }
    //else if all of the first 5 elements are the same as the second 5, and every element is at least 1
    else if(periods.slice(0, 5).length === periods.slice(5, 10).length && periods.slice(0, 5).every((value, index) => value === periods.slice(5, 10)[index]) && periods.every(period => period !== '0')){
        
        //split the div below the current period into 2 separate divs
        var new_part = document.createElement('div');

        new_part.classList.add('period');
        parent.insertBefore(new_part, next_period);
        //set relative widths of elements
        var frac_twos = periods.filter(period => period === '2').length/10;
        new_part_width = frac_twos*97
        new_part.style.width = `${new_part_width}%`;
        next_period.style.width = `${97-new_part_width}%`;
        //set the divs to the class
        set_to_class(period, course_element, course_id, original_text, new_part, next_period);
        set_to_class(new_part, course_element, course_id, 0);
    }
    else{
        //split the div below the current period into 2 separate divs
        var new_part = document.createElement('div');
        new_part.classList.add('period');
        period.textContent = original_text;
        parent.insertBefore(new_part, period);
        //set relative widths of elements
        var frac_ones = periods.filter(period => period === '1').length/10;
        
        new_part_width = frac_ones*97
        new_part.style.width = `${new_part_width}%`;
        period.style.width = `${current_width-new_part_width}%`;
        if (current_width-new_part_width<9){
            period.style.visibility = 'hidden';
            period.style.display = 'none';
        }
        //set the divs to the class
        set_to_class(new_part, course_element, course_id, original_text, new_part, period, current_width);
    }
    
}

function set_to_class(period, course_element, course_id, original_text, new_part=null, next_period=null, current_width=97){
    console.log("Setting to class")
    period.textContent = course_element.textContent; // Example action
    //set background color of period to color of course
    period.style.backgroundColor = course_element.style.backgroundColor;
    //change class from period to scheduledPeriod
    period.classList.remove('period');
    period.classList.add('scheduledPeriod');
    period.classList.add('x'+course_id);
    //add clear button
    if (original_text !== 0){
    var clear_button = document.createElement('button');
    clear_button.textContent = '✖️';
    clear_button.classList.add('clear');
    // add event listener to revert changes made by drag and drop
    clear_EL(clear_button, course_id, original_text, new_part, next_period, current_width);
    period.appendChild(clear_button);
}
}

function clear_EL(clear_button, course_id, original_text, new_part, next_period, current_width){
    clear_button.addEventListener('click', function(){
        let elements = document.querySelectorAll(`.${'x'+course_id.toString()}`);
        elements.forEach((element) => {
            element.textContent = original_text;
            element.style.backgroundColor = 'aliceblue';
            element.classList.remove('scheduledPeriod');
            element.classList.add('period');
        });
        if (new_part !== null){
            new_part.remove();
            next_period.style.width = current_width.toString()+'%';
            //add to period class
            next_period.classList.add('period');
            //if next_period is hidden, make it visible
            if(next_period.style.visibility === 'hidden'){
                next_period.style.visibility = 'visible';
                next_period.style.display = 'block';
            }
            
        }
        clear_button.remove();
    });
}

function is_allowed(courseid1, courseid2, courses){
    console.log(courseid1, courseid2)
    //get course data for both courses
    const course1 = courses.find(course => course.id === courseid1);
    const course2 = courses.find(course => course.id === courseid2);
    //get schedules for both courses
    var schedule1 = course1.PPD.split(',');
    var schedule2 = course2.PPD.split(',');
    //convert elements to integers
    schedule1 = schedule1.map(period => parseInt(period));
    schedule2 = schedule2.map(period => parseInt(period));
    //get whether either has any double periods
    const has_double1 = schedule1.some(period => period === 2);
    const has_double2 = schedule2.some(period => period === 2);
    //check if the schedules are compatible
    //if both are 1 semester classes, indicated by the last 5 elements being 0, return true
    if(schedule1.slice(5, 10).every(period => period === 0) && schedule2.slice(5, 10).every(period => period === 0)){
        return true;
    }
    //for both lists, is has_double is true, subtract 1 from every value of that list
    if(has_double1){
        schedule1 = schedule1.map(period => period - 1);
    }
    if(has_double2){
        schedule2 = schedule2.map(period => period - 1);
    }
    const schedule1_sem_1 = schedule1.slice(0, 5);
    const schedule1_sem_2 = schedule1.slice(5, 10);
    const schedule2_sem_1 = schedule2.slice(0, 5);
    const schedule2_sem_2 = schedule2.slice(5, 10);
    console.log(schedule1_sem_1, schedule1_sem_2, schedule2_sem_1, schedule2_sem_2)
    //get the numerical sums of the elements in each of the lists
    const sem_1_sum = schedule1_sem_1.reduce((a, b) => a + b, 0) + schedule2_sem_1.reduce((a, b) => a + b, 0);
    const sem_2_sum = schedule1_sem_2.reduce((a, b) => a + b, 0) + schedule2_sem_2.reduce((a, b) => a + b, 0);
    console.log(sem_1_sum, sem_2_sum)
    //if the sum of the sem_1 lists or the sum of the sem_2 lists is greater than 5, return false
    if(sem_1_sum > 5 || sem_2_sum > 5){
        return false;
    }
    return true
    
}


// make sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }