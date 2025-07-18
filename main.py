from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from ibkr import Ibkr
import traceback
import sys

app = FastAPI()
ibkr = Ibkr()

@app.get("/positions")
async def positions():
    try:
        return ibkr.get_positions()
    except Exception:
        exc_info = sys.exc_info()
        raise HTTPException(status_code=500, detail=''.join(traceback.format_exception(*exc_info)))

@app.get("/summary")
async def summary():
    try:
        return ibkr.get_summary()
    except Exception:
        exc_info = sys.exc_info()
        raise HTTPException(status_code=500, detail=''.join(traceback.format_exception(*exc_info)))

@app.get("/trades")
async def trades():
    return ibkr.get_trades()

@app.get("/transaction-history")
async def trades():
    return ibkr.get_transaction_history()

@app.get("/performance")
async def get_performance():
    return ibkr.get_performance()

app.mount("/", StaticFiles(directory="static", html = True), name="static")
