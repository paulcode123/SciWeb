const pushList = [];

var classList = 0;


//initialize html elements in join/create class form
const joinButton = document.getElementById('joinButton');
const modalOverlay = document.querySelector('.modal-overlay');
const classForm = document.getElementById('classForm');
const modalClose = document.querySelector('.modal-close');
const confirmDialog = document.querySelector('.confirm-dialog');
const confirmMessage = document.querySelector('.confirm-message');
const periodInput = document.getElementById('periodInput');
const teacherInput = document.getElementById('teacherInput');
const nameInput = document.getElementById('nameInput');
const classOptions = document.getElementById('classOptions');

let selectedClassData = null;

// Show modal
joinButton.addEventListener('click', (e) => {
    e.preventDefault();
    modalOverlay.style.display = 'flex';
    setTimeout(() => {
        modalOverlay.classList.add('show');
    }, 10);
});

// Close modal
modalClose.addEventListener('click', () => {
    closeModal();
});

// Close modal when clicking outside
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

function closeModal() {
    modalOverlay.classList.remove('show');
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        classForm.reset();
    }, 300);
}

//add event listeners to input fields, so that class options are updated as the user types
periodInput.addEventListener('input', updateClassOptions);
teacherInput.addEventListener('input', updateClassOptions);
nameInput.addEventListener('input', updateClassOptions);

function updateClassOptions() {
  // Get the variables for the current values of the input fields
  const periodValue = periodInput.value;
  const teacherValue = teacherInput.value.toLowerCase();
  const nameValue = nameInput.value.toLowerCase();
  // Filter the class list based on the input values
  //get the period, teacher, and name of each class
  const filteredOptions = classList.filter(classData => {
    console.log(classData);
    var { period, teacher, name} = classData;
    console.log(period, teacher, name);
    period = period.toString();
    //return true if the period, teacher, and name of the class match the input values
    return period.includes(periodValue) && teacher.toLowerCase().includes(teacherValue) && name.toLowerCase().includes(nameValue);
  });
  showOptions(classOptions, filteredOptions);
}

// Enhanced class options display
function showOptions(container, options) {
    container.innerHTML = '';
    options.forEach(({ period, teacher, name }) => {
        const option = document.createElement('div');
        option.className = 'class-option';
        option.innerHTML = `
            <div class="class-option-name">${name}</div>
            <div class="class-option-details">Period ${period} - ${teacher}</div>
        `;
        
        option.addEventListener('click', () => {
            periodInput.value = period;
            teacherInput.value = teacher;
            nameInput.value = name;
            selectedClassData = { period, teacher, name };
            showConfirmDialog();
        });
        
        container.appendChild(option);
    });
}

// Show confirmation dialog
function showConfirmDialog() {
    const { period, teacher, name } = selectedClassData;
    const existingClass = classList.find(c => 
        c.period.toString() === period.toString() && 
        c.teacher.toLowerCase() === teacher.toLowerCase()
    );

    confirmDialog.style.display = 'block';
    
    // Get button elements
    const joinBtn = document.querySelector('.confirm-btn.join');
    const createBtn = document.querySelector('.confirm-btn.create');
    
    if (existingClass) {
        // Show only join button for existing class
        confirmMessage.textContent = `Join existing class "${name}" with ${teacher}?`;
        joinBtn.style.display = 'block';
        createBtn.style.display = 'none';
    } else {
        // Show only create button for new class
        confirmMessage.textContent = `Create new class "${name}" with ${teacher}?`;
        joinBtn.style.display = 'none';
        createBtn.style.display = 'block';
    }
    
    setTimeout(() => confirmDialog.classList.add('show'), 10);
}

// Handle confirmation buttons
document.querySelector('.confirm-btn.join').addEventListener('click', () => {
    handleClassAction('join');
});

document.querySelector('.confirm-btn.create').addEventListener('click', () => {
    handleClassAction('create');
});

document.querySelector('.confirm-btn.cancel').addEventListener('click', () => {
    closeConfirmDialog();
});

function closeConfirmDialog() {
    confirmDialog.classList.remove('show');
    setTimeout(() => {
        confirmDialog.style.display = 'none';
        selectedClassData = null;
    }, 300);
}

async function handleClassAction(action) {
    const formData = {
        period: periodInput.value,
        teacher: teacherInput.value,
        name: nameInput.value,
        categories: document.getElementById('categories').value
    };

    try {
        let response;
        if (action === 'join') {
            // Handle joining existing class
            const existingClass = classList.find(c => 
                c.period.toString() === formData.period && 
                c.teacher === formData.teacher
            );
            if (existingClass) {
                existingClass.OSIS = existingClass.OSIS + ", " + osis;
                response = await fetchRequest('/update_data', {
                    sheet: 'Classes',
                    data: existingClass,
                    row_name: 'id',
                    row_value: existingClass.id
                });
            }
        } else {
            // Handle creating new class
            const newClass = {
                ...formData,
                OSIS: osis,
                id: (Math.floor(Math.random() * 9000) + 1000).toString(),
                categories: parseCategories(formData.categories)
            };
            response = await fetchRequest('/post_data', {
                sheet: 'Classes',
                data: newClass
            });
        }

        if (response.success) {
            showNotification(`Class ${action}ed successfully!`, 'success');
            closeConfirmDialog();
            closeModal();
            location.reload();
        } else {
            showNotification(`Error ${action}ing class`, 'error');
        }
    } catch (error) {
        showNotification(`Error ${action}ing class`, 'error');
        console.error('Error:', error);
    }
}

function parseCategories(categoriesString) {
    if (!categoriesString) return [];
    const parts = categoriesString.split(/,\s+/);
    const result = [];
    parts.forEach(part => {
        const [name, percentage] = part.split(': ');
        result.push(name, parseInt(percentage));
    });
    return result;
}

//display the classes that the user is a member of
function display_classes(classList, user_data){
  const classListContainer = document.getElementById('classList');
  const userosis = user_data['osis'].toString();
    //for each class in the database...
    console.log(classList)
    classList.forEach(classData => {
      //if the user's osis is not in the class's osis list, skip the class
      let classosiss = classData.OSIS.toString();
      if(!(classosiss.includes(userosis))){return;}
      //otherwise, create a div for the class and add it to the class list container
      const classItem = document.createElement('div');
      classItem.classList.add('class-item');
      classItem.style.backgroundColor = classData.color;
      classItem.innerHTML = `
        <h3>${classData.name}</h3>
        <p>Teacher: ${classData.teacher}</p>
      `;
      // if the class is clicked, go to the class page
      classItem.addEventListener('click', () => {
        // set classname as classData.name with all of the numbers and spaces removed
        let classname = classData.name.replace(/\s/g, '');
        classname = classname.replace(/[0-9]/g, '');
        window.location.href = "/class/" + classname + classData['id'];
      });
      //add the class element to the class list container
      classListContainer.appendChild(classItem);
    });
  
}

//wait before running the function to ensure that the user's osis is defined
setTimeout(() => {
      init_fetch()
    }, 0.1);
async function init_fetch(){
  console.log("in init_fetch")
  startLoading();
  const data = await fetchRequest('/data', { data: 'Name, Classes' });

  
  classList = data['Classes']
  user_data = data['Name']
  console.log(classList)
  display_classes(classList, user_data)
  endLoading();
}

//if the user joined or created a class, update the class sheet in the database
async function post_classes(data, update){
  if (update === 0){
    response = await fetchRequest('/post_data', {"sheet": "Classes", "data": data});
  }
  else{
    response = await fetchRequest('/update_data', {"sheet": "Classes", "data": data, "row_name": 'id', "row_value": data.id});
  }  
  console.log(response);
  location.reload();
  
}

// Initialize particles.js
particlesJS('particles-js', {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#4a90e2' },
        shape: { type: 'circle' },
        opacity: {
            value: 0.5,
            random: false,
            animation: { enable: true, speed: 1, minimumValue: 0.1, sync: false }
        },
        size: {
            value: 3,
            random: true,
            animation: { enable: true, speed: 2, minimumValue: 0.1, sync: false }
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: '#4a90e2',
            opacity: 0.4,
            width: 1
        },
        move: {
            enable: true,
            speed: 1,
            direction: 'none',
            random: false,
            straight: false,
            outModes: { default: 'bounce' },
            attract: { enable: false, rotateX: 600, rotateY: 1200 }
        }
    },
    interactivity: {
        detectsOn: 'canvas',
        events: {
            onhover: { enable: true, mode: 'repulse' },
            onclick: { enable: true, mode: 'push' },
            resize: true
        },
        modes: {
            repulse: { distance: 100, duration: 0.4 },
            push: { particles_nb: 4 }
        }
    },
    retina_detect: true
});

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Enhanced class item creation
function createClassElement(classData) {
    const classItem = document.createElement('div');
    classItem.className = 'class-item';
    
    const progress = Math.floor(Math.random() * 100); // Replace with actual progress calculation
    
    classItem.innerHTML = `
        <h3>${classData.name}</h3>
        <p>Period ${classData.period} - ${classData.teacher}</p>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <p class="progress-text">${progress}% Complete</p>
    `;
    
    // Add hover animation
    classItem.addEventListener('mouseenter', () => {
        classItem.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    classItem.addEventListener('mouseleave', () => {
        classItem.style.transform = 'translateY(0) scale(1)';
    });
    
    return classItem;
}

// Enhanced form handling
document.getElementById('joinButton').addEventListener('click', () => {
    const form = document.getElementById('classForm');
    form.style.display = 'block';
    setTimeout(() => form.classList.add('show'), 10);
});

// Form submission with animation
document.getElementById('classForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        period: document.getElementById('periodInput').value,
        teacher: document.getElementById('teacherInput').value,
        name: document.getElementById('nameInput').value,
        categories: document.getElementById('categories').value
    };
    
    try {
        const response = await fetchRequest('/post_data', {
            sheet: 'Classes',
            data: formData
        });
        
        if (response.success) {
            const classElement = createClassElement(formData);
            document.getElementById('classList').appendChild(classElement);
            showNotification('Class added successfully!', 'success');
            
            // Reset and hide form with animation
            e.target.reset();
            const form = document.getElementById('classForm');
            form.classList.remove('show');
            setTimeout(() => form.style.display = 'none', 300);
        } else {
            showNotification('Error adding class', 'error');
        }
    } catch (error) {
        showNotification('Error adding class', 'error');
        console.error('Error:', error);
    }
});

// Load existing classes with animation
async function loadClasses() {
    try {
        const response = await fetchRequest('/data', {data: 'Classes'});
        const classList = document.getElementById('classList');
        
        if (response.success && response.data.Classes) {
            response.data.Classes.forEach((classData, index) => {
                const classElement = createClassElement(classData);
                classElement.style.animationDelay = `${index * 0.1}s`;
                classList.appendChild(classElement);
            });
        }
    } catch (error) {
        showNotification('Error loading classes', 'error');
        console.error('Error:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadClasses();
});

// Utility functions for class data management
const ClassDataManager = {
    // Fetch all classes
    async fetchAllClasses() {
        try {
            const data = await fetchRequest('/data', { data: 'Classes' });
            return data.Classes || [];
        } catch (error) {
            console.error('Error fetching classes:', error);
            throw error;
        }
    },

    // Fetch user's classes
    async fetchUserClasses(userOsis) {
        try {
            const classes = await this.fetchAllClasses();
            return classes.filter(cls => cls.OSIS.toString().includes(userOsis));
        } catch (error) {
            console.error('Error fetching user classes:', error);
            throw error;
        }
    },

    // Get unique subjects from classes
    getUniqueSubjects(classes) {
        const subjectMap = {
            'Math': 'mathematics',
            'Physics': 'physics',
            'Chemistry': 'chemistry',
            'Biology': 'biology',
            'Computer Science': 'computer-science'
        };

        const subjects = new Set();
        classes.forEach(cls => {
            const className = cls.name.toLowerCase();
            for (const [subject, value] of Object.entries(subjectMap)) {
                if (className.includes(subject.toLowerCase())) {
                    subjects.add({ name: subject, value: value });
                }
            }
        });
        return Array.from(subjects);
    },

    // Populate a select element with class options
    populateClassSelect(selectElement, classes, includeDefault = true) {
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add default option if requested
        if (includeDefault) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a class';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            selectElement.appendChild(defaultOption);
        }

        // Add class options
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            selectElement.appendChild(option);
        });
    },

    // Populate a select element with subject options
    populateSubjectSelect(selectElement, subjects, includeDefault = true) {
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add default option if requested
        if (includeDefault) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a subject';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            selectElement.appendChild(defaultOption);
        }

        // Add subject options
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.value;
            option.textContent = subject.name;
            selectElement.appendChild(option);
        });
    },

    // Get class categories
    getClassCategories(classData) {
        try {
            if (!classData.categories) return [];
            const categories = typeof classData.categories === 'string' 
                ? JSON.parse(classData.categories) 
                : classData.categories;
            return categories.filter((_, index) => index % 2 === 0); // Filter out weights
        } catch (error) {
            console.error('Error parsing categories:', error);
            return [];
        }
    },

    // Populate a select element with category options
    populateCategorySelect(selectElement, categories, includeDefault = true) {
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add default option if requested
        if (includeDefault) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a category';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            selectElement.appendChild(defaultOption);
        }

        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selectElement.appendChild(option);
        });
    }
};

// Export the ClassDataManager for use in other files
window.ClassDataManager = ClassDataManager;