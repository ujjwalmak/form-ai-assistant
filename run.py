#!/usr/bin/env python3
"""
FormAssist – Launcher Script
Starts a local HTTP server and opens the application in the default browser.
"""

import os
import sys
import webbrowser
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()
os.chdir(SCRIPT_DIR)

HOST = "localhost"
PORT = 8080
URL = f"http://{HOST}:{PORT}/form-ai-assistant.html"

class RequestHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        """Log requests to stdout"""
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def start_server():
    """Start the HTTP server"""
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    
    print(f"╭─ FormAssist Server ──────────────────────────────────────────")
    print(f"│")
    print(f"│  Server running at: {URL}")
    print(f"│  Press Ctrl+C to stop")
    print(f"│")
    print(f"╰──────────────────────────────────────────────────────────────")
    print()
    
    # Open browser after a short delay to allow server to start
    time.sleep(0.5)
    webbrowser.open(URL)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        httpd.shutdown()
        sys.exit(0)

if __name__ == "__main__":
    start_server()
