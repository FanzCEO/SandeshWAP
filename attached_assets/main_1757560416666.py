from fastapi import FastAPI
app=FastAPI()
@app.get('/')
async def root():
    return {'msg':'Hello from FastAPI Basic'}
