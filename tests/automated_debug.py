from playwright.sync_api import sync_playwright
import time

def run_automated_debug():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            # Navigate to login page
            page.goto('http://localhost:8080')
            
            # Wait for login form and fill credentials
            page.wait_for_selector('#username')
            page.fill('#username', 'imotest')
            page.fill('#password', 'password')
            page.click('button[type="submit"]')
            
            # Wait for home page to load
            page.wait_for_url('http://localhost:8080/')
            print("Successfully logged in")
            
            # Wait for classes to load
            time.sleep(2)  # Give time for data to load
            
            # Click on first class (using JavaScript since it's dynamically loaded)
            page.evaluate('''() => {
                const classElements = document.querySelectorAll('.class-card');
                if (classElements.length > 0) {
                    classElements[0].click();
                }
            }''')
            
            # Wait for class page to load and take screenshot
            time.sleep(2)  # Give time for class page to load
            page.screenshot(path="class_page_initial.png")
            print("Screenshot captured: class_page_initial.png")
            
            # Keep browser open for inspection
            input("Press Enter to close the browser...")
            
        finally:
            browser.close()

if __name__ == "__main__":
    run_automated_debug() 