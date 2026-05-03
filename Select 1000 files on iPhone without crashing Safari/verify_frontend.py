from playwright.sync_api import sync_playwright
import os
import subprocess
import time

def run_verification():
    # Start the server
    server_process = subprocess.Popen(
        ["node", "Select 1000 files on iPhone without crashing Safari/server.js"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(2) # Wait for server to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                record_video_dir="verification/videos"
            )
            page = context.new_page()

            page.goto("http://localhost:3000")
            page.wait_for_timeout(1000)

            # Initial state
            page.screenshot(path="verification/screenshots/initial_state.png")

            # Select directory
            file_input = page.locator("#folder")
            if not os.path.exists("test_folder"):
                os.makedirs("test_folder", exist_ok=True)
                with open("test_folder/file1.txt", "w") as f: f.write("test")
                with open("test_folder/file2.txt", "w") as f: f.write("test")

            file_input.set_input_files("test_folder")
            page.wait_for_timeout(1000)

            # Set target URL
            page.fill("#url", "/upload")
            page.wait_for_timeout(500)

            # Verify counter
            file_count = page.locator("#file-count")
            print(f"File count text: {file_count.inner_text()}")
            page.screenshot(path="verification/screenshots/files_selected.png")

            # Test Upload (Batch mode)
            page.click("#upload-btn")
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/screenshots/upload_done.png")

            # Wait for completion
            page.wait_for_selector("text=Upload complete!", timeout=10000)

            page.wait_for_timeout(1000)
            page.screenshot(path="verification/screenshots/final_state.png")

            context.close()
            browser.close()
    finally:
        server_process.terminate()

if __name__ == "__main__":
    os.makedirs("verification/videos", exist_ok=True)
    os.makedirs("verification/screenshots", exist_ok=True)
    run_verification()
