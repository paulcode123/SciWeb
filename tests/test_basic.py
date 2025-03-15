import pytest
from playwright.sync_api import Page, expect, Browser, BrowserContext, Error as PlaywrightError
import re
import os
import json
import logging
from typing import List
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('test.log')
    ]
)
logger = logging.getLogger(__name__)

@pytest.fixture(scope="session")
def storage_state(tmp_path_factory):
    """Create a persistent storage state file."""
    storage_path = tmp_path_factory.mktemp("playwright").joinpath("storage.json")
    # Initialize with empty state
    storage_path.write_text(json.dumps({
        "cookies": [],
        "origins": []
    }))
    return str(storage_path)

@pytest.fixture(scope="session")
def browser_context_args(storage_state):
    """Create a persistent context with caching enabled."""
    return {
        "storage_state": storage_state,
        "service_workers": "allow",
        "ignore_https_errors": True,
        "viewport": {
            "width": 1280,
            "height": 720
        },
        "accept_downloads": True,
        "no_viewport": False,
        "bypass_csp": True
    }

@pytest.fixture(scope="session")
def browser_type_launch_args():
    """Configure browser launch arguments."""
    return {
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage"
        ],
        "ignore_default_args": ["--enable-automation"]
    }

@pytest.fixture(scope="session")
def persistent_context(browser: Browser, browser_context_args: dict):
    """Create a persistent context that will be reused across tests."""
    context = browser.new_context(**browser_context_args)
    # Configure context-level timeouts
    context.set_default_timeout(60000)  # 60 second timeout for operations
    context.set_default_navigation_timeout(60000)
    yield context
    # Save the final state
    context.storage_state(path=browser_context_args["storage_state"])
    context.close()

class TestConsole:
    """Helper class to store console messages."""
    def __init__(self):
        self.messages = []
        self.error_count = 0
        self.log_file = "console_logs.json"
        # Initialize log file
        with open(self.log_file, 'w') as f:
            json.dump([], f)
    
    def handle_console(self, msg):
        """Handle console message."""
        message_data = {
            'type': msg.type,
            'text': msg.text,
            'location': msg.location,
            'timestamp': datetime.now().isoformat()
        }
        self.messages.append(message_data)
        
        # Save to JSON file
        try:
            with open(self.log_file, 'r') as f:
                logs = json.load(f)
            logs.append(message_data)
            with open(self.log_file, 'w') as f:
                json.dump(logs, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save console log: {e}")
        
        # Log console messages
        log_message = f"CONSOLE {msg.type.upper()}: {msg.text}"
        if msg.location.get('url'):
            log_message += f" at {msg.location['url']}:{msg.location.get('lineNumber', '?')}"
        
        if msg.type == 'error':
            self.error_count += 1
            logger.error(log_message)
        elif msg.type == 'warning':
            logger.warning(log_message)
        else:
            logger.info(log_message)

@pytest.fixture
def console():
    """Fixture to store console messages."""
    return TestConsole()

@pytest.fixture
def page(persistent_context: BrowserContext, console: TestConsole):
    """Create a new page in the persistent context with console logging."""
    page = persistent_context.new_page()
    logger.info("Created new page")
    
    # Configure page-level timeouts
    page.set_default_timeout(60000)
    page.set_default_navigation_timeout(60000)
    logger.info("Configured page timeouts")
    
    # Listen to console messages
    page.on("console", console.handle_console)
    
    # Listen to page errors
    def handle_error(error):
        error_data = {
            'type': 'page_error',
            'text': str(error),
            'timestamp': datetime.now().isoformat()
        }
        try:
            with open(console.log_file, 'r') as f:
                logs = json.load(f)
            logs.append(error_data)
            with open(console.log_file, 'w') as f:
                json.dump(logs, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save page error: {e}")
        logger.error(f"Page error: {error}")
    page.on("pageerror", handle_error)
    
    # Listen to request failures
    def handle_request_failed(request):
        request_data = {
            'type': 'request_failed',
            'url': request.url,
            'timestamp': datetime.now().isoformat()
        }
        try:
            with open(console.log_file, 'r') as f:
                logs = json.load(f)
            logs.append(request_data)
            with open(console.log_file, 'w') as f:
                json.dump(logs, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save request failure: {e}")
        logger.error(f"Request failed: {request.url}")
    page.on("requestfailed", handle_request_failed)
    
    yield page
    
    # Print console messages if there are any
    if console.messages:
        logger.info("\nBrowser Console Summary:")
        logger.info(f"Total messages: {len(console.messages)}")
        logger.info(f"Errors: {console.error_count}")
        
        if console.error_count > 0:
            logger.error("\nDetailed Error Messages:")
            for msg in console.messages:
                if msg['type'] == 'error':
                    logger.error(f"Error at {msg['timestamp']}")
                    logger.error(f"Message: {msg['text']}")
                    if msg['location'].get('url'):
                        logger.error(f"Location: {msg['location']['url']}:{msg['location'].get('lineNumber', '?')}")
    
    logger.info("Closing page")
    page.close()

def test_basic_navigation(page: Page):
    """Test basic navigation and interaction with a webpage."""
    # Navigate to the homepage
    page.goto("http://localhost:8080")  # Updated port to 8080
    
    # Basic assertions
    expect(page).to_have_title(re.compile(".*SciWeb.*"))
    
    # Take a screenshot
    page.screenshot(path="test-screenshots/homepage.png")

@pytest.mark.parametrize("viewport", [
    {"width": 1280, "height": 720},
    {"width": 375, "height": 812},  # iPhone X
])
def test_responsive_design(page: Page, viewport: dict):
    """Test responsive design by checking different viewport sizes."""
    page.set_viewport_size(viewport)
    page.goto("http://localhost:8080")  # Updated port to 8080
    page.screenshot(path=f"test-screenshots/viewport_{viewport['width']}x{viewport['height']}.png")

def test_form_interaction(page: Page):
    """Test form interactions and submissions."""
    # Go directly to the login page
    page.goto("http://localhost:8080/Login")
    
    # Fill in the login form with the provided credentials
    page.fill("input#fname", "Paul")  # Using correct ID selector
    page.fill("input#password", "imotest")  # Using correct ID selector
    
    # Take a screenshot before submitting
    page.screenshot(path="test-screenshots/before_login.png")
    
    # Click the login button - using form submission since there might not be a specific submit button
    page.keyboard.press("Enter")
    
    # Wait for navigation or response
    page.wait_for_load_state("networkidle")
    
    # Take a screenshot after login attempt
    page.screenshot(path="test-screenshots/after_login.png")
    
    # Wait for any redirect to complete
    page.wait_for_url("**/")  # Wait for redirect to any page
    
    # Take a final screenshot of where we landed
    page.screenshot(path="test-screenshots/final_page.png")

def test_api_request_monitoring(page: Page):
    """Test monitoring of API requests."""
    # Start waiting for API request before triggering it
    with page.expect_response("**/api/data") as response_info:
        page.goto("http://localhost:8080/data")  # Updated port to 8080
    
    # Verify the response
    response = response_info.value
    assert response.status == 200
    data = response.json()
    assert "data" in data

def test_class_navigation(page: Page):
    """Test navigating to a class page after login."""
    # First login
    page.goto("http://localhost:8080/Login")
    page.fill("input#fname", "Paul")
    page.fill("input#password", "imotest")
    page.keyboard.press("Enter")
    
    # Wait for 15 seconds after login submission
    page.wait_for_timeout(15000)  # 15 seconds in milliseconds
    
    # Navigate directly to Classes page
    page.goto("http://localhost:8080/Classes")
    
    # Wait for the classes to load
    page.wait_for_selector(".class-item", state="visible")
    
    # Take a screenshot of the classes page
    page.screenshot(path="test-screenshots/classes_page.png")
    
    # Get the first class element and click it
    first_class = page.locator(".class-content").first
    class_name = first_class.locator("h3").text_content()
    print(f"Clicking on class: {class_name}")
    
    # Click the class item (avoiding the stars)
    first_class.click()
    
    # Wait for navigation to the class page
    page.wait_for_url("**/class/**")  # Updated to lowercase 'class'
    
    # Take a screenshot of the class page
    page.screenshot(path="test-screenshots/class_page.png")
    
    # Verify we're on the class page
    expect(page).to_have_url(re.compile(r".*\/class\/.*"))  # Updated to lowercase 'class'

def test_class_features(page: Page):
    """Test various features on the class page."""
    # First login
    page.goto("http://localhost:8080/Login")
    page.fill("input#fname", "Paul")
    page.fill("input#password", "imotest")
    page.keyboard.press("Enter")
    
    # Wait for 15 seconds after login submission
    page.wait_for_timeout(15000)  # 15 seconds in milliseconds
    
    # Navigate directly to Classes page
    page.goto("http://localhost:8080/Classes")
    page.wait_for_load_state("networkidle")
    
    # Click on first class
    page.click(".class-card >> nth=0")
    page.wait_for_load_state("networkidle")
    
    # Share a resource
    page.click("#shareResourceBtn")
    page.wait_for_selector(".modal-content", state="visible", timeout=60000)
    
    # Fill out resource form
    page.fill("#resourceTitle", "Test Resource")
    page.fill("#resourceContent", "This is a test resource")
    page.fill("#resourceTags", "test,demo")
    
    # Take screenshot before submitting
    page.screenshot(path="test-screenshots/resource_form.png")
    
    # Submit form
    page.click("button:has-text('Share Resource')")
    page.wait_for_selector(".resource-item:has-text('Test Resource')")
    
    # Take screenshot after resource is added
    page.screenshot(path="test-screenshots/resource_added.png")
    
    # Create study group
    page.click("#createStudyGroupBtn")
    page.wait_for_selector("#studyGroupForm", state="visible")
    page.fill("#groupName", "Test Study Group")
    page.fill("#groupDescription", "This is a test study group")
    page.fill("#nextSession", "2024-12-31")
    page.click("button:has-text('Create Group')")
    page.wait_for_selector(".study-group-card:has-text('Test Study Group')")
    page.screenshot(path="test-screenshots/study_group.png")
    
    # Send chat message
    page.fill("#messageInput", "Hello, this is a test message!")
    page.click("#sendMessageBtn")
    page.wait_for_selector(".chat-message:has-text('Hello, this is a test message!')")
    page.screenshot(path="test-screenshots/chat_message.png")
    
    # Start video conference
    page.click("#startVideoBtn")
    page.wait_for_selector("#videoConferenceContainer")
    page.screenshot(path="test-screenshots/video_conference.png")
    
    # Check online users
    page.click("#onlineUsersBtn")
    page.wait_for_selector("#onlineUsersList")
    page.screenshot(path="test-screenshots/online_users.png")
    
    # Use emoji picker
    page.click("#emojiPickerBtn")
    page.wait_for_selector(".emoji-picker")
    page.click(".emoji-item >> nth=0")  # Click first emoji
    page.click("#sendMessageBtn")
    page.screenshot(path="test-screenshots/emoji_message.png")
    
    # Upload file
    with page.expect_file_chooser() as fc_info:
        page.click("#fileUploadBtn")
    file_chooser = fc_info.value
    file_chooser.set_files("test_file.txt")
    page.wait_for_selector(".file-message")
    page.screenshot(path="test-screenshots/file_message.png")
    
    # Create poll
    page.click("#createPollBtn")
    page.wait_for_selector("#pollForm")
    page.fill("#pollQuestion", "Test Poll")
    page.fill("#pollOption1", "Option 1")
    page.fill("#pollOption2", "Option 2")
    page.click("button:has-text('Create Poll')")
    page.wait_for_selector(".poll-card:has-text('Test Poll')")
    page.screenshot(path="test-screenshots/poll.png")

def test_login(page: Page):
    """Test login functionality with detailed error handling."""
    logger.info("Starting login process")
    try:
        # Navigate to login page
        logger.info("Navigating to login page")
        response = page.goto("http://localhost:8080/Login", wait_until="networkidle")
        if not response.ok:
            logger.error(f"Failed to load login page: {response.status} {response.status_text}")
            raise PlaywrightError(f"Failed to load login page: {response.status}")
        
        # Wait for user ID to be generated and stored
        logger.info("Waiting for user ID")
        page.wait_for_function("""() => {
            const cookies = document.cookie.split(';');
            return cookies.some(cookie => cookie.trim().startsWith('user_id='));
        }""")
        
        # Get the user ID from cookie
        user_id = page.evaluate("""() => {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'user_id') return value;
            }
            return null;
        }""")
        logger.info(f"Using user ID from cookie: {user_id}")
        
        # Wait for form elements
        logger.info("Waiting for login form elements")
        page.wait_for_selector("input#fname", state="visible")
        page.wait_for_selector("input#password", state="visible")
        
        # Fill credentials
        logger.info("Filling login credentials")
        page.fill("input#fname", "Paul")
        page.fill("input#password", "imotest")
        
        # Submit form
        logger.info("Submitting login form")
        with page.expect_navigation(wait_until="networkidle") as navigation_info:
            page.keyboard.press("Enter")
        
        # Check navigation result
        response = navigation_info.value
        if not response.ok:
            logger.error(f"Login navigation failed: {response.status} {response.status_text}")
            raise PlaywrightError(f"Login navigation failed: {response.status}")
        
        # Wait for successful login indicators
        logger.info("Waiting for successful login indicators")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        # Verify login success
        if "/Login" in page.url:
            logger.error("Still on login page after submission")
            raise PlaywrightError("Login failed - still on login page")
        
        logger.info("Login successful")
        return True
        
    except PlaywrightError as e:
        logger.error(f"Login failed: {str(e)}")
        page.screenshot(path="test-screenshots/login_error.png")
        raise

def test_debug_session(page: Page):
    """Create a persistent debug session that keeps the browser window open."""
    # First login to get a session
    page.goto("http://localhost:8080/Login")
    page.fill("input#fname", "Paul")
    page.fill("input#password", "imotest")
    page.keyboard.press("Enter")
    
    # Wait for login to complete
    page.wait_for_timeout(15000)
    
    # Keep the browser window open indefinitely
    # This will block until interrupted
    try:
        while True:
            page.wait_for_timeout(1000)  # Sleep for 1 second
    except KeyboardInterrupt:
        print("Debug session ended by user")
        
    page.screenshot(path="test-screenshots/debug_session_end.png")

@pytest.fixture(autouse=True)
def setup_teardown(page: Page, console: TestConsole):
    """Setup and teardown for each test."""
    logger.info("Starting test")
    yield
    
    if page.url != "about:blank":
        if console.error_count > 0:
            logger.error(f"Test completed with {console.error_count} console errors")
        else:
            logger.info("Test completed successfully")
        page.close() 