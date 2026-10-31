import asyncio
import json
from typing import List, Dict, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
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
    """Synchronous helper that safely schedules async broadcast on running loop."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(event_manager.broadcast({
                "type": event_type,
                "data": data
            }))
        else:
            loop.run_until_complete(event_manager.broadcast({
                "type": event_type,
                "data": data
            }))
    except Exception as e:
        # If no loop in current thread, ignore safely (WebSocket clients will refresh via fallback)
        pass
