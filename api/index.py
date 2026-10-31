import os
import sys
import traceback

# Ensure current directory and backend directory are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

backend_dir = os.path.join(current_dir, "..", "backend")
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from main import app as base_app
    import_error = None
except Exception as e:
    import_error = traceback.format_exc()
    base_app = None

async def app(scope, receive, send):
    if import_error:
        if scope["type"] == "http":
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"text/plain")],
            })
            await send({
                "type": "http.response.body",
                "body": f"Backend Import Error on Vercel:\n{import_error}".encode("utf-8"),
            })
        return

    if scope["type"] == "http":
        path = scope.get("path", "")
        # Normalize paths for Vercel
        if path == "" or path == "/":
            scope["path"] = "/"
        elif not path.startswith("/api") and not path.startswith("/docs") and not path.startswith("/openapi.json"):
            scope["path"] = f"/api{path}"

    try:
        await base_app(scope, receive, send)
    except Exception as e:
        err = traceback.format_exc()
        if scope["type"] == "http":
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"text/plain")],
            })
            await send({
                "type": "http.response.body",
                "body": f"Backend Execution Error on Vercel:\n{err}".encode("utf-8"),
            })
