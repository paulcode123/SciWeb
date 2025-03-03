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
        <h3>${classData.name}</h3>
        <p>Period ${classData.period} - ${classData.teacher}</p>
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
      `;
      // if the class is clicked, go to the class page
      classItem.addEventListener('click', () => {
        showReviewModal(classData.id, classData.name);
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