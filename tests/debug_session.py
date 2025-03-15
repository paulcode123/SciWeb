from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext
import code
import logging
import time
from typing import Optional, Dict, Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlaywrightDebugger:
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None
        
    def start(self):
        """Start the Playwright session with a browser window."""
        self._playwright = sync_playwright().start()
        self.browser = self._playwright.chromium.launch(
            headless=False,
            devtools=True,
            args=['--start-maximized']
        )
        self.context = self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            ignore_https_errors=True
        )
        self.page = self.context.new_page()
        return self
        
    def login(self, username: str = "Paul", password: str = "imotest"):
        """Login to the application."""
        try:
            logger.info("Navigating to login page...")
            self.page.goto("http://localhost:8080/Login", wait_until="networkidle")
            self.page.fill("input#fname", username)
            self.page.fill("input#password", password)
            self.page.keyboard.press("Enter")
            self.page.wait_for_timeout(15000)  # Wait for login
            logger.info("Login successful!")
        except Exception as e:
            logger.error(f"Login failed: {e}")
            raise
            
    def goto_classes(self):
        """Navigate to the Classes page."""
        self.page.goto("http://localhost:8080/Classes")
        self.page.wait_for_selector(".class-card")
        
    def goto_class(self, index: int = 0):
        """Navigate to a specific class."""
        self.goto_classes()
        self.page.click(f".class-card >> nth={index}")
        self.page.wait_for_load_state("networkidle")
        
    def share_resource(self, title: str, content: str, tags: str):
        """Share a resource in the current class."""
        self.page.click("#shareResourceBtn")
        self.page.wait_for_selector(".modal-content", state="visible")
        self.page.fill("#resourceTitle", title)
        self.page.fill("#resourceContent", content)
        self.page.fill("#resourceTags", tags)
        self.page.click("button:has-text('Share Resource')")
        
    def create_study_group(self, name: str, description: str, next_session: str):
        """Create a study group in the current class."""
        self.page.click("#createStudyGroupBtn")
        self.page.wait_for_selector("#studyGroupForm", state="visible")
        self.page.fill("#groupName", name)
        self.page.fill("#groupDescription", description)
        self.page.fill("#nextSession", next_session)
        self.page.click("button:has-text('Create Group')")
        
    def send_chat_message(self, message: str):
        """Send a chat message."""
        self.page.fill("#messageInput", message)
        self.page.click("#sendMessageBtn")
        
    def create_poll(self, question: str, options: list):
        """Create a poll in the current class."""
        self.page.click("#createPollBtn")
        self.page.wait_for_selector("#pollForm")
        self.page.fill("#pollQuestion", question)
        for i, option in enumerate(options, 1):
            self.page.fill(f"#pollOption{i}", option)
        self.page.click("button:has-text('Create Poll')")
        
    def wait_for_selector(self, selector: str, timeout: int = 30000):
        """Wait for an element to be visible."""
        try:
            self.page.wait_for_selector(selector, state="visible", timeout=timeout)
            return True
        except Exception as e:
            logger.error(f"Timeout waiting for selector '{selector}': {e}")
            return False
            
    def screenshot(self, path: str):
        """Take a screenshot of the current page."""
        self.page.screenshot(path=path)
        logger.info(f"Screenshot saved to {path}")
        
    def get_console_logs(self) -> list:
        """Get all console logs collected so far."""
        return self.context.pages[0].evaluate("""() => {
            return window.consoleLog || [];
        }""")
        
    def cleanup(self):
        """Clean up resources."""
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self._playwright:
            self._playwright.stop()

def start_debug_session():
    """Start an interactive debug session with Playwright."""
    debugger = PlaywrightDebugger()
    
    try:
        debugger.start()
        debugger.login()
        
        # Create interactive shell variables
        shell_vars = {
            'debugger': debugger,
            'page': debugger.page,
            'context': debugger.context,
            'browser': debugger.browser
        }
        
        # Start interactive shell
        logger.info("\nDebug session started!")
        logger.info("Available objects: debugger, page, context, browser")
        logger.info("\nHelper methods:")
        logger.info("  debugger.goto_classes()")
        logger.info("  debugger.goto_class(index=0)")
        logger.info("  debugger.share_resource(title, content, tags)")
        logger.info("  debugger.create_study_group(name, description, next_session)")
        logger.info("  debugger.send_chat_message(message)")
        logger.info("  debugger.create_poll(question, options)")
        logger.info("  debugger.screenshot(path)")
        logger.info("\nExample:")
        logger.info("  debugger.goto_class(0)")
        logger.info("  debugger.share_resource('Test', 'Content', 'tag1,tag2')")
        logger.info("\nPress Ctrl+D to exit")
        
        code.interact(local=shell_vars)
        
    except Exception as e:
        logger.error(f"Error in debug session: {e}")
        raise
    finally:
        debugger.cleanup()

if __name__ == "__main__":
    start_debug_session() 