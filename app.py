import asyncio
import json
import re
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse


import pandas as pd
import numpy as np
import io
import traceback
import os
from datetime import datetime


import uvicorn

import backend.llm_comms as llm

app = FastAPI()

# Mount static files (CSS, JS)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Store dataset in memory (for now)
DATASTORE = {
    "df_name": None,
    "df": None
}

def reset_datastore():
    DATASTORE["df"] = None
    DATASTORE["df_name"] = None

def create_dataset_tracker():
    if not os.path.exists("backend/dataset_info.json"):
        with open("backend/dataset_info.json", "w") as f:
            json.dump({"df_name": None}, f)

create_dataset_tracker()
if os.path.exists("backend/dataset_info.json"):
    with open("backend/dataset_info.json", "r") as f:
        info = json.load(f)
        DATASTORE["df_name"] = info.get("df_name")
        if DATASTORE["df_name"]:
            try:
                DATASTORE["df"] = pd.read_csv(f"uploads/{DATASTORE['df_name']}.csv")
            except Exception as e:
                print(f"Error loading dataset: {e}")
                reset_datastore()
else:
    reset_datastore()

def save_dataset_info_in_tracker():
    try:
        with open("backend/dataset_info.json", "w") as f:
            json.dump({"df_name": DATASTORE["df_name"]}, f)
    except Exception as e:
        print(f"Error saving dataset info: {e}")





def normalize_result(result):
    # DataFrame
    if hasattr(result, "tolist"):
        try:
            return result.tolist()
        except:
            pass

    if hasattr(result, "to_dict"):
        return result.to_dict(orient="records")

    return result

# -------------------------------
# Helper: Safe execution
# -------------------------------
def safe_exec(code: str, df: pd.DataFrame):
    safe_builtins = {
        "len": len,
        "min": min,
        "max": max,
        "sum": sum,
        "sorted": sorted,
        "abs": abs,
        "round": round,
    }
    safe_globals = {
        "__builtins__": safe_builtins,
        "df": df,
        "pd": pd,
    }

    local_vars = {}

    try:
        # Auto-fix: ensure result exists
        if "result" not in code:
            code = f"result = {code}"

        exec(code, safe_globals, local_vars)

        return local_vars.get("result", None), None

    except Exception as e:
        return None, str(e)

def extract_code_from_tags(text):
    # Handle <code>...</code>
    match = re.search(r"<code>(.*?)</code>", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Handle ``` blocks (just in case)
    match = re.search(r"```(?:python)?\n([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()

    return text.strip()

# -------------------------------
# Upload Dataset
# -------------------------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_name = file.filename
        if file_name.endswith(".csv"):
            file_name = file_name[:-4]
        else:
            return {"error": "Only CSV files are supported"}
        df = pd.read_csv(io.BytesIO(content))

        DATASTORE["df"] = df
        DATASTORE["df_name"] = file_name

        # store the dataset in a file(for now)
        df.to_csv(f"uploads/{file_name}.csv", index=False)
        return {
            "message": "File uploaded successfully",
            "columns": list(df.columns),
            "preview": df.head(3).to_dict(orient="records")
        }

    except Exception as e:
        return {"error": str(e)}

# -------------------------------
# Ask Question
# -------------------------------


@app.post("/ask")
async def ask_question(question: str = Form(...)):
    df = DATASTORE["df"]

    if df is None:
        return {"error": "No dataset uploaded"}

    try:
        print("Received question:", question)

        content = await asyncio.to_thread(llm.route_question, question, df)
        # content = {
        #     "answer": "test answer"
        # }
        print("Generated content:", content)
        if isinstance(content, dict) and "code" in content:
            code = extract_code_from_tags(content["code"])

            print("Final code:", code)

            result, error = await asyncio.to_thread(safe_exec, code, df)

            if error:
                return {"error": error}

            # Convert DataFrame → JSON
            
            print("Result type:", type(result), result)
            result = normalize_result(result)
            print("Result type:", type(result), result)

            return {"answer": result}     
        
        print("content ", str(content))

        return content

    except Exception as e:
        return {
            "error": str(e),
            "trace": traceback.format_exc()
        }


@app.get("/")
def serve_frontend():    
    return FileResponse("frontend/index.html")

@app.get("/datasets")
def get_uploaded_datasets():
    files = os.listdir("uploads")
    datasets = [
        { 
            "name": f,
            "uploaded_at": f"{datetime.fromtimestamp(os.path.getmtime(f'uploads/{f}')).strftime('%Y-%m-%d %H:%M:%S')}",
            "is_current": (DATASTORE["df_name"] == f[:-4])
        } 
        for f in files if f.endswith(".csv")
    ]

    # for ds in datasets:
    #     print(ds["name"], ds["uploaded_at"],DATASTORE["df_name"])

    return {
        "datasets": datasets
    }

@app.delete("/datasets/{dataset_name}")
def delete_dataset(dataset_name: str):
    if not dataset_name.endswith(".csv"):
        return {"error": "Only CSV files are supported"}
    dataset_name = dataset_name[:-4]
    file_path = f"uploads/{dataset_name}.csv"
    if os.path.exists(file_path):
        os.remove(file_path)
        reset_datastore()
        save_dataset_info_in_tracker()
        return {"message": "Dataset deleted successfully"}
    else:
        return {"error": "Dataset not found"}

@app.get("/datasets/{dataset_name}")
def load_dataset(dataset_name: str):
    if not dataset_name.endswith(".csv"):
        return {"error": "Only CSV files are supported"}
    dataset_name = dataset_name[:-4]
    file_path = f"uploads/{dataset_name}.csv"
    if os.path.exists(file_path):
        df = pd.read_csv(file_path)
        DATASTORE["df"] = df
        DATASTORE["df_name"] = dataset_name
        save_dataset_info_in_tracker()
        buffer = io.StringIO()
        df.info(buf=buffer)
        return {
            "message": "Dataset loaded successfully",
            "columns": list(df.columns),
            "preview": df.head(3).to_dict(orient="records"),
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "data_types": df.dtypes.astype(str).to_dict(),
            "shape":df.shape,
            "head":df.head(5).to_dict(orient="records"),
            "tail":df.tail(5).to_dict(orient="records"),
            "info": buffer.getvalue()
        }
    else:
        return {"error": "Dataset not found"}



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Server started at http://localhost:8000")
