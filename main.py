from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from ibkr import Ibkr

app = FastAPI()

@app.get("/positions")
async def positions():
    return Ibkr().get_positions()

app.mount("/", StaticFiles(directory="static", html = True), name="static")
