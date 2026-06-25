import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

try:
    from index import app
except Exception as e:
    app = FastAPI()

    @app.exception_handler(500)
    async def error_handler(request: Request, exc: Exception):
        return JSONResponse({"error": str(exc)}, status_code=500)

    @app.get("/api/game/state")
    async def debug():
        try:
            import index
            return {"ok": True}
        except Exception as e2:
            return JSONResponse({"import_error": str(e2)}, status_code=500)
    
    @app.get("/api/debug")
    async def debug2():
        return {
            "cwd": os.getcwd(),
            "files": os.listdir(os.path.dirname(os.path.abspath(__file__))),
            "parent_files": os.listdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "sys_path": sys.path[:5]
        }
