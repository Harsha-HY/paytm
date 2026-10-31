import asyncio
import json
from typing import List, Dict, Any, Optional
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.main_loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.main_loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.main_loop = asyncio.get_running_loop()
        # Send initial connected greeting
        try:
            await websocket.send_json({
                "type": "CONNECTION_ESTABLISHED",
                "message": "Connected to MDR Settlement Guardian Real-Time Stream",
                "status": "LIVE"
            })
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts event to all connected dashboards (Admin, Merchant, Personal)."""
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

# Global manager instance
event_manager = ConnectionManager()

def emit_event_sync(event_type: str, data: Dict[str, Any]):
    """Synchronous helper that safely schedules async broadcast from worker threads to main asyncio loop."""
    payload = {
        "type": event_type,
        "data": data
    }

    loop = event_manager.main_loop
    if loop and loop.is_running():
        try:
            asyncio.run_coroutine_threadsafe(event_manager.broadcast(payload), loop)
            return
        except Exception as e:
            print(f"[Events] Threadsafe broadcast error: {e}")

    try:
        cur_loop = asyncio.get_running_loop()
        if cur_loop.is_running():
            cur_loop.create_task(event_manager.broadcast(payload))
            return
    except RuntimeError:
        pass
