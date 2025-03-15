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
      
      // Calculate average rating
      const avgRating = classData.ratings ? 
          (classData.ratings.reduce((a, b) => a + b, 0) / classData.ratings.length).toFixed(1) : 
          'No ratings';

      // Get pros and cons
      const pros = classData.pros || [];
      const cons = classData.cons || [];

      classItem.innerHTML = `
        <div class="class-content" data-class-id="${classData.id}">
          <h3>${classData.name}</h3>
          <p>Period ${classData.period} - ${classData.teacher}</p>
          <div class="feedback-summary">
              ${pros.length > 0 ? `
                  <div class="pros-summary">
                      <h4>Pros:</h4>
                      <ul>${pros.slice(0, 3).map(pro => `<li>${pro}</li>`).join('')}</ul>
                  </div>
              ` : ''}
              ${cons.length > 0 ? `
                  <div class="cons-summary">
                      <h4>Cons:</h4>
                      <ul>${cons.slice(0, 3).map(pro => `<li>${pro}</li>`).join('')}</ul>
                  </div>
              ` : ''}
          </div>
        </div>
        <div class="rating-display">
            <div class="stars">
                ${getStarDisplay(avgRating)}
            </div>
            <span class="rating-number">${typeof avgRating === 'number' ? avgRating : 'No ratings'}</span>
        </div>`;

      // Add click event listener to the class content
      const classContent = classItem.querySelector('.class-content');
      classContent.addEventListener('click', (e) => {
        // Navigate to the class page
        window.location.href = `/class/${classData.id}`;
      });

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

// Function to handle class recommendations
async function handleRecommendation(classId, isRecommended, reason) {
    try {
        const classData = classList.find(c => c.id === classId);
        if (!classData) return;

        if (!classData.recommendations) {
            classData.recommendations = [];
        }

        // Add new recommendation
        const recommendation = {
            isRecommended,
            reason,
            timestamp: new Date().toISOString(),
            userId: osis // Global user OSIS
        };

        classData.recommendations.push(recommendation);

        // Update the class data in the database
        await fetchRequest('/update_data', {
            sheet: 'Classes',
            data: classData,
            row_name: 'id',
            row_value: classId
        });

        showNotification('Recommendation saved successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error saving recommendation:', error);
        showNotification('Error saving recommendation', 'error');
        return false;
    }
}

// Function to show recommendation modal
function showRecommendationModal(classId, className) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Recommend ${className}</h3>
            <p>Please provide feedback about the coursework nature only. Do not comment about teachers.</p>
            <div class="form-group">
                <label>Would you recommend this class based on its coursework?</label>
                <div class="recommendation-actions">
                    <button class="recommendation-btn recommend-btn" data-recommend="true">
                        <i class="fas fa-thumbs-up"></i> Recommend
                    </button>
                    <button class="recommendation-btn not-recommend-btn" data-recommend="false">
                        <i class="fas fa-thumbs-down"></i> Not Recommend
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label for="recommendation-reason">Why? (Focus on coursework only)</label>
                <textarea id="recommendation-reason" placeholder="Describe the coursework nature, difficulty level, and workload..." rows="4"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="button primary" id="submit-recommendation">Submit</button>
                <button type="button" class="button secondary" id="cancel-recommendation">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    let selectedRecommendation = null;
    const reasonInput = modal.querySelector('#recommendation-reason');

    // Handle recommendation button clicks
    modal.querySelectorAll('.recommendation-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.recommendation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRecommendation = btn.dataset.recommend === 'true';
        });
    });

    // Handle submit
    modal.querySelector('#submit-recommendation').addEventListener('click', async () => {
        if (selectedRecommendation === null) {
            showNotification('Please select whether you recommend this class', 'error');
            return;
        }

        const reason = reasonInput.value.trim();
        if (!reason) {
            showNotification('Please provide a reason for your recommendation', 'error');
            return;
        }

        if (reason.toLowerCase().includes('teacher') || reason.toLowerCase().includes('professor')) {
            showNotification('Please do not mention teachers in your recommendation', 'error');
            return;
        }

        const success = await handleRecommendation(classId, selectedRecommendation, reason);
        if (success) {
            modal.remove();
            location.reload();
        }
    });

    // Handle cancel
    modal.querySelector('#cancel-recommendation').addEventListener('click', () => {
        modal.remove();
    });
}

// Add moving lines to background
function createMovingLines() {
    const container = document.createElement('div');
    container.className = 'line-container';
    for (let i = 0; i < 20; i++) {
        const line = document.createElement('div');
        line.className = 'moving-line';
        line.style.top = `${Math.random() * 100}%`;
        line.style.animationDelay = `${Math.random() * 8}s`;
        container.appendChild(line);
    }
    document.body.appendChild(container);
}

// Enhanced class display function
function createClassElement(classData) {
    const classItem = document.createElement('div');
    classItem.className = 'class-item';
    
    // Calculate average rating
    const avgRating = classData.ratings ? 
        (classData.ratings.reduce((a, b) => a + b, 0) / classData.ratings.length).toFixed(1) : 
        'No ratings';

    // Get pros and cons
    const pros = classData.pros || [];
    const cons = classData.cons || [];

    classItem.innerHTML = `
        <h3>${classData.name}</h3>
        <p>Period ${classData.period}</p>
        <div class="rating-display">
            <div class="stars">
                ${getStarDisplay(avgRating)}
            </div>
            <span class="rating-number">${typeof avgRating === 'number' ? avgRating : 'No ratings'}</span>
        </div>
        <div class="feedback-summary">
            ${pros.length > 0 ? `
                <div class="pros-summary">
                    <h4>Pros:</h4>
                    <ul>${pros.slice(0, 3).map(pro => `<li>${pro}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${cons.length > 0 ? `
                <div class="cons-summary">
                    <h4>Cons:</h4>
                    <ul>${cons.slice(0, 3).map(con => `<li>${con}</li>`).join('')}</ul>
                </div>
            ` : ''}
        </div>
        <button class="review-btn" onclick="showReviewModal('${classData.id}', '${classData.name}')">
            Add Review
        </button>
    `;

    return classItem;
}

function getStarDisplay(rating) {
    if (typeof rating !== 'number') return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '⯨';
    stars += '☆'.repeat(5 - Math.ceil(rating));
    return stars;
}

function showReviewModal(classId, className) {
    const modal = document.createElement('div');
    modal.className = 'review-modal';
    
    const prosOptions = [
        'Engaging coursework',
        'Visual learning',
        'Project-based',
        'Interactive lessons',
        'Clear objectives',
        'Hands-on activities',
        'Well-structured',
        'Collaborative work',
        'Real-world applications'
    ];

    const consOptions = [
        'Test heavy',
        'Heavy workload',
        'Uninteresting material',
        'Fast-paced',
        'Complex concepts',
        'Limited resources',
        'Time-consuming assignments',
        'Rigid structure',
        'Limited feedback'
    ];

    modal.innerHTML = `
        <div class="review-content">
            <div class="review-header">
                <h2>Review ${className}</h2>
                <button class="modal-close">×</button>
            </div>
            
            <div class="review-form">
                <div class="star-rating" data-rating="0">
                    <span class="star" data-value="1">☆</span>
                    <span class="star" data-value="2">☆</span>
                    <span class="star" data-value="3">☆</span>
                    <span class="star" data-value="4">☆</span>
                    <span class="star" data-value="5">☆</span>
                </div>
                
                <div class="feedback-sections">
                    <div class="pros-section">
                        <h4>Pros</h4>
                        ${prosOptions.map(option => `
                            <label class="checkbox-option">
                                <input type="checkbox" name="pros" value="${option}">
                                ${option}
                            </label>
                        `).join('')}
                    </div>
                    
                    <div class="cons-section">
                        <h4>Cons</h4>
                        ${consOptions.map(option => `
                            <label class="checkbox-option">
                                <input type="checkbox" name="cons" value="${option}">
                                ${option}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="submit-review">Submit Review</button>
                    <button type="button" class="cancel-review">Cancel</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    // Handle star rating
    let currentRating = 0;
    const stars = modal.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.dataset.value);
            updateStars(stars, rating);
        });
        star.addEventListener('click', () => {
            currentRating = parseInt(star.dataset.value);
            updateStars(stars, currentRating);
            stars.forEach((s, index) => {
                if (index < currentRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    const starRating = modal.querySelector('.star-rating');
    starRating.addEventListener('mouseout', () => {
        updateStars(stars, currentRating);
    });

    // Handle form submission
    modal.querySelector('.submit-review').addEventListener('click', async () => {
        if (currentRating === 0) {
            showNotification('Please select a rating', 'error');
            return;
        }

        const selectedPros = Array.from(modal.querySelectorAll('input[name="pros"]:checked'))
            .map(input => input.value);
        const selectedCons = Array.from(modal.querySelectorAll('input[name="cons"]:checked'))
            .map(input => input.value);

        if (selectedPros.length === 0 && selectedCons.length === 0) {
            showNotification('Please select at least one pro or con', 'error');
            return;
        }

        const success = await handleReview(classId, {
            rating: currentRating,
            pros: selectedPros,
            cons: selectedCons
        });

        if (success) {
            modal.remove();
            location.reload();
        }
    });

    // Handle close and cancel
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.cancel-review').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function updateStars(stars, rating) {
    stars.forEach(star => {
        const value = parseInt(star.dataset.value);
        star.textContent = value <= rating ? '★' : '☆';
    });
}

async function handleReview(classId, reviewData) {
    try {
        const classData = classList.find(c => c.id === classId);
        if (!classData) return false;

        if (!classData.ratings) classData.ratings = [];
        if (!classData.pros) classData.pros = [];
        if (!classData.cons) classData.cons = [];

        classData.ratings.push(reviewData.rating);
        classData.pros.push(...reviewData.pros);
        classData.cons.push(...reviewData.cons);

        // Update the class data in the database
        const response = await fetchRequest('/update_data', {
            sheet: 'Classes',
            data: classData,
            row_name: 'id',
            row_value: classId
        });

        if (response.success) {
            showNotification('Review submitted successfully!', 'success');
            return true;
        }
        throw new Error('Failed to update class data');
    } catch (error) {
        console.error('Error saving review:', error);
        showNotification('Error saving review', 'error');
        return false;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createMovingLines();
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

// Initialize filters and class display
async function initializeFilters() {
    const periodFilter = document.getElementById('periodFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    
    // Initialize period filter (1-9)
    periodFilter.innerHTML = '<option value="">All Periods</option>';
    for (let i = 1; i <= 9; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Period ${i}`;
        periodFilter.appendChild(option);
    }

    try {
        // Fetch all classes from database
        const data = await fetchRequest('/data', { data: 'Classes' });
        classList = data.Classes || [];
        
        // Get unique subjects from classes
        const subjects = new Set(classList.map(cls => cls.subject));
        
        // Initialize subject filter
        subjectFilter.innerHTML = '<option value="">All Subjects</option>';
        subjects.forEach(subject => {
            if (subject) {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectFilter.appendChild(option);
            }
        });

        // Add event listeners for filters
        periodFilter.addEventListener('change', filterClasses);
        subjectFilter.addEventListener('change', filterClasses);
        document.getElementById('classSearch').addEventListener('input', filterClasses);

        // Initialize enrolled classes section
        initializeEnrolledClasses();
    } catch (error) {
        console.error('Error initializing filters:', error);
        showNotification('Error loading class data', 'error');
    }
}

// Filter classes based on selected criteria
function filterClasses() {
    const periodValue = document.getElementById('periodFilter').value;
    const subjectValue = document.getElementById('subjectFilter').value;
    const searchValue = document.getElementById('classSearch').value.toLowerCase();
    
    const filteredClasses = classList.filter(cls => {
        const matchesPeriod = !periodValue || cls.period.toString() === periodValue;
        const matchesSubject = !subjectValue || cls.subject === subjectValue;
        const matchesSearch = !searchValue || 
            cls.name.toLowerCase().includes(searchValue) || 
            cls.teacher.toLowerCase().includes(searchValue);
        
        return matchesPeriod && matchesSubject && matchesSearch;
    });

    displayFilteredClasses(filteredClasses);
}

// Display filtered classes
function displayFilteredClasses(classes) {
    const classListContainer = document.getElementById('classList');
    classListContainer.innerHTML = '';

    if (classes.length === 0) {
        classListContainer.innerHTML = `
            <div class="no-classes">
                <i class="fas fa-search"></i>
                <p>No classes found matching your criteria</p>
            </div>
        `;
        return;
    }

    classes.forEach(classData => {
        const classItem = createClassElement(classData);
        classListContainer.appendChild(classItem);
    });
}

// Initialize enrolled classes section
function initializeEnrolledClasses() {
    // Create enrolled classes section if it doesn't exist
    let enrolledSection = document.querySelector('.enrolled-classes');
    if (!enrolledSection) {
        enrolledSection = document.createElement('div');
        enrolledSection.className = 'enrolled-classes';
        enrolledSection.innerHTML = `
            <h2><i class="fas fa-book-reader"></i> My Enrolled Classes</h2>
            <div class="enrolled-grid"></div>
        `;
        document.querySelector('.class-management').appendChild(enrolledSection);
    }

    // Display enrolled classes
    displayEnrolledClasses();
}

// Display enrolled classes
async function displayEnrolledClasses() {
    try {
        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();
        
        const enrolledClasses = classList.filter(cls => 
            cls.OSIS && cls.OSIS.toString().includes(userOsis)
        );

        const enrolledGrid = document.querySelector('.enrolled-grid');
        enrolledGrid.innerHTML = '';

        if (enrolledClasses.length === 0) {
            enrolledGrid.innerHTML = `
                <div class="no-classes">
                    <i class="fas fa-info-circle"></i>
                    <p>You are not enrolled in any classes yet</p>
                </div>
            `;
            return;
        }

        enrolledClasses.forEach(classData => {
            const classCard = createEnrolledClassCard(classData);
            enrolledGrid.appendChild(classCard);
        });
    } catch (error) {
        console.error('Error displaying enrolled classes:', error);
        showNotification('Error loading enrolled classes', 'error');
    }
}

// Create enrolled class card
function createEnrolledClassCard(classData) {
    const card = document.createElement('div');
    card.className = 'enrolled-class-card';
    
    const avgGrade = classData.grades ? 
        (classData.grades.reduce((a, b) => a + b, 0) / classData.grades.length).toFixed(1) : 
        'N/A';

    card.innerHTML = `
        <div class="class-header" style="background-color: ${classData.color || '#4a90e2'}">
            <h3>${classData.name}</h3>
            <span class="period-badge">Period ${classData.period}</span>
        </div>
        <div class="class-details">
            <p><i class="fas fa-user-tie"></i> ${classData.teacher}</p>
            <p><i class="fas fa-book"></i> ${classData.subject}</p>
            <div class="grade-info">
                <span class="grade-label">Current Grade</span>
                <span class="grade-value">${avgGrade}</span>
            </div>
        </div>
        <div class="class-actions">
            <button onclick="window.location.href='/Class/${classData.id}'" class="action-button primary">
                <i class="fas fa-door-open"></i> Enter Class
            </button>
        </div>
    `;

    return card;
}

// Initialize course selection tool
document.getElementById('courseToolButton').addEventListener('click', () => {
    showCourseSelectionTool();
});

function showCourseSelectionTool() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content course-tool">
            <div class="modal-header">
                <h2><i class="fas fa-tools"></i> Course Selection Tool</h2>
                <button class="modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="course-filters">
                    <div class="filter-group">
                        <label>Grade Level</label>
                        <select id="gradeFilter">
                            <option value="">All Grades</option>
                            <option value="9">Grade 9</option>
                            <option value="10">Grade 10</option>
                            <option value="11">Grade 11</option>
                            <option value="12">Grade 12</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Subject Area</label>
                        <select id="courseSubjectFilter">
                            <option value="">All Subjects</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Science">Science</option>
                            <option value="English">English</option>
                            <option value="Social Studies">Social Studies</option>
                            <option value="Computer Science">Computer Science</option>
                        </select>
                    </div>
                </div>
                <div class="course-recommendations">
                    <!-- Will be populated dynamically -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    // Initialize course tool functionality
    initializeCourseSelectionTool(modal);
}

// Initialize course selection tool
function initializeCourseSelectionTool(modal) {
    const gradeFilter = modal.querySelector('#gradeFilter');
    const subjectFilter = modal.querySelector('#courseSubjectFilter');
    const recommendationsContainer = modal.querySelector('.course-recommendations');

    // Add event listeners
    gradeFilter.addEventListener('change', updateRecommendations);
    subjectFilter.addEventListener('change', updateRecommendations);
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });

    // Initial recommendations
    updateRecommendations();

    function updateRecommendations() {
        const grade = gradeFilter.value;
        const subject = subjectFilter.value;
        
        // Filter classes based on selection
        const recommendations = classList.filter(cls => {
            const matchesGrade = !grade || cls.grade === grade;
            const matchesSubject = !subject || cls.subject === subject;
            return matchesGrade && matchesSubject;
        });

        displayRecommendations(recommendations);
    }

    function displayRecommendations(recommendations) {
        recommendationsContainer.innerHTML = recommendations.length ? '' : `
            <div class="no-recommendations">
                <i class="fas fa-info-circle"></i>
                <p>No courses found matching your criteria</p>
            </div>
        `;

        recommendations.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <h3>${course.name}</h3>
                <p class="course-info">
                    <span><i class="fas fa-clock"></i> Period ${course.period}</span>
                    <span><i class="fas fa-user-tie"></i> ${course.teacher}</span>
                </p>
                <p class="course-description">${course.description || 'No description available'}</p>
                <div class="course-stats">
                    <div class="stat">
                        <span class="stat-label">Average Grade</span>
                        <span class="stat-value">${calculateAverageGrade(course)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Class Size</span>
                        <span class="stat-value">${calculateClassSize(course)}</span>
                    </div>
                </div>
                <button onclick="handleClassAction('join', ${course.id})" class="action-button primary">
                    <i class="fas fa-plus"></i> Join Class
                </button>
            `;
            recommendationsContainer.appendChild(card);
        });
    }
}

function calculateAverageGrade(course) {
    if (!course.grades || course.grades.length === 0) return 'N/A';
    const avg = course.grades.reduce((a, b) => a + b, 0) / course.grades.length;
    return `${avg.toFixed(1)}%`;
}

function calculateClassSize(course) {
    if (!course.OSIS) return '0';
    return course.OSIS.toString().split(',').length;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    createMovingLines();
});

async function loadClassData() {
    try {
        // Get user's OSIS from the session
        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();
        
        // Fetch user's classes
        const userClasses = await ClassDataManager.fetchUserClasses(userOsis);
        const subjectSelect = document.getElementById('subject');
        
        if (!subjectSelect) {
            console.error('Subject select element not found');
            return;
        }

        // Clear existing options except the default one
        while (subjectSelect.options.length > 1) {
            subjectSelect.remove(1);
        }

        // Sort classes by period
        userClasses.sort((a, b) => {
            const periodA = parseInt(a.period) || 0;
            const periodB = parseInt(b.period) || 0;
            return periodA - periodB;
        });

        // Group classes by period (1-9)
        const periodGroups = {};
        for (let i = 1; i <= 9; i++) {
            periodGroups[i] = [];
        }

        userClasses.forEach(cls => {
            const period = parseInt(cls.period);
            if (period >= 1 && period <= 9) {
                periodGroups[period].push(cls);
            }
        });

        // Create option groups for each period
        Object.entries(periodGroups).forEach(([period, classes]) => {
            if (classes.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `Period ${period}`;
                
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    optgroup.appendChild(option);
                });
                
                subjectSelect.appendChild(optgroup);
            }
        });

        // Add event listener for subject change
        subjectSelect.addEventListener('change', (e) => {
            const selectedClass = userClasses.find(cls => cls.id === e.target.value);
            if (selectedClass) {
                updateTopicSuggestions(selectedClass);
            }
        });

    } catch (error) {
        console.error('Error loading class data:', error);
        showNotification('Error loading classes. Please try again.', 'error');
    }
}

// Add function to display enrolled classes at the bottom
async function displayEnrolledClasses() {
    try {
        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();
        const userClasses = await ClassDataManager.fetchUserClasses(userOsis);

        // Create or get the enrolled classes section
        let enrolledSection = document.getElementById('enrolled-classes');
        if (!enrolledSection) {
            enrolledSection = document.createElement('div');
            enrolledSection.id = 'enrolled-classes';
            enrolledSection.className = 'enrolled-classes-section';
            document.querySelector('.classes-container').appendChild(enrolledSection);
        }

        // Sort classes by period
        userClasses.sort((a, b) => {
            const periodA = parseInt(a.period) || 0;
            const periodB = parseInt(b.period) || 0;
            return periodA - periodB;
        });

        // Create the HTML for enrolled classes
        enrolledSection.innerHTML = `
            <h2>Your Enrolled Classes</h2>
            <div class="enrolled-classes-grid">
                ${userClasses.map(cls => `
                    <div class="enrolled-class-card">
                        <div class="class-period">Period ${cls.period}</div>
                        <div class="class-name">${cls.name}</div>
                        <div class="class-teacher">${cls.teacher}</div>
                        <button onclick="window.location.href='/Class/${cls.id}'" class="view-class-btn">
                            View Class
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error displaying enrolled classes:', error);
        showNotification('Error loading enrolled classes', 'error');
    }
}

// Update the initialization function to include enrolled classes
async function initializeClassPage() {
    try {
        await loadClassData();
        await displayEnrolledClasses();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing class page:', error);
        showNotification('Error initializing page', 'error');
    }
}

// Call the initialization function when the page loads
document.addEventListener('DOMContentLoaded', initializeClassPage);

// Initialize event listeners for main buttons
document.addEventListener('DOMContentLoaded', function() {
    const joinClassBtn = document.getElementById('joinClassBtn');
    const createClassBtn = document.getElementById('createClassBtn');
    const courseSelectionBtn = document.getElementById('courseSelectionBtn');
    const classModal = document.getElementById('classModal');
    const courseToolModal = document.getElementById('courseToolModal');
    const closeCourseToolModal = document.getElementById('closeCourseToolModal');

    // Join Class button
    joinClassBtn.addEventListener('click', () => {
        classModal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Join Class';
    });

    // Create Class button
    createClassBtn.addEventListener('click', () => {
        classModal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Create Class';
    });

    // Course Selection button
    courseSelectionBtn.addEventListener('click', () => {
        courseToolModal.style.display = 'flex';
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === classModal) {
            classModal.style.display = 'none';
        }
        if (e.target === courseToolModal) {
            courseToolModal.style.display = 'none';
        }
    });

    // Close course tool modal button
    closeCourseToolModal.addEventListener('click', () => {
        courseToolModal.style.display = 'none';
    });

    // Initialize the class list display
    initializeClassPage();
});

async function initializeClassPage() {
    try {
        // Fetch user data and classes
        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();
        const classes = await ClassDataManager.fetchAllClasses();
        
        // Initialize filters
        await initializeFilters();
        
        // Display enrolled classes
        const userClasses = await ClassDataManager.fetchUserClasses(userOsis);
        displayEnrolledClasses(userClasses);
        
        // Display all available classes
        displayFilteredClasses(classes);
        
    } catch (error) {
        console.error('Error initializing class page:', error);
        showNotification('Error loading classes', 'error');
    }
}

function displayFilteredClasses(classes) {
    const container = document.createElement('div');
    container.className = 'class-grid';
    
    classes.forEach(classData => {
        const classCard = createClassCard(classData);
        container.appendChild(classCard);
    });
    
    // Add the class grid after the enrolled classes section
    const enrolledClassesSection = document.getElementById('enrolled-classes');
    enrolledClassesSection.parentNode.insertBefore(container, enrolledClassesSection.nextSibling);
}

function createClassCard(classData) {
    const card = document.createElement('div');
    card.className = 'class-item';
    card.innerHTML = `
        <h3>${classData.name}</h3>
        <div class="class-info">
            <span><i class="fas fa-clock"></i> Period ${classData.period}</span>
            <span><i class="fas fa-user-tie"></i> ${classData.teacher}</span>
        </div>
        <div class="class-stats">
            <div class="stat-item">
                <span class="stat-value">${classData.students?.length || 0}</span>
                <span class="stat-label">Students</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${classData.averageGrade || '--'}</span>
                <span class="stat-label">Avg. Grade</span>
            </div>
        </div>
    `;
    
    return card;
}

// Initialize modals and buttons
function initializeModals() {
    const modals = {
        joinClass: document.getElementById('joinClassModal'),
        createClass: document.getElementById('createClassModal'),
        courseSelection: document.getElementById('courseSelectionModal')
    };
    
    const buttons = {
        joinClass: document.getElementById('joinClassBtn'),
        createClass: document.getElementById('createClassBtn'),
        courseSelection: document.getElementById('courseSelectionBtn')
    };
    
    // Add click event listeners to buttons
    Object.keys(buttons).forEach(key => {
        if (buttons[key] && modals[key]) {
            buttons[key].addEventListener('click', () => {
                modals[key].style.display = 'block';
            });
        }
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        Object.values(modals).forEach(modal => {
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close buttons for modals
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
}

// Display enrolled classes in a grid layout
async function displayEnrolledClasses() {
    try {
        const response = await fetch('/api/classes/enrolled');
        const enrolledClasses = await response.json();
        
        const enrolledClassesContainer = document.getElementById('enrolled-classes');
        if (!enrolledClassesContainer) return;
        
        enrolledClassesContainer.innerHTML = '';
        
        if (enrolledClasses.length === 0) {
            enrolledClassesContainer.innerHTML = '<p class="no-classes">No enrolled classes found.</p>';
            return;
        }
        
        const classesGrid = document.createElement('div');
        classesGrid.className = 'enrolled-classes-grid';
        
        enrolledClasses.sort((a, b) => a.period - b.period).forEach(classData => {
            const classCard = document.createElement('div');
            classCard.className = 'enrolled-class-card';
            classCard.innerHTML = `
                <h3>${classData.name}</h3>
                <p>Period ${classData.period}</p>
                <p>Teacher: ${classData.teacher}</p>
                <p>Students: ${classData.studentCount}</p>
                <p>Average Grade: ${classData.averageGrade || 'N/A'}</p>
                <button class="view-class-btn" data-class-id="${classData.id}">View Class</button>
            `;
            classesGrid.appendChild(classCard);
        });
        
        enrolledClassesContainer.appendChild(classesGrid);
        
        // Add click handlers for view class buttons
        document.querySelectorAll('.view-class-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href = `/class/${btn.dataset.classId}`;
            });
        });
    } catch (error) {
        console.error('Error loading enrolled classes:', error);
        showNotification('Error loading enrolled classes. Please try again.', 'error');
    }
}

// Initialize the page
async function initializeClassPage() {
    try {
        initializeModals();
        await displayEnrolledClasses();
        
        // Initialize filters and search
        const searchInput = document.getElementById('classSearch');
        const periodFilter = document.getElementById('periodFilter');
        const subjectFilter = document.getElementById('subjectFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', filterClasses);
        }
        if (periodFilter) {
            periodFilter.addEventListener('change', filterClasses);
        }
        if (subjectFilter) {
            subjectFilter.addEventListener('change', filterClasses);
        }
        
    } catch (error) {
        console.error('Error initializing class page:', error);
        showNotification('Error loading page. Please refresh and try again.', 'error');
    }
}

// Filter classes based on search and filter inputs
function filterClasses() {
    const searchTerm = document.getElementById('classSearch')?.value.toLowerCase() || '';
    const selectedPeriod = document.getElementById('periodFilter')?.value || 'all';
    const selectedSubject = document.getElementById('subjectFilter')?.value || 'all';
    
    const classCards = document.querySelectorAll('.enrolled-class-card');
    classCards.forEach(card => {
        const className = card.querySelector('h3').textContent.toLowerCase();
        const period = card.querySelector('p').textContent.match(/Period (\d+)/)[1];
        const subject = card.dataset.subject;
        
        const matchesSearch = className.includes(searchTerm);
        const matchesPeriod = selectedPeriod === 'all' || period === selectedPeriod;
        const matchesSubject = selectedSubject === 'all' || subject === selectedSubject;
        
        card.style.display = matchesSearch && matchesPeriod && matchesSubject ? 'block' : 'none';
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeClassPage);