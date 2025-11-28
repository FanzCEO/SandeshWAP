from fastapi import APIRouter, WebSocket
router = APIRouter()

@router.websocket("/ws/echo")
async def ws_echo(ws: WebSocket):
    await ws.accept()
    while True:
        data = await ws.receive_text()
        await ws.send_text(f"echo: {data}")