import os
import sys

# Ensure backend folder is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, "..", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app as base_app

async def app(scope, receive, send):
    if scope["type"] == "http":
        path = scope.get("path", "")
        # Normalize paths for Vercel
        if path == "" or path == "/":
            scope["path"] = "/"
        elif not path.startswith("/api") and not path.startswith("/docs") and not path.startswith("/openapi.json"):
            scope["path"] = f"/api{path}"
    await base_app(scope, receive, send)
