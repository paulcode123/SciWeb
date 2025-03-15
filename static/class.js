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
  const classId = window.location.pathname.split('/').pop();
  
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

  // Initialize online users tracking
  initializeOnlineUsers(data.Users);
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
    setupResourceSearch();
  } catch (error) {
    console.error('Error initializing resources:', error);
  }
}

function renderResources(resources) {
  const resourcesList = document.getElementById('resourcesList');
  if (!resourcesList) return;
  
  resourcesList.innerHTML = '';

  if (!resources || resources.length === 0) {
    resourcesList.innerHTML = '<div class="empty-state">No resources shared yet</div>';
    return;
  }

  resources.forEach(resource => {
    const resourceElement = createResourceElement(resource);
    resourcesList.appendChild(resourceElement);
  });
}

function createResourceElement(resource) {
  const element = document.createElement('div');
  element.className = 'resource-item';
  
  const timeAgo = formatTimeAgo(new Date(resource.created_at));
  
  element.innerHTML = `
    <div class="resource-header">
      <h4 class="resource-title">${resource.title}</h4>
      <div class="resource-meta">
        <span onclick="handleResourceLike('${resource.id}')" style="cursor: pointer;">
          ❤️ ${resource.likes || 0}
        </span>
        <span onclick="showResourceComments(${JSON.stringify(resource)})" style="cursor: pointer;">
          💬 ${resource.comments?.length || 0}
        </span>
      </div>
    </div>
    
    <div class="resource-content">
      ${getResourceContent(resource)}
    </div>
    
    <div class="resource-footer">
      <div class="resource-tags">
        ${resource.tags.map(tag => `<span class="resource-tag">${tag}</span>`).join('')}
      </div>
      <div class="resource-info">
        <span class="resource-author">Shared by: ${resource.shared_by}</span>
        <span class="resource-time">${timeAgo}</span>
      </div>
    </div>
  `;

  return element;
}

function getResourceContent(resource) {
  if (resource.fileUrl) {
    const fileSize = formatFileSize(resource.fileSize);
    return `
      <div class="file-resource">
        <div class="file-info">
          <span class="file-name">${resource.fileName}</span>
          <span class="file-size">${fileSize}</span>
        </div>
        <button class="action-button download-btn" onclick="downloadResource('${resource.id}', '${resource.fileUrl}', '${resource.fileName}')">
          Download
        </button>
      </div>
    `;
  }
  
  if (resource.type === 'link') {
    return `<a href="${resource.content}" target="_blank" class="resource-link">${resource.content}</a>`;
  }
  
  return `<div class="resource-text">${resource.content}</div>`;
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
  const pollButton = document.getElementById('pollBtn');

  // Initialize chat tabs
  const chatTabs = document.querySelectorAll('.chat-tab');
  chatTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      chatTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchChatTab(tab.dataset.tab);
    });
  });

  // Send message on button click or Enter key
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Clear chat
  clearButton.addEventListener('click', clearChat);

  // File upload
  fileUpload.addEventListener('change', handleFileUpload);

  // Emoji picker
  emojiTrigger.addEventListener('click', showEmojiPicker);

  // Poll creation
  if (pollButton) {
    pollButton.addEventListener('click', showPollCreator);
  }

  // Initial chat load
  updateChatMessages();
  
  // Set up periodic updates
  setInterval(updateChatMessages, 5000);
}

async function sendMessage() {
  const messageInput = document.getElementById('message-input');
  const text = messageInput.value.trim();
  
  if (!text) return;
  
  try {
    startLoading();
    
    const messageData = {
      text,
      sender: currentUser,
      location: classData.id,
      timestamp: new Date().toISOString(),
      id: Math.floor(Math.random() * 9000) + 1000
    };

    await fetchRequest('/post_data', {
      sheet: 'Chat',
      data: messageData
    });

    messageInput.value = '';
    await updateChatMessages();
    
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Error sending message', 'error');
  } finally {
    endLoading();
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
    startLoading();
    
    // Upload file and get URL
    const fileUrl = await uploadFile(file);
    
    // Create message with file attachment
    const messageData = {
      text: `Shared a file: ${file.name}`,
      sender: currentUser,
      location: classData.id,
      timestamp: new Date().toISOString(),
      id: Math.floor(Math.random() * 9000) + 1000,
      attachment: {
        url: fileUrl,
        name: file.name,
        type: file.type,
        size: file.size
      }
    };

    await fetchRequest('/post_data', {
      sheet: 'Chat',
      data: messageData
    });

    await updateChatMessages();
    
  } catch (error) {
    console.error('Error uploading file:', error);
    showNotification('Error uploading file', 'error');
  } finally {
    endLoading();
    e.target.value = ''; // Reset file input
  }
}

function showEmojiPicker(e) {
  const button = e.target.closest('.emoji-trigger');
  let picker = document.querySelector('.emoji-picker');
  
  if (picker) {
    picker.remove();
    return;
  }
  
  picker = document.createElement('div');
  picker.className = 'emoji-picker';
  
  const emojis = ['😊', '👍', '❤️', '🎉', '👏', '🤔', '📚', '✨', '💡', '🔥'];
  
  emojis.forEach(emoji => {
    const option = document.createElement('div');
    option.className = 'emoji-option';
    option.textContent = emoji;
    option.addEventListener('click', () => {
      const messageInput = document.getElementById('message-input');
      messageInput.value += emoji;
      picker.remove();
      messageInput.focus();
    });
    picker.appendChild(option);
  });
  
  button.parentNode.appendChild(picker);
  
  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('.emoji-trigger')) {
      picker.remove();
    }
  }, { once: true });
}

async function updateChatMessages() {
  const messageList = document.getElementById('message-list');
  if (!messageList) return;
  
  try {
    const data = await fetchRequest('/data', { data: 'Chat' });
    const messages = data.Chat.filter(m => m.location === classData.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Only update if there are new messages
    if (messages.length === chatMessages.length) return;
    
    messageList.innerHTML = '';
    messages.forEach(message => {
      const messageElement = createMessageElement(message);
      messageList.appendChild(messageElement);
    });
    
    // Store current messages
    chatMessages = messages;
    
    // Scroll to bottom
    messageList.scrollTop = messageList.scrollHeight;
    
  } catch (error) {
    console.error('Error updating chat:', error);
  }
}

function createMessageElement(message) {
  const element = document.createElement('div');
  element.className = `message ${message.sender === currentUser ? 'sent' : 'received'}`;
  
  const timeAgo = formatTimeAgo(new Date(message.timestamp));
  
  let content = message.text;
  if (message.attachment) {
    const fileSize = formatFileSize(message.attachment.size);
    content += `
      <div class="file-attachment">
        <div class="file-info">
          <span class="file-name">${message.attachment.name}</span>
          <span class="file-size">${fileSize}</span>
        </div>
        <a href="${message.attachment.url}" target="_blank" class="action-button download-btn">
          Download
        </a>
      </div>
    `;
  }
  
  element.innerHTML = `
    <div class="message-header">
      <span class="message-sender">${message.sender}</span>
      <span class="message-time">${timeAgo}</span>
    </div>
    <div class="message-content">${content}</div>
  `;
  
  return element;
}

function initializeOnlineUsers(users) {
  const userList = document.getElementById('user-list');
  if (!userList) return;
  
  // Filter users in this class
  const classUsers = users.filter(user => 
    classData.OSIS.split(',').map(id => id.trim()).includes(user.osis.toString())
  );
  
  // Update member stats
  const memberStats = document.querySelector('.member-stats');
  if (memberStats) {
    memberStats.innerHTML = `
      <span class="online-count">0 Online</span>
      <span class="total-count">${classUsers.length} Total</span>
    `;
  }
  
  // Render user list
  userList.innerHTML = '';
  classUsers.forEach(user => {
    const userElement = document.createElement('div');
    userElement.className = 'user-bubble';
    userElement.innerHTML = `
      <span class="status-indicator offline"></span>
      <span class="user-name">${user.first_name} ${user.last_name}</span>
    `;
    userList.appendChild(userElement);
  });
  
  // Set up periodic online status updates
  setInterval(() => updateOnlineStatus(classUsers), 10000);
}

async function updateOnlineStatus(users) {
  try {
    const data = await fetchRequest('/data', { data: 'ClassStats' });
    const stats = data.ClassStats.find(s => s.class_id === classData.id);
    
    if (!stats) return;
    
    const onlineUsers = stats.active_users || [];
    const userElements = document.querySelectorAll('.user-bubble');
    let onlineCount = 0;
    
    userElements.forEach(element => {
      const userName = element.querySelector('.user-name').textContent;
      const user = users.find(u => `${u.first_name} ${u.last_name}` === userName);
      
      if (user && onlineUsers.includes(user.osis)) {
        element.querySelector('.status-indicator').className = 'status-indicator online';
        onlineCount++;
      } else {
        element.querySelector('.status-indicator').className = 'status-indicator offline';
      }
    });
    
    // Update online count
    const onlineCountElement = document.querySelector('.online-count');
    if (onlineCountElement) {
      onlineCountElement.textContent = `${onlineCount} Online`;
    }
    
  } catch (error) {
    console.error('Error updating online status:', error);
  }
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
  const createGroupBtn = document.getElementById('createGroupBtn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', () => showStudyGroupModal());
  }

  // Resource sharing
  const shareResourceBtn = document.getElementById('shareResourceBtn');
  if (shareResourceBtn) {
    shareResourceBtn.addEventListener('click', showResourceModal);
  }

  // Resource type filtering
  const resourceTags = document.querySelectorAll('.resource-tag');
  resourceTags.forEach(tag => {
    tag.addEventListener('click', () => {
      resourceTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      filterResources(tag.textContent.toLowerCase());
    });
  });

  // Resource search and sorting
  setupResourceSearch();

  // Video conference
  const startMeetingBtn = document.getElementById('startMeeting');
  if (startMeetingBtn) {
    startMeetingBtn.addEventListener('click', initializeVideoConference);
  }
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
function showStudyGroupModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Create Study Group</h3>
      <form id="studyGroupForm" class="study-group-form">
        <div class="form-group">
          <label for="groupName">Group Name</label>
          <input type="text" id="groupName" required>
        </div>
        
        <div class="form-group">
          <label for="groupDescription">Description</label>
          <textarea id="groupDescription" rows="3" required></textarea>
        </div>
        
        <div class="form-group">
          <label for="nextSession">Next Session</label>
          <input type="datetime-local" id="nextSession">
        </div>
        
        <div class="form-group">
          <label for="schedule">Recurring Schedule (Optional)</label>
          <select id="schedule">
            <option value="">No recurring schedule</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="action-button">Create Group</button>
          <button type="button" class="action-button secondary" onclick="this.closest('.modal').remove()">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = modal.querySelector('#studyGroupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      startLoading();
      
      const groupData = {
        name: formData.get('groupName'),
        description: formData.get('groupDescription'),
        nextSession: formData.get('nextSession'),
        schedule: formData.get('schedule'),
        class_id: classData.id,
        members: [currentUser],
        created_at: new Date().toISOString(),
        id: Math.floor(Math.random() * 9000) + 1000,
        resources: [],
        chat_history: []
      };

      await postStudyGroup(groupData);
      showNotification('Study group created successfully!', 'success');
      modal.remove();
      
      // Add to activity feed
      const activityData = {
        type: 'collaboration',
        class_id: classData.id,
        user: currentUser,
        content: `created a new study group: ${groupData.name}`,
        timestamp: new Date().toISOString()
      };
      await postActivity(activityData);
      
      // Refresh study groups
      const data = await fetchRequest('/data', { data: 'StudyGroups' });
      const groups = data.StudyGroups.filter(g => g.class_id === classData.id);
      renderStudyGroups(groups);
      
    } catch (error) {
      console.error('Error creating study group:', error);
      showNotification('Error creating study group', 'error');
    } finally {
      endLoading();
    }
  });
}

function renderStudyGroups(groups) {
  const studyGroupsList = document.getElementById('studyGroupsList');
  if (!studyGroupsList) return;

  if (!groups || groups.length === 0) {
    studyGroupsList.innerHTML = '<div class="empty-state">No study groups yet</div>';
    return;
  }

  studyGroupsList.innerHTML = '';
  groups.forEach(group => {
    const groupElement = createStudyGroupElement(group);
    studyGroupsList.appendChild(groupElement);
  });
}

function createStudyGroupElement(group) {
  const element = document.createElement('div');
  element.className = 'study-group-item';
  
  const isUserMember = group.members.includes(currentUser);
  const nextSession = group.nextSession ? new Date(group.nextSession) : null;
  const timeUntilSession = nextSession ? formatTimeUntil(nextSession) : 'No session scheduled';
  
  element.innerHTML = `
    <div class="group-header">
      <h4>${group.name}</h4>
      <span class="member-count">${group.members.length} members</span>
    </div>
    
    <p class="group-description">${group.description}</p>
    
    <div class="group-schedule">
      <span>Next session: ${timeUntilSession}</span>
      ${group.schedule ? `<span>(${group.schedule})</span>` : ''}
    </div>
    
    <div class="group-actions">
      ${isUserMember ? `
        <button class="action-button" onclick="handleJoinSession('${group.id}')">Join Session</button>
        <button class="action-button secondary" onclick="handleLeaveGroup('${group.id}')">Leave Group</button>
      ` : `
        <button class="action-button" onclick="handleJoinGroup('${group.id}')">Join Group</button>
      `}
    </div>
  `;

  return element;
}

async function handleJoinGroup(groupId) {
  try {
    startLoading();
    
    const data = await fetchRequest('/data', { data: 'StudyGroups' });
    const group = data.StudyGroups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    group.members.push(currentUser);
    
    await fetchRequest('/update_data', {
      sheet: 'StudyGroups',
      data: group,
      row_name: 'id',
      row_value: groupId
    });
    
    // Add to activity feed
    const activityData = {
      type: 'collaboration',
      class_id: classData.id,
      user: currentUser,
      content: `joined the study group: ${group.name}`,
      timestamp: new Date().toISOString()
    };
    await postActivity(activityData);
    
    showNotification('Successfully joined the group!', 'success');
    
    // Refresh study groups
    const updatedData = await fetchRequest('/data', { data: 'StudyGroups' });
    const groups = updatedData.StudyGroups.filter(g => g.class_id === classData.id);
    renderStudyGroups(groups);
    
  } catch (error) {
    console.error('Error joining group:', error);
    showNotification('Error joining group', 'error');
  } finally {
    endLoading();
  }
}

async function handleLeaveGroup(groupId) {
  try {
    startLoading();
    
    const data = await fetchRequest('/data', { data: 'StudyGroups' });
    const group = data.StudyGroups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    group.members = group.members.filter(member => member !== currentUser);
    
    await fetchRequest('/update_data', {
      sheet: 'StudyGroups',
      data: group,
      row_name: 'id',
      row_value: groupId
    });
    
    // Add to activity feed
    const activityData = {
      type: 'collaboration',
      class_id: classData.id,
      user: currentUser,
      content: `left the study group: ${group.name}`,
      timestamp: new Date().toISOString()
    };
    await postActivity(activityData);
    
    showNotification('Successfully left the group', 'success');
    
    // Refresh study groups
    const updatedData = await fetchRequest('/data', { data: 'StudyGroups' });
    const groups = updatedData.StudyGroups.filter(g => g.class_id === classData.id);
    renderStudyGroups(groups);
    
  } catch (error) {
    console.error('Error leaving group:', error);
    showNotification('Error leaving group', 'error');
  } finally {
    endLoading();
  }
}

async function handleJoinSession(groupId) {
  try {
    const data = await fetchRequest('/data', { data: 'StudyGroups' });
    const group = data.StudyGroups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    // Initialize video conference for the study group
    initializeVideoConference(`study-group-${groupId}`);
    
  } catch (error) {
    console.error('Error joining session:', error);
    showNotification('Error joining session', 'error');
  }
}

function initializeVideoConference(roomName = null) {
  const domain = 'meet.jit.si';
  const options = {
    roomName: roomName || `class-${classData.id}`,
    width: '100%',
    height: '600px',
    parentNode: document.querySelector('#meet'),
    userInfo: {
      displayName: currentUser
    },
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: true,
      enableWelcomePage: false,
      enableClosePage: false
    },
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
        'security'
      ],
    }
  };
  
  const api = new JitsiMeetExternalAPI(domain, options);
  
  // Update participant count
  api.addEventListener('participantJoined', () => {
    const count = api.getNumberOfParticipants();
    document.getElementById('participantCount').textContent = `${count} participants`;
  });
  
  api.addEventListener('participantLeft', () => {
    const count = api.getNumberOfParticipants();
    document.getElementById('participantCount').textContent = `${count} participants`;
  });
  
  // Handle video conference features
  document.querySelector('.feature-btn[title="Share Screen"]').addEventListener('click', () => {
    api.executeCommand('toggleShareScreen');
  });
  
  document.querySelector('.feature-btn[title="Whiteboard"]').addEventListener('click', () => {
    api.executeCommand('toggleShareScreen', {
      shareOptions: {
        desktopSharingSourceDevice: 'whiteboard'
      }
    });
  });
  
  document.querySelector('.feature-btn[title="Record Session"]').addEventListener('click', () => {
    api.executeCommand('toggleRecording');
  });
}

function formatTimeUntil(date) {
  const now = new Date();
  const diff = date - now;
  
  if (diff < 0) {
    return 'Session ended';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
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
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Share Resource</h3>
      <form id="resourceForm" class="resource-form">
        <div class="form-group">
          <label for="resourceTitle">Title</label>
          <input type="text" id="resourceTitle" required>
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
          <textarea id="resourceContent" rows="4"></textarea>
        </div>
        
        <div class="form-group">
          <label for="resourceFile">Or Upload File</label>
          <input type="file" id="resourceFile">
          <div class="file-info"></div>
        </div>
        
        <div class="form-group">
          <label for="resourceTags">Tags (comma-separated)</label>
          <input type="text" id="resourceTags" placeholder="e.g., homework, chapter 1, review">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="action-button">Share</button>
          <button type="button" class="action-button secondary" onclick="this.closest('.modal').remove()">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  const form = modal.querySelector('#resourceForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      startLoading();
      
      const resourceData = {
        title: formData.get('resourceTitle'),
        type: formData.get('resourceType'),
        content: formData.get('resourceContent'),
        tags: formData.get('resourceTags').split(',').map(tag => tag.trim()),
        class_id: classData.id,
        shared_by: currentUser,
        created_at: new Date().toISOString(),
        likes: 0,
        comments: []
      };

      const file = formData.get('resourceFile');
      if (file && file.size > 0) {
        // Handle file upload here
        const fileUrl = await uploadFile(file);
        resourceData.fileUrl = fileUrl;
        resourceData.fileName = file.name;
        resourceData.fileSize = file.size;
      }

      await postResource(resourceData);
      showNotification('Resource shared successfully!', 'success');
      modal.remove();
      
      // Add to activity feed
      const activityData = {
        type: 'resource',
        class_id: classData.id,
        user: currentUser,
        content: `shared a new ${resourceData.type}: ${resourceData.title}`,
        timestamp: new Date().toISOString()
      };
      await postActivity(activityData);
      
      // Refresh resources
      const data = await fetchRequest('/data', { data: 'Resources' });
      const resources = data.Resources.filter(r => r.class_id === classData.id);
      renderResources(resources);
      
    } catch (error) {
      console.error('Error sharing resource:', error);
      showNotification('Error sharing resource', 'error');
    } finally {
      endLoading();
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
  const searchInput = document.getElementById('resourceSearch');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  
  resources.forEach(resource => {
    const matchesType = type === 'all' || resource.dataset.type === type.toLowerCase();
    const matchesSearch = !searchTerm || 
      resource.textContent.toLowerCase().includes(searchTerm) ||
      resource.querySelector('.resource-tags').textContent.toLowerCase().includes(searchTerm);
    
    resource.style.display = matchesType && matchesSearch ? 'block' : 'none';
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

// Add these new functions for resource tracking
async function trackResourceView(resourceId) {
  try {
    const resource = await fetchRequest('/data', { 
      data: 'Resources',
      filters: { id: resourceId }
    });
    
    resource.views = (resource.views || 0) + 1;
    await fetchRequest('/update_data', {
      sheet: 'Resources',
      row_value: resourceId,
      row_name: 'id',
      data: resource
    });
  } catch (error) {
    console.error('Error tracking resource view:', error);
  }
}

async function downloadResource(resourceId, url, filename) {
  try {
    // Track download
    const resource = await fetchRequest('/data', { 
      data: 'Resources',
      filters: { id: resourceId }
    });
    
    resource.downloads = (resource.downloads || 0) + 1;
    await fetchRequest('/update_data', {
      sheet: 'Resources',
      row_value: resourceId,
      row_name: 'id',
      data: resource
    });

    // Update UI
    const downloadsEl = document.querySelector(`[data-resource-id="${resourceId}"] .resource-downloads`);
    if (downloadsEl) {
      downloadsEl.textContent = `⬇️ ${resource.downloads}`;
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading resource:', error);
    alert('Failed to download resource. Please try again.');
  }
}

// Add this to the setupEventListeners function
function setupResourceSearch() {
  const resourcesCard = document.querySelector('.resources');
  if (!resourcesCard) return;

  // Add search input
  const searchContainer = document.createElement('div');
  searchContainer.className = 'resource-search';
  searchContainer.innerHTML = `
    <input type="text" id="resourceSearch" placeholder="Search resources...">
    <select id="resourceSort">
      <option value="newest">Newest First</option>
      <option value="oldest">Oldest First</option>
      <option value="popular">Most Popular</option>
      <option value="downloads">Most Downloads</option>
    </select>
  `;

  const categoriesContainer = resourcesCard.querySelector('.resource-categories');
  categoriesContainer.parentNode.insertBefore(searchContainer, categoriesContainer);

  // Add event listeners
  const searchInput = document.getElementById('resourceSearch');
  const sortSelect = document.getElementById('resourceSort');

  searchInput.addEventListener('input', () => {
    const activeType = resourcesCard.querySelector('.resource-tag.active').textContent;
    filterResources(activeType);
  });

  sortSelect.addEventListener('change', () => {
    sortResources(sortSelect.value);
  });
}

function sortResources(sortBy) {
  const resourcesList = document.getElementById('resourcesList');
  const resources = Array.from(resourcesList.children);

  resources.sort((a, b) => {
    const aResource = a.dataset;
    const bResource = b.dataset;

    switch (sortBy) {
      case 'newest':
        return new Date(bResource.createdAt) - new Date(aResource.createdAt);
      case 'oldest':
        return new Date(aResource.createdAt) - new Date(bResource.createdAt);
      case 'popular':
        return (parseInt(bResource.likes) || 0) - (parseInt(aResource.likes) || 0);
      case 'downloads':
        return (parseInt(bResource.downloads) || 0) - (parseInt(aResource.downloads) || 0);
      default:
        return 0;
    }
  });

  // Clear and re-append sorted resources
  resourcesList.innerHTML = '';
  resources.forEach(resource => resourcesList.appendChild(resource));
}

