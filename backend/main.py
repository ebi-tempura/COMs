from fastapi import FastAPI
from schemas import WorkOrderCreate

app = FastAPI(title = "COMs API")

@app.get ("/")
def read_root():
    return {"message" : "COMs API is running"}

@app.post ("/api/work-orders", status_code = 201)
def create_work_order(work_order: WorkOrderCreate):
    return {
            "message": "WorkOrder recived",
            "work_order":work_order,
    }

