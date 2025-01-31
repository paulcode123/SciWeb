// Global variables
let classData = null;
let currentUser = null;
let activeStudyGroups = [];
let activityFeed = [];
let chatMessages = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  startLoading();
  await initializeClassPage();
  endLoading();
});

// Main initialization function
async function initializeClassPage() {
  // Fetch all required data in a single call
  const data = await fetchRequest('/data', {
    data: "Classes, Assignments, Name, Users, StudyGroups, Resources, ActivityFeed, Chat"
  });
  
  // Get class ID from URL
  const classId = window.location.href.slice(-4);
  
  // Set current user
  currentUser = data.Name.osis;
  
  // Find current class data
  classData = data.Classes.find(item => item.id == classId);
  if (!classData) {
    console.error('Class not found');
    return;
  }

  // Initialize all components with the fetched data
  setupPage(classData, data);
  setupEventListeners();
  
  // Initialize activity feed
  activityFeed = data.ActivityFeed?.filter(a => a.class_id === classData.id) || [];
  renderActivityFeed(activityFeed);
  
  // Initialize study groups
  activeStudyGroups = data.StudyGroups?.filter(g => g.class_id === classData.id) || [];
  renderStudyGroups(activeStudyGroups);
  
  // Initialize resources
  const resources = data.Resources?.filter(r => r.class_id === classData.id) || [];
  renderResources(resources);
  
  // Initialize chat
  chatMessages = data.Chat?.filter(m => m.location === classData.id) || [];
  setupChatFeatures();
  updateChatMessages();
}

// Get current user data
async function getCurrentUser() {
  const userData = await fetchRequest('/data', {data: "Name"});
  currentUser = userData.Name.osis;
}

// Activity Feed Functions
async function filterActivityFeed(type) {
  const activities = type === 'all' 
    ? activityFeed 
    : activityFeed.filter(activity => activity.type === type);
  
  renderActivityFeed(activities);
}

async function fetchMessages(tab) {
  try {
    const response = await fetchRequest('/data', {data: 'Chat'});
    return response.Chat || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Resources Functions
async function initializeResources() {
  try {
    const response = await fetchRequest('/data', { 
      data: 'Resources',
      filters: {
        class_id: classData.id
      }
    });
    const resources = response.Resources || [];
    renderResources(resources);
  } catch (error) {
    console.error('Error initializing resources:', error);
  }
}

function renderResources(resources) {
  const resourcesList = document.getElementById('resourcesList');
  if (!resourcesList) return;
  
  resourcesList.innerHTML = '';

  if (!resources || resources.length === 0) {
    resourcesList.innerHTML = '<p class="empty-state">No resources shared yet</p>';
    return;
  }

  resources.forEach(resource => {
    const resourceEl = createResourceElement(resource);
    resourcesList.appendChild(resourceEl);
  });
}

function createResourceElement(resource) {
  const div = document.createElement('div');
  div.className = 'resource-item';
  div.dataset.resourceId = resource.id;
  div.dataset.type = resource.type;
  
  const typeIcons = {
    notes: '📝',
    practice: '✏️',
    guide: '📚',
    link: '🔗'
  };

  div.innerHTML = `
    <div class="resource-header">
      <h4 class="resource-title">${typeIcons[resource.type]} ${resource.title}</h4>
      <div class="resource-meta">
        <span class="resource-likes" data-resource-id="${resource.id}">👍 ${resource.likes?.length || 0}</span>
        <span class="resource-comments" data-resource-id="${resource.id}">💬 ${resource.comments?.length || 0}</span>
      </div>
    </div>
    <div class="resource-content">
      ${resource.type === 'link' 
        ? `<a href="${resource.content}" target="_blank" class="resource-link">${resource.content}</a>`
        : `<p>${typeof resource.content === 'object' ? resource.content.preview : resource.content}</p>`
      }
    </div>
    <div class="resource-footer">
      <span class="resource-author">Shared by ${resource.shared_by}</span>
      <span class="resource-time">${formatTimeAgo(resource.created_at)}</span>
    </div>
  `;

  // Add click handlers for likes and comments
  const likesBtn = div.querySelector('.resource-likes');
  likesBtn.addEventListener('click', () => handleResourceLike(resource.id));

  const commentsBtn = div.querySelector('.resource-comments');
  commentsBtn.addEventListener('click', () => showResourceComments(resource));

  return div;
}

async function handleResourceLike(resourceId) {
  try {
    const resource = await fetchRequest('/data', { 
      data: 'Resources',
      filters: { id: resourceId }
    });
    
    if (!resource.likes.includes(currentUser)) {
      resource.likes.push(currentUser);
      await fetchRequest('/update_data', {
        sheet: 'Resources',
        row_value: resourceId,
        row_name: 'id',
        data: resource
      });
      
      // Update UI
      const likesEl = document.querySelector(`[data-resource-id="${resourceId}"] .resource-likes`);
      if (likesEl) {
        likesEl.textContent = `👍 ${resource.likes.length}`;
      }
    }
  } catch (error) {
    console.error('Error handling resource like:', error);
  }
}

function showResourceComments(resource) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Comments on "${resource.title}"</h3>
      <div class="comments-container">
        ${resource.comments.length > 0 
          ? resource.comments.map(comment => `
              <div class="comment">
                <div class="comment-header">
                  <span class="comment-author">${comment.user}</span>
                  <span class="comment-time">${formatTimeAgo(comment.timestamp)}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
              </div>
            `).join('')
          : '<p class="empty-state">No comments yet</p>'
        }
      </div>
      <form id="commentForm" class="comment-form">
        <textarea id="commentText" placeholder="Add a comment..." required></textarea>
        <div class="form-actions">
          <button type="submit" class="action-button">Comment</button>
          <button type="button" class="action-button secondary" id="closeComments">Close</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = modal.querySelector('#commentForm');
  const closeBtn = modal.querySelector('#closeComments');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comment = {
      user: currentUser,
      text: document.getElementById('commentText').value,
      timestamp: new Date().toISOString()
    };
    
    await addResourceComment(resource.id, comment);
    document.body.removeChild(modal);
  });
  
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function addResourceComment(resourceId, comment) {
  try {
    const resource = await fetchRequest('/data', { 
      data: 'Resources',
      filters: { id: resourceId }
    });
    
    resource.comments.push(comment);
    await fetchRequest('/update_data', {
      sheet: 'Resources',
      row_value: resourceId,
      row_name: 'id',
      data: resource
    });
    
    // Update UI
    const commentsEl = document.querySelector(`[data-resource-id="${resourceId}"] .resource-comments`);
    if (commentsEl) {
      commentsEl.textContent = `💬 ${resource.comments.length}`;
    }
  } catch (error) {
    console.error('Error adding resource comment:', error);
  }
}

// Chat Functions
function setupChatFeatures() {
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const clearButton = document.getElementById('clear');
  const fileUpload = document.getElementById('upload');
  const emojiTrigger = document.querySelector('.emoji-trigger');
  const pollBtn = document.getElementById('pollBtn');

  sendButton.addEventListener('click', sendMessage);
  clearButton.addEventListener('click', clearChat);
  fileUpload.addEventListener('change', handleFileUpload);
  emojiTrigger.addEventListener('click', showEmojiPicker);
  pollBtn.addEventListener('click', showPollCreator);

  // Enter key to send message
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  const message = {
    text: text,
    sender: currentUser,
    location: classData.id,
    timestamp: new Date().toISOString(),
    type: 'message'
  };
  
  try {
    await fetchRequest('/post_data', {
      data: message,
      sheet: 'Chat'
    });
    
    input.value = '';
    await updateChatMessages();
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function clearChat() {
  const messageList = document.getElementById('message-list');
  messageList.innerHTML = '';
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_id', classData.id);
    
    const response = await fetch('/upload_file', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      await sendMessage(`Shared file: ${data.filename}`);
    }
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

function showEmojiPicker(e) {
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  const emojis = ['😊', '👍', '❤️', '🎉', '🤔', '👋', '✨', '🔥', '📚', '✅'];
  
  picker.innerHTML = emojis.map(emoji => 
    `<span class="emoji-option">${emoji}</span>`
  ).join('');
  
  const rect = e.target.getBoundingClientRect();
  picker.style.position = 'absolute';
  picker.style.top = `${rect.top - picker.offsetHeight}px`;
  picker.style.left = `${rect.left}px`;
  
  document.body.appendChild(picker);
  
  picker.addEventListener('click', (e) => {
    if (e.target.classList.contains('emoji-option')) {
      const messageInput = document.getElementById('message-input');
      messageInput.value += e.target.textContent;
      picker.remove();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && e.target !== picker) {
      picker.remove();
    }
  }, { once: true });
}

// Helper Functions
function startLoading() {
  // Add loading indicator
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.id = 'pageLoader';
  document.body.appendChild(loader);
}

function endLoading() {
  // Remove loading indicator
  const loader = document.getElementById('pageLoader');
  if (loader) {
    loader.remove();
  }
}

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

  // Activity feed filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      filterActivityFeed(e.target.dataset.filter);
    });
  });

  // Study group creation
  document.getElementById('createGroupBtn').addEventListener('click', createStudyGroup);

  // Resource sharing
  document.getElementById('shareResourceBtn').addEventListener('click', showResourceModal);
  document.querySelectorAll('.resource-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      document.querySelectorAll('.resource-tag').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      filterResources(e.target.textContent.toLowerCase());
    });
  });

  // Chat tabs
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      switchChatTab(e.target.dataset.tab);
    });
  });
}

// Assignment form handling
async function handleAssignmentSubmit(e) {
  e.preventDefault();
  startLoading();
  
  try {
    const dueDate = new Date(document.getElementById('due').value);
    const formattedDate = dueDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    
    const assignmentObj = {
      name: document.getElementById('name').value,
      category: document.getElementById('assignmentType').value,
      points: document.getElementById('points').value,
      due_date: formattedDate,
      id: Math.floor(Math.random() * 10000),
      class: parseInt(classData.id),
      class_name: classData.name
    };

    await postAssignment(assignmentObj);
    
    // Post activity to feed
    await postActivity({
      type: 'assignment',
      content: `Added new assignment: ${assignmentObj.name}`,
      related_id: assignmentObj.id
    });
    
    // Refresh assignments display
    const data = await fetchRequest('/data', { data: 'Assignments' });
    display_assignments(data.Assignments, classData);
    
    // Close form and reset
    formContainer.style.display = 'none';
    assignmentForm.reset();
    
  } catch (error) {
    console.error('Error submitting assignment:', error);
    alert('Failed to add assignment. Please try again.');
  } finally {
    endLoading();
  }
}

async function postAssignment(assignmentData) {
  try {
    await fetchRequest('/post_data', {
      sheet: 'Assignments',
      data: assignmentData
    });
  } catch (error) {
    console.error('Error posting assignment:', error);
    throw error;
  }
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
  const data = await fetchRequest('/data', {data: "Classes, Assignments, Name, Users"});
  const classId = window.location.href.slice(-4);
  
  classData = data.Classes.find(item => item.id == classId);
  if (!classData) {
    console.error('Class not found');
    return;
  }

  setupPage(classData, data);
}

// Page content setup
function setupPage(classData, data) {
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

// Display assignments
function display_assignments(assignments, classData) {
  const assignmentList = document.getElementById('assignmentList');
  assignmentList.innerHTML = '';

  // Filter and sort assignments for the current class
  const relevantAssignments = assignments
    .filter(assignment => assignment.class == classData.id)
    .sort((a, b) => new Date(a.due) - new Date(b.due));

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
  
  card.innerHTML = `
    <div class="assignment-header">
      <h4>${assignment.name}</h4>
      <span class="category-tag">${assignment.category}</span>
    </div>
    <div class="assignment-details">
      <span class="points">${assignment.points} points</span>
      <span class="due-date">Due: ${assignment.due_date}</span>
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `/assignment/${assignment.id}`;
  });

  return card;
}

// Display categories
function displayCategories(categories) {
  const categoriesContainer = document.getElementById('categoriesContainer');
  if (!categoriesContainer) return;
  
  categoriesContainer.innerHTML = '';

  if (typeof categories === 'string') {
    categories = JSON.parse(categories);
  }

  const categoryList = document.createElement('ul');
  categoryList.className = 'category-list';

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
  return currentUser === classData.owner;
}

// Update chat messages
async function updateChatMessages() {
  const activeTab = document.querySelector('.chat-tab.active');
  if (activeTab) {
    await switchChatTab(activeTab.dataset.tab);
  }
}

// Show poll creator
function showPollCreator() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <form id="pollForm" class="poll-form">
        <h3>Create Poll</h3>
        <div class="form-group">
          <label for="pollQuestion">Question</label>
          <input type="text" id="pollQuestion" required>
        </div>
        <div id="pollOptions">
          <div class="form-group">
            <label>Options</label>
            <input type="text" class="poll-option" required>
            <input type="text" class="poll-option" required>
          </div>
        </div>
        <button type="button" class="action-button secondary" id="addOptionBtn">+ Add Option</button>
        <div class="form-actions">
          <button type="submit" class="action-button">Create Poll</button>
          <button type="button" class="action-button secondary" id="cancelPollBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = modal.querySelector('#pollForm');
  const cancelBtn = modal.querySelector('#cancelPollBtn');
  const addOptionBtn = modal.querySelector('#addOptionBtn');
  
  addOptionBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'poll-option';
    input.required = true;
    document.getElementById('pollOptions').appendChild(input);
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const options = Array.from(form.querySelectorAll('.poll-option'))
      .map(input => input.value)
      .filter(value => value.trim() !== '');
      
    const pollData = {
      question: document.getElementById('pollQuestion').value,
      options: options,
      votes: Object.fromEntries(options.map(opt => [opt, 0])),
      created_by: currentUser,
      class_id: classData.id,
      created_at: new Date().toISOString()
    };
    
    await createPoll(pollData);
    document.body.removeChild(modal);
  });
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function createPoll(pollData) {
  const message = {
    type: 'poll',
    content: pollData,
    class_id: classData.id,
    sender: currentUser,
    timestamp: new Date().toISOString()
  };
  
  await fetchRequest('/post_data', {
    data: message,
    sheet: 'Chat'
  });
  
  await updateChatMessages();
}

// Study Group Functions
async function createStudyGroup() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <form id="studyGroupForm" class="study-group-form">
        <h3>Create Study Group</h3>
        <div class="form-group">
          <label for="groupName">Group Name</label>
          <input type="text" id="groupName" required>
        </div>
        <div class="form-group">
          <label for="groupDescription">Description</label>
          <textarea id="groupDescription" required></textarea>
        </div>
        <div class="form-group">
          <label for="nextSession">Next Session</label>
          <input type="datetime-local" id="nextSession" required>
        </div>
        <div class="form-group">
          <label for="groupSchedule">Recurring Schedule (Optional)</label>
          <select id="groupSchedule">
            <option value="">No recurring schedule</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="action-button">Create</button>
          <button type="button" class="action-button secondary" id="cancelGroupBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = modal.querySelector('#studyGroupForm');
  const cancelBtn = modal.querySelector('#cancelGroupBtn');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupData = {
      name: document.getElementById('groupName').value,
      description: document.getElementById('groupDescription').value,
      nextSession: document.getElementById('nextSession').value,
      schedule: document.getElementById('groupSchedule').value,
      class_id: classData.id,
      members: [currentUser],
      id: Math.floor(Math.random() * 10000),
      created_at: new Date().toISOString(),
      resources: [],
      chat_history: []
    };
    
    await postStudyGroup(groupData);
    document.body.removeChild(modal);
    await initializeStudyGroups();
    
    // Add to activity feed
    await postActivity({
      type: 'study_group',
      content: `Created study group: ${groupData.name}`,
      related_id: groupData.id
    });
  });
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function initializeStudyGroups() {
  try {
    const response = await fetchRequest('/data', {
      data: 'StudyGroups',
      filters: { class_id: classData.id }
    });
    activeStudyGroups = response.StudyGroups || [];
    renderStudyGroups(activeStudyGroups);
  } catch (error) {
    console.error('Error initializing study groups:', error);
  }
}

function renderStudyGroups(groups) {
  const groupsList = document.getElementById('studyGroupsList');
  if (!groupsList) return;
  
  groupsList.innerHTML = '';
  
  if (groups.length === 0) {
    groupsList.innerHTML = '<p class="empty-state">No study groups yet</p>';
    return;
  }
  
  groups.forEach(group => {
    const groupEl = createStudyGroupElement(group);
    groupsList.appendChild(groupEl);
  });
}

function createStudyGroupElement(group) {
  const div = document.createElement('div');
  div.className = 'study-group-item';
  div.dataset.groupId = group.id;
  
  const nextSession = new Date(group.nextSession);
  const isUpcoming = nextSession > new Date();
  
  div.innerHTML = `
    <div class="group-header">
      <h4>${group.name}</h4>
      <span class="member-count">${group.members.length} members</span>
    </div>
    <p class="group-description">${group.description}</p>
    <div class="group-schedule">
      <span class="schedule-icon">📅</span>
      <span>${isUpcoming ? 'Next session:' : 'Last session:'} ${formatDate(group.nextSession)}</span>
      ${group.schedule ? `<span class="recurring-badge">Recurring: ${group.schedule}</span>` : ''}
    </div>
    <div class="group-actions">
      ${group.members.includes(currentUser)
        ? `<button class="action-button leave-group-btn">Leave Group</button>
           <button class="action-button join-session-btn" ${!isUpcoming ? 'disabled' : ''}>
             ${isUpcoming ? 'Join Next Session' : 'No Upcoming Session'}
           </button>`
        : `<button class="action-button join-group-btn">Join Group</button>`
      }
    </div>
  `;
  
  // Add event listeners
  const joinBtn = div.querySelector('.join-group-btn');
  const leaveBtn = div.querySelector('.leave-group-btn');
  const sessionBtn = div.querySelector('.join-session-btn');
  
  if (joinBtn) {
    joinBtn.addEventListener('click', () => handleJoinGroup(group.id));
  }
  
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => handleLeaveGroup(group.id));
  }
  
  if (sessionBtn) {
    sessionBtn.addEventListener('click', () => handleJoinSession(group.id));
  }
  
  return div;
}

async function handleJoinGroup(groupId) {
  try {
    const group = activeStudyGroups.find(g => g.id === groupId);
    if (!group) return;
    
    group.members.push(currentUser);
    await fetchRequest('/update_data', {
      sheet: 'StudyGroups',
      row_value: groupId,
      row_name: 'id',
      data: group
    });
    
    await postActivity({
      type: 'study_group',
      content: `Joined study group: ${group.name}`,
      related_id: groupId
    });
    
    await initializeStudyGroups();
  } catch (error) {
    console.error('Error joining group:', error);
  }
}

async function handleLeaveGroup(groupId) {
  try {
    const group = activeStudyGroups.find(g => g.id === groupId);
    if (!group) return;
    
    group.members = group.members.filter(member => member !== currentUser);
    await fetchRequest('/update_data', {
      sheet: 'StudyGroups',
      row_value: groupId,
      row_name: 'id',
      data: group
    });
    
    await postActivity({
      type: 'study_group',
      content: `Left study group: ${group.name}`,
      related_id: groupId
    });
    
    await initializeStudyGroups();
  } catch (error) {
    console.error('Error leaving group:', error);
  }
}

async function handleJoinSession(groupId) {
  const group = activeStudyGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // Redirect to video conference for the study group
  window.location.href = `/study-session/${groupId}`;
}

// Activity Feed Functions
async function initializeActivityFeed() {
  try {
    const response = await fetchRequest('/data', {
      data: 'ActivityFeed',
      filters: { class_id: classData.id }
    });
    activityFeed = response.ActivityFeed || [];
    renderActivityFeed(activityFeed);
  } catch (error) {
    console.error('Error initializing activity feed:', error);
  }
}

function renderActivityFeed(activities) {
  const activityList = document.getElementById('activityList');
  if (!activityList) return;
  
  activityList.innerHTML = '';
  
  if (activities.length === 0) {
    activityList.innerHTML = '<p class="empty-state">No activity yet</p>';
    return;
  }

  // Sort activities by timestamp, newest first
  activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .forEach(activity => {
      const activityEl = createActivityElement(activity);
      activityList.appendChild(activityEl);
    });
}

function createActivityElement(activity) {
  const div = document.createElement('div');
  div.className = 'activity-item';
  div.dataset.type = activity.type;
  
  const typeIcons = {
    assignment: '📝',
    discussion: '💬',
    collaboration: '👥',
    resource: '📚',
    study_group: '👨‍👩‍👧‍👦'
  };
  
  div.innerHTML = `
    <div class="activity-header">
      <span class="activity-icon">${typeIcons[activity.type] || '📌'}</span>
      <span class="activity-user">${activity.user}</span>
      <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
    </div>
    <div class="activity-content">${activity.content}</div>
    <div class="activity-actions">
      <button class="action-btn like-btn" data-id="${activity.id}">
        👍 ${activity.likes?.length || 0}
      </button>
      <button class="action-btn comment-btn" data-id="${activity.id}">
        💬 ${activity.comments?.length || 0}
      </button>
    </div>
  `;
  
  // Add event listeners for likes and comments
  const likeBtn = div.querySelector('.like-btn');
  const commentBtn = div.querySelector('.comment-btn');
  
  likeBtn.addEventListener('click', () => handleActivityLike(activity.id));
  commentBtn.addEventListener('click', () => showActivityComments(activity));
  
  return div;
}

async function postActivity(activityData) {
  try {
    const activity = {
      ...activityData,
      id: Math.floor(Math.random() * 100000),
      user: currentUser,
      class_id: classData.id,
      timestamp: new Date().toISOString(),
      likes: [],
      comments: []
    };
    
    await fetchRequest('/post_data', {
      data: activity,
      sheet: 'ActivityFeed'
    });
    
    await initializeActivityFeed();
  } catch (error) {
    console.error('Error posting activity:', error);
  }
}

async function handleActivityLike(activityId) {
  try {
    const activity = activityFeed.find(a => a.id === activityId);
    if (!activity) return;
    
    const hasLiked = activity.likes.includes(currentUser);
    if (hasLiked) {
      activity.likes = activity.likes.filter(user => user !== currentUser);
    } else {
      activity.likes.push(currentUser);
    }
    
    await fetchRequest('/update_data', {
      sheet: 'ActivityFeed',
      row_value: activityId,
      row_name: 'id',
      data: activity
    });
    
    await initializeActivityFeed();
  } catch (error) {
    console.error('Error handling activity like:', error);
  }
}

function showActivityComments(activity) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Comments</h3>
      <div class="comments-container">
        ${activity.comments.length > 0
          ? activity.comments.map(comment => `
              <div class="comment">
                <div class="comment-header">
                  <span class="comment-author">${comment.user}</span>
                  <span class="comment-time">${formatTimeAgo(comment.timestamp)}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
              </div>
            `).join('')
          : '<p class="empty-state">No comments yet</p>'
        }
      </div>
      <form id="activityCommentForm" class="comment-form">
        <textarea id="activityCommentText" placeholder="Add a comment..." required></textarea>
        <div class="form-actions">
          <button type="submit" class="action-button">Comment</button>
          <button type="button" class="action-button secondary" id="closeActivityComments">Close</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = modal.querySelector('#activityCommentForm');
  const closeBtn = modal.querySelector('#closeActivityComments');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comment = {
      user: currentUser,
      text: document.getElementById('activityCommentText').value,
      timestamp: new Date().toISOString()
    };
    
    await addActivityComment(activity.id, comment);
    document.body.removeChild(modal);
  });
  
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function addActivityComment(activityId, comment) {
  try {
    const activity = activityFeed.find(a => a.id === activityId);
    if (!activity) return;
    
    activity.comments.push(comment);
    await fetchRequest('/update_data', {
      sheet: 'ActivityFeed',
      row_value: activityId,
      row_name: 'id',
      data: activity
    });
    
    await initializeActivityFeed();
  } catch (error) {
    console.error('Error adding activity comment:', error);
  }
}

// Resource Modal Function
function showResourceModal() {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal';
  modalContainer.id = 'resourceModal';
  
  modalContainer.innerHTML = `
    <div class="modal-content">
      <form id="resourceForm" class="resource-form">
        <h3>Share Resource</h3>
        <div class="form-group">
          <label for="resourceTitle">Title</label>
          <input type="text" id="resourceTitle" required maxlength="100">
        </div>
        <div class="form-group">
          <label for="resourceType">Type</label>
          <select id="resourceType" required>
            <option value="notes">Notes</option>
            <option value="practice">Practice Problems</option>
            <option value="guide">Study Guide</option>
            <option value="link">External Link</option>
          </select>
        </div>
        <div class="form-group">
          <label for="resourceContent">Content</label>
          <textarea id="resourceContent" required maxlength="5000"></textarea>
        </div>
        <div class="form-group">
          <label for="resourceTags">Tags (comma separated)</label>
          <input type="text" id="resourceTags" placeholder="e.g., homework, chapter 1, review">
        </div>
        <div class="form-group">
          <label for="resourceVisibility">Visibility</label>
          <select id="resourceVisibility" required>
            <option value="class">Class Only</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="action-button">Share</button>
          <button type="button" class="action-button secondary" id="cancelResourceBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  const form = modalContainer.querySelector('#resourceForm');
  const cancelBtn = modalContainer.querySelector('#cancelResourceBtn');
  
  const closeModal = () => {
    const modal = document.getElementById('resourceModal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const resourceData = {
      title: document.getElementById('resourceTitle').value,
      type: document.getElementById('resourceType').value,
      content: document.getElementById('resourceContent').value,
      tags: document.getElementById('resourceTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0),
      visibility: document.getElementById('resourceVisibility').value,
      class_id: classData.id,
      shared_by: currentUser,
      id: Math.floor(Math.random() * 10000),
      created_at: new Date().toISOString(),
      likes: [],
      comments: []
    };
    
    try {
      await postResource(resourceData);
      
      // Add to activity feed
      await postActivity({
        type: 'resource',
        content: `Shared a new ${resourceData.type}: ${resourceData.title}`,
        related_id: resourceData.id
      });
      
      closeModal();
      await initializeResources();
    } catch (error) {
      console.error('Error sharing resource:', error);
      alert('Failed to share resource. Please try again.');
    }
  });
  
  cancelBtn.addEventListener('click', closeModal);
  
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closeModal();
    }
  });
}

async function postResource(resourceData) {
  // Compress content if it's too long
  if (resourceData.content.length > 1000) {
    resourceData.content = {
      full: resourceData.content,
      preview: resourceData.content.substring(0, 997) + '...'
    };
  }
  
  // Ensure URL-safe IDs
  resourceData.id = `res_${Math.random().toString(36).substring(2, 15)}`;
  
  await fetchRequest('/post_data', {
    data: resourceData,
    sheet: 'Resources'
  });
}

// Update filterResources function to handle resource types
function filterResources(type) {
  const resourcesList = document.getElementById('resourcesList');
  const resources = resourcesList.querySelectorAll('.resource-item');
  
  resources.forEach(resource => {
    if (type === 'all' || resource.dataset.type === type.toLowerCase()) {
      resource.style.display = 'block';
    } else {
      resource.style.display = 'none';
    }
  });
}
async function postStudyGroup(groupData) {
  try {
    await fetchRequest('/post_data', {
      data: groupData,
      sheet: 'StudyGroups'
    });
  } catch (error) {
    console.error('Error posting study group:', error);
    throw error;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return formatDate(date);
  }
}

async function switchChatTab(tabType) {
  try {
    // Get messages for the selected tab
    const messages = await fetchMessages(tabType);
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '';

    if (messages.length === 0) {
      messageList.innerHTML = '<p class="empty-state">No messages yet</p>';
      return;
    }

    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender === currentUser ? 'sent' : 'received'}`;
        
        if (message.type === 'poll') {
          messageEl.innerHTML = createPollElement(message.content);
        } else {
          messageEl.innerHTML = `
            <div class="message-header">
              <span class="sender">${message.sender}</span>
              <span class="timestamp">${formatTimeAgo(message.timestamp)}</span>
            </div>
            <div class="message-content">${message.text}</div>
            <div class="message-actions">
              <button class="emoji-reaction">😊</button>
              <button class="reply-btn">↩️ Reply</button>
            </div>
          `;
        }
        
        messageList.appendChild(messageEl);
      });

    // Scroll to bottom of message list
    messageList.scrollTop = messageList.scrollHeight;
  } catch (error) {
    console.error('Error switching chat tab:', error);
  }
}

function createPollElement(pollData) {
  const totalVotes = Object.values(pollData.votes).reduce((a, b) => a + b, 0);
  
  const optionsHtml = Object.entries(pollData.votes)
    .map(([option, votes]) => {
      const percentage = totalVotes > 0 ? (votes / totalVotes * 100).toFixed(1) : 0;
      return `
        <div class="poll-option">
          <div class="poll-option-header">
            <span>${option}</span>
            <span>${votes} votes (${percentage}%)</span>
          </div>
          <div class="poll-progress">
            <div class="poll-progress-bar" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');

  return `
    <div class="poll-container">
      <div class="poll-header">
        <span class="poll-icon">📊</span>
        <span class="poll-question">${pollData.question}</span>
      </div>
      <div class="poll-options">
        ${optionsHtml}
      </div>
      <div class="poll-footer">
        <span class="poll-total">${totalVotes} total votes</span>
        <span class="poll-timestamp">${formatTimeAgo(pollData.created_at)}</span>
      </div>
    </div>
  `;
}

// ... rest of existing code ...

