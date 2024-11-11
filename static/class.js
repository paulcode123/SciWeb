// Global variables
let classData = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  get_assignment();
  setupEventListeners();
});

// Main setup functions
function setupEventListeners() {
  // Form controls
  const createBtn = document.getElementById('createBtn');
  const formContainer = document.getElementById('formContainer');
  const assignmentForm = document.getElementById('assignmentForm');
  const cancelBtn = document.getElementById('cancelBtn');

  createBtn.addEventListener('click', () => {
    formContainer.style.display = 'flex';
    populateCategoryDropdown();
  });

  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
    assignmentForm.reset();
  });

  // Modal close on outside click
  formContainer.addEventListener('click', (e) => {
    if (e.target === formContainer) {
      formContainer.style.display = 'none';
      assignmentForm.reset();
    }
  });

  // Assignment form submission
  assignmentForm.addEventListener('submit', handleAssignmentSubmit);

  // Leave class button
  const leaveBtn = document.getElementById('leaveClass');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => leaveClass(classData));
  }
}

// Assignment form handling
function handleAssignmentSubmit(e) {
  e.preventDefault();
  
  const assignmentObj = {
    name: document.getElementById('name').value,
    category: document.getElementById('assignmentType').value,
    points: document.getElementById('points').value,
    due: document.getElementById('due').value,
    id: Math.floor(Math.random() * 10000),
    class: classData.id,
    class_name: classData.name
  };

  post_assignment(assignmentObj);
  formContainer.style.display = 'none';
  assignmentForm.reset();
}

// Category dropdown population
function populateCategoryDropdown() {
  const categorySelect = document.getElementById('assignmentType');
  categorySelect.innerHTML = '';
  
  let categories = classData.categories;
  if (typeof categories === 'string') {
    categories = JSON.parse(categories);
  }
  
  // Filter out weights and keep only category names
  const categoryNames = categories.filter((_, index) => index % 2 === 0);
  
  categoryNames.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Data fetching and page setup
async function get_assignment() {
  startLoading();
  const data = await fetchRequest('/data', {data: "Classes, Assignments, Name, Users"});
  const classId = window.location.href.slice(-4);
  
  classData = data.Classes.find(item => item.id == classId);
  if (!classData) {
    console.error('Class not found');
    endLoading();
    return;
  }

  setupPage(classData, data);
  endLoading();
}

// Page content setup
function setupPage(classData, data) {
  console.log("in setup page")
  // Set background color
  document.getElementById('class-section').style.backgroundColor = 
    classData.color || 'var(--background-dark)';
  
  // Set up design elements
  set_class_img(classData.img);
  setImageEl(classData, "Classes");
  set_color_EL("Classes", classData);
  
  // Display class content

  display_assignments(data.Assignments, classData);
  displayCategories(classData.categories);
  add_user_bubbles(classData, data.Users);
  
  // Set up join functionality
  show_Join(data.Name, classData, "Classes");
  
  // Set up editable fields if user is class owner
  if (isClassOwner(classData)) {
    setupEditableFields(classData);
  }
}

// Data posting functions
async function post_assignment(data) {

  await fetchRequest('/post_data', {data: data, sheet: "Assignments"})

  // add assignment to div
  const assignmentList = document.getElementById('assignmentList');
  const card = createAssignmentCard(data);
  assignmentList.appendChild(card);
}

// Display assignments
function display_assignments(assignments, classData) {
  console.log(assignments)
  const assignmentList = document.getElementById('assignmentList');
  assignmentList.innerHTML = '';

  // Filter and sort assignments for the current class
  const relevantAssignments = assignments
    .filter(assignment => assignment.class == classData.id)
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  console.log(relevantAssignments)
  // Create assignment cards
  relevantAssignments.forEach(assignment => {
    const card = createAssignmentCard(assignment);
    assignmentList.appendChild(card);
  });

  if (relevantAssignments.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No assignments yet';
    emptyMessage.className = 'empty-message';
    assignmentList.appendChild(emptyMessage);
  }
}

// Create assignment card
function createAssignmentCard(assignment) {
  const card = document.createElement('div');
  card.className = 'assignment-card';
  
  // Format due date
  const dueDate = new Date(assignment.due);
  const formattedDate = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Create card content
  card.innerHTML = `
    <div class="assignment-header">
      <h4>${assignment.name}</h4>
      <span class="category-tag">${assignment.category}</span>
    </div>
    <div class="assignment-details">
      <span class="points">${assignment.points} points</span>
      <span class="due-date">Due: ${formattedDate}</span>
    </div>
  `;

  // Add click handler to navigate to assignment details
  card.addEventListener('click', () => {
    window.location.href = `/assignment/${assignment.id}`;
  });

  return card;
}

// Display categories
function displayCategories(categories) {
  const categoriesContainer = document.getElementById('categoriesContainer');
  categoriesContainer.innerHTML = '';

  if (typeof categories === 'string') {
    categories = JSON.parse(categories);
  }

  // Create category list
  const categoryList = document.createElement('ul');
  categoryList.className = 'category-list';

  // Add categories and weights
  for (let i = 0; i < categories.length; i += 2) {
    const category = categories[i];
    const weight = categories[i + 1];

    const listItem = document.createElement('li');
    listItem.className = 'category-item';
    listItem.innerHTML = `
      <span class="category-name">${category}</span>
      <span class="category-weight">${weight}%</span>
    `;

    categoryList.appendChild(listItem);
  }

  categoriesContainer.appendChild(categoryList);
}

// Check if user is class owner
function isClassOwner(classData) {
  // You'll need to implement this based on your user authentication system
  // For example, comparing the current user's ID with the class owner's ID
  return false; // Adjust this based on your data structure
}

// Setup editable fields
function setupEditableFields(classData) {
  const editableFields = {
    'teacher': document.getElementById('teacher'),
    'period': document.getElementById('period')
  };

  // Set initial values
  Object.entries(editableFields).forEach(([key, element]) => {
    if (element) {
      element.textContent = classData[key] || '';
      
      // Add blur event listener to save changes
      element.addEventListener('blur', async () => {
        const newValue = element.textContent.trim();
        if (newValue !== classData[key]) {
          const updatedData = { ...classData, [key]: newValue };
          await updateClassData(updatedData);
        }
      });
    }
  });
}

// Update class data
async function updateClassData(updatedData) {
  try {
    await fetchRequest('/update_data', {
      row_value: updatedData.id,
      row_name: "id",
      data: updatedData,
      sheet: "Classes"
    });
    classData = updatedData;
  } catch (error) {
    console.error('Error updating class data:', error);
  }
}

// Leave class function
async function leaveClass(classData) {
  if (!confirm('Are you sure you want to leave this class?')) {
    return;
  }

  try {
    // Get current user's OSIS
    const userData = await fetchRequest('/data', {data: "Name"});
    const userOsis = userData.Name.osis;

    // Remove user from class OSIS list
    const updatedOsis = classData.OSIS
      .split(/[\s,]+/)
      .filter(osis => osis !== userOsis)
      .join(', ');

    const updatedData = { ...classData, OSIS: updatedOsis };

    await updateClassData(updatedData);
    window.location.href = '/dashboard'; // Redirect to dashboard after leaving
  } catch (error) {
    console.error('Error leaving class:', error);
  }
}

// ... rest of your existing helper functions ...
