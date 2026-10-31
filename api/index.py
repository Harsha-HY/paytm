import os
import sys
import traceback
from fastapi.responses import PlainTextResponse

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from main import app as original_app
    app = original_app
except Exception as e:
    tb = traceback.format_exc()
    from fastapi import FastAPI
    err_app = FastAPI()
    @err_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    def error_catcher(path: str):
        return PlainTextResponse(f"FastAPI Startup Error:\n{tb}", status_code=500)
    app = err_app
