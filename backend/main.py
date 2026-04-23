import os
from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd
import uvicorn
from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="AgriPredict Backend API",
    description="ML API for price prediction and demand forecasting",
    version="1.0.0",
)

allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

price_model = None
price_encoders = None
demand_model = None
demand_encoders = None


def safe_joblib_load(path: Path):
    if not path.exists():
        return None
    return joblib.load(path)


def normalize_payload(payload: Dict[str, Any]) -> pd.DataFrame:
    df = pd.DataFrame([payload])

    if "date" in df.columns:
        try:
            dt = pd.to_datetime(df["date"])
            if "month" not in df.columns:
                df["month"] = dt.dt.month
            if "dayofweek" not in df.columns:
                df["dayofweek"] = dt.dt.dayofweek
        except Exception:
            pass

    return df


def apply_encoders(df: pd.DataFrame, encoders: Any) -> pd.DataFrame:
    if encoders is None:
        return df

    if isinstance(encoders, dict):
        for col, encoder in encoders.items():
            if col in df.columns:
                try:
                    df[col] = encoder.transform(df[col].astype(str))
                except Exception:
                    pass

    return df


@app.on_event("startup")
def load_models():
    global price_model, price_encoders, demand_model, demand_encoders

    price_model = safe_joblib_load(BASE_DIR / "pricemodel.pkl")
    price_encoders = safe_joblib_load(BASE_DIR / "priceencoders.pkl")
    demand_model = safe_joblib_load(BASE_DIR / "demandmodel.pkl")
    demand_encoders = safe_joblib_load(BASE_DIR / "demandencoders.pkl")


@app.get("/")
def root():
    return {
        "message": "AgriPredict FastAPI backend is running",
        "docs": "/docs",
        "status": "ok"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "price_model_loaded": price_model is not None,
        "demand_model_loaded": demand_model is not None
    }


@app.post("/predict_price")
def predict_price(payload: Dict[str, Any] = Body(...)):
    if price_model is None:
        raise HTTPException(status_code=500, detail="Price model not loaded")

    try:
        df = normalize_payload(payload)
        df = apply_encoders(df, price_encoders)
        prediction = price_model.predict(df)[0]

        return {
            "success": True,
            "endpoint": "predict_price",
            "prediction": round(float(prediction), 2)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Price prediction failed: {str(e)}")


@app.post("/forecast_demand")
def forecast_demand(payload: Dict[str, Any] = Body(...)):
    if demand_model is None:
        raise HTTPException(status_code=500, detail="Demand model not loaded")

    try:
        df = normalize_payload(payload)
        df = apply_encoders(df, demand_encoders)
        prediction = demand_model.predict(df)[0]

        return {
            "success": True,
            "endpoint": "forecast_demand",
            "prediction": str(prediction)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Demand forecast failed: {str(e)}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
