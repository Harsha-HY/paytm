import os
import sys

# Ensure backend folder is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, "..", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
