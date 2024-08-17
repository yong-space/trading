from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from ibkr import Ibkr
import traceback
import sys

app = FastAPI()

@app.get("/positions")
async def positions():
    try:
        return Ibkr().get_positions()
    except Exception:
        exc_info = sys.exc_info()
        raise HTTPException(status_code=500, detail=''.join(traceback.format_exception(*exc_info)))

app.mount("/", StaticFiles(directory="static", html = True), name="static")
