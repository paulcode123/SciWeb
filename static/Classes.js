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
        const subjects = new Set();
        classes.forEach(cls => {
            if (cls.subject) {
                subjects.add(cls.subject);
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

// Show notification function
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize particles.js and page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize particles.js
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: '#ffffff' },
                shape: { type: 'circle' },
                opacity: { value: 0.5, random: false, anim: { enable: false } },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#ffffff',
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: true, mode: 'push' },
                    resize: true
                },
                modes: {
                    grab: { distance: 140, line_linked: { opacity: 1 } },
                    push: { particles_nb: 4 }
                }
            },
            retina_detect: true
        });

        // Initialize the class page
        await initializeClassPage();
        
    } catch (error) {
        console.error('Error during initialization:', error);
        showNotification('Error initializing page', 'error');
    }
});

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
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Course Selection Tool</h2>
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
                    <select id="subjectFilter">
                        <option value="">All Subjects</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="English">English</option>
                        <option value="History">History</option>
                        <option value="Language">Language</option>
                    </select>
                </div>
            </div>
            <div class="course-recommendations"></div>
            <div class="modal-actions">
                <button class="action-button secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    initializeCourseSelectionTool(modal);
}

// Initialize Course Selection Tool
async function initializeCourseSelectionTool(modal) {
    const gradeFilter = modal.querySelector('#gradeFilter');
    const subjectFilter = modal.querySelector('#subjectFilter');
    const recommendationsContainer = modal.querySelector('.course-recommendations');

    // Load all available classes
    const classes = await ClassDataManager.fetchAllClasses();
    
    function filterAndDisplayCourses() {
        const grade = gradeFilter.value;
        const subject = subjectFilter.value;
        
        const filteredCourses = classes.filter(course => {
            const matchesGrade = !grade || course.grade === grade;
            const matchesSubject = !subject || course.subject === subject;
            return matchesGrade && matchesSubject;
        });

        displayCourseRecommendations(filteredCourses, recommendationsContainer);
    }

    gradeFilter.addEventListener('change', filterAndDisplayCourses);
    subjectFilter.addEventListener('change', filterAndDisplayCourses);

    // Initial display
    filterAndDisplayCourses();
}

function displayCourseRecommendations(courses, container) {
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="no-recommendations">
                <i class="fas fa-info-circle"></i>
                <p>No courses found matching your criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <h3>${course.name}</h3>
            <div class="course-info">
                <span><i class="fas fa-chalkboard"></i> Period ${course.period}</span>
                <span><i class="fas fa-user-tie"></i> ${course.teacher}</span>
            </div>
            <div class="course-stats">
                <div class="stat">
                    <span class="stat-label">Class Size</span>
                    <span class="stat-value">${calculateClassSize(course)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Average Grade</span>
                    <span class="stat-value">${calculateAverageGrade(course)}%</span>
                </div>
            </div>
            <button class="action-button" onclick="handleClassAction('join', '${course.id}')">
                Join Class
            </button>
        </div>
    `).join('');
}

function calculateClassSize(course) {
    return course.students ? course.students.length : 0;
}

function calculateAverageGrade(course) {
    if (!course.grades || course.grades.length === 0) return 'N/A';
    const sum = course.grades.reduce((a, b) => a + b, 0);
    return (sum / course.grades.length).toFixed(1);
}

// Setup event listeners
function setupEventListeners() {
    const courseSelectionBtn = document.getElementById('courseSelectionBtn');
    if (courseSelectionBtn) {
        courseSelectionBtn.addEventListener('click', showCourseSelectionTool);
    }
    
    // Initialize schedule grid
    initializeScheduleGrid();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeClassPage);

// Initialize schedule grid
async function initializeScheduleGrid() {
    try {
        // Fetch all available classes and user data
        const allClasses = await ClassDataManager.fetchAllClasses();
        const userData = await fetchRequest('/data', { data: 'Name' });
        const userOsis = userData.Name.osis.toString();

        // Get user's enrolled classes
        const userClasses = allClasses.filter(cls => 
            cls.OSIS && cls.OSIS.toString().includes(userOsis)
        );

        // Get all schedule cells
        const cells = document.querySelectorAll('.schedule-cell');
        
        if (!cells.length) {
            console.warn('No schedule cells found');
            return;
        }

        cells.forEach(cell => {
            const period = cell.dataset.period;
            const day = cell.dataset.day;
            
            // Create select2-like container
            const selectContainer = document.createElement('div');
            selectContainer.className = 'select-container';
            
            // Create search input
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'class-search';
            searchInput.placeholder = 'Search classes...';
            
            // Create select element
            const select = document.createElement('select');
            select.className = 'class-select';
            select.innerHTML = '<option value="">Select Class</option>';
            
            // Create dropdown container for options
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'dropdown-options';
            dropdownContainer.style.display = 'none';
            
            // Filter classes for this period
            const periodClasses = allClasses.filter(cls => 
                cls.period.toString() === period.toString()
            );
            
            // Function to update dropdown options based on search
            function updateOptions(searchText = '') {
                dropdownContainer.innerHTML = '';
                const filteredClasses = periodClasses.filter(cls =>
                    cls.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    cls.teacher.toLowerCase().includes(searchText.toLowerCase())
                );
                
                filteredClasses.forEach(cls => {
                    const option = document.createElement('div');
                    option.className = 'dropdown-option';
                    option.dataset.value = cls.id;
                    option.innerHTML = `
                        <div class="class-option-name">${cls.name}</div>
                        <div class="class-option-teacher">${cls.teacher}</div>
                    `;
                    
                    // Check if user is enrolled in this class
                    const isEnrolled = userClasses.some(userClass => userClass.id === cls.id);
                    if (isEnrolled) {
                        option.classList.add('enrolled');
                    }
                    
                    option.addEventListener('click', async () => {
                        try {
                            if (!cls.OSIS) {
                                cls.OSIS = userOsis;
                            } else if (!cls.OSIS.toString().includes(userOsis)) {
                                cls.OSIS = cls.OSIS + ',' + userOsis;
                            }

                            await fetchRequest('/update_data', {
                                sheet: 'Classes',
                                data: cls,
                                row_name: 'id',
                                row_value: cls.id
                            });

                            cell.classList.add('has-class');
                            searchInput.value = cls.name;
                            dropdownContainer.style.display = 'none';
                            showNotification('Successfully enrolled in class', 'success');
                            
                            // Update visual state
                            cell.classList.add('has-class');
                            option.classList.add('enrolled');
                            
                        } catch (error) {
                            console.error('Error enrolling in class:', error);
                            showNotification('Error enrolling in class', 'error');
                        }
                    });
                    
                    dropdownContainer.appendChild(option);
                });
            }
            
            // Add event listeners for search input
            searchInput.addEventListener('focus', () => {
                updateOptions(searchInput.value);
                dropdownContainer.style.display = 'block';
            });
            
            searchInput.addEventListener('input', () => {
                updateOptions(searchInput.value);
                dropdownContainer.style.display = 'block';
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!selectContainer.contains(e.target)) {
                    dropdownContainer.style.display = 'none';
                }
            });
            
            // Set initial value if user is enrolled in a class for this period
            const enrolledClass = userClasses.find(cls => 
                cls.period.toString() === period.toString()
            );
            if (enrolledClass) {
                searchInput.value = enrolledClass.name;
                cell.classList.add('has-class');
            }
            
            // Assemble the select container
            selectContainer.appendChild(searchInput);
            selectContainer.appendChild(dropdownContainer);
            
            // Clear existing content and add new elements
            cell.innerHTML = '';
            cell.appendChild(selectContainer);
        });
        
        // Add CSS styles for the new elements
        const style = document.createElement('style');
        style.textContent = `
            .select-container {
                position: relative;
                width: 100%;
            }
            
            .class-search {
                width: 100%;
                padding: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.3);
                color: white;
                font-size: 14px;
            }
            
            .dropdown-options {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                max-height: 200px;
                overflow-y: auto;
                background: rgba(30, 30, 30, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                z-index: 1000;
            }
            
            .dropdown-option {
                padding: 8px;
                cursor: pointer;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .dropdown-option:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .dropdown-option.enrolled {
                background: rgba(74, 144, 226, 0.2);
            }
            
            .class-option-name {
                font-weight: bold;
                margin-bottom: 4px;
            }
            
            .class-option-teacher {
                font-size: 12px;
                opacity: 0.8;
            }
            
            .has-class .class-search {
                border-color: rgba(74, 144, 226, 0.5);
                background: rgba(74, 144, 226, 0.1);
            }
        `;
        document.head.appendChild(style);
        
        showNotification('Schedule grid initialized successfully', 'success');
        
    } catch (error) {
        console.error('Error initializing schedule grid:', error);
        showNotification('Error loading schedule', 'error');
    }
}

function getSubjectIcon(subject) {
    const icons = {
        'math': 'calculator',
        'science': 'flask',
        'english': 'book',
        'history': 'landmark',
        'language': 'language',
        'computer science': 'laptop-code',
        'art': 'palette',
        'music': 'music',
        'physical education': 'running'
    };
    return icons[subject.toLowerCase()] || 'book';
}

function showClassDetails(classInfo) {
    // Create and show a modal with class details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${classInfo.name}</h2>
            <div class="class-details">
                <p><i class="fas fa-user-tie"></i> Teacher: ${classInfo.teacher || 'TBD'}</p>
                <p><i class="fas fa-clock"></i> Period: ${classInfo.period}</p>
                <p><i class="fas fa-users"></i> Students: ${classInfo.students ? classInfo.students.length : 0}</p>
                ${classInfo.averageGrade ? `<p><i class="fas fa-chart-line"></i> Average Grade: ${classInfo.averageGrade}%</p>` : ''}
            </div>
            <div class="form-actions">
                <button class="secondary-btn" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('active');
}

async function showAvailableClasses(period) {
    try {
        const response = await fetchRequest('/data', { data: 'Classes' });
        const classes = response.Classes || [];
        
        // Filter classes for the selected period
        const availableClasses = classes.filter(cls => 
            cls.period.toString() === period.toString() &&
            (!cls.OSIS || !cls.OSIS.toString().includes(osis))
        );

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Available Classes - Period ${period}</h2>
                <div class="available-classes">
                    ${availableClasses.map(cls => `
                        <div class="available-class">
                            <div class="class-info">
                                <h3>${cls.name}</h3>
                                <p><i class="fas fa-user-tie"></i> ${cls.teacher || 'TBD'}</p>
                                <p><i class="fas fa-users"></i> ${cls.students ? cls.students.length : 0} students</p>
                            </div>
                            <button class="primary-btn" onclick="handleClassAction('join', '${cls.id}')">
                                Join Class
                            </button>
                        </div>
                    `).join('') || '<p>No classes available for this period</p>'}
                </div>
                <div class="form-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('active');

    } catch (error) {
        console.error('Error loading available classes:', error);
        showNotification('Error loading available classes', 'error');
    }
}

async function initializeClassPage() {
    try {
        // Initialize filters
        await initializeFilters();
        
        // Initialize schedule grid
        await initializeScheduleGrid();
        
        // Setup event listeners for buttons
        const joinClassBtn = document.getElementById('joinClassBtn');
        const createClassBtn = document.getElementById('createClassBtn');
        const courseSelectionBtn = document.getElementById('courseSelectionBtn');
        const joinClassModal = document.getElementById('joinClassModal');
        const createClassModal = document.getElementById('createClassModal');
        const courseToolModal = document.getElementById('courseToolModal');

        if (joinClassBtn && joinClassModal) {
            joinClassBtn.addEventListener('click', () => {
                joinClassModal.style.display = 'block';
            });
        }

        if (createClassBtn && createClassModal) {
            createClassBtn.addEventListener('click', () => {
                createClassModal.style.display = 'block';
            });
        }

        if (courseSelectionBtn && courseToolModal) {
            courseSelectionBtn.addEventListener('click', () => {
                courseToolModal.style.display = 'block';
            });
        }

        // Close modal buttons
        const cancelJoinModal = document.getElementById('cancelJoinModal');
        const cancelCreateModal = document.getElementById('cancelCreateModal');
        const closeCourseToolModal = document.getElementById('closeCourseToolModal');

        if (cancelJoinModal) {
            cancelJoinModal.addEventListener('click', () => {
                joinClassModal.style.display = 'none';
            });
        }

        if (cancelCreateModal) {
            cancelCreateModal.addEventListener('click', () => {
                createClassModal.style.display = 'none';
            });
        }

        if (closeCourseToolModal) {
            closeCourseToolModal.addEventListener('click', () => {
                courseToolModal.style.display = 'none';
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (joinClassModal && e.target === joinClassModal) {
                joinClassModal.style.display = 'none';
            }
            if (createClassModal && e.target === createClassModal) {
                createClassModal.style.display = 'none';
            }
            if (courseToolModal && e.target === courseToolModal) {
                courseToolModal.style.display = 'none';
            }
        });
        
        // Show success notification
        showNotification('Class page initialized successfully', 'success');
    } catch (error) {
        console.error('Error initializing class page:', error);
        showNotification('Error initializing page', 'error');
    }
}

// Remove the event listener from setupEventListeners since we're calling it directly
function setupEventListeners() {
    const courseSelectionBtn = document.getElementById('courseSelectionBtn');
    if (courseSelectionBtn) {
        courseSelectionBtn.addEventListener('click', showCourseSelectionTool);
    }
}

// ... rest of existing code ...