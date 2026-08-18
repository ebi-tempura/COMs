from fastapi import FastAPI

app = FastAPI(title = "COMs API")

@app.get ("/")
def read_root():
    return {"message" : "COMs API is running"}

