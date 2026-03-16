"""
Geopolymer Concrete Compressive Strength Predictor
FastAPI Backend
Developed by: Sarfe Alam
Guided by: Ass. Prof. Saurav (BCE)
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
#from fastapi.responses import JSONResponse
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pickle
import numpy as np
import os
import warnings

warnings.filterwarnings("ignore")

# ── App Initialization ────────────────────────────────────────────────────────
app = FastAPI(
    title="Geopolymer Concrete Strength Predictor API",
    description="Predicts 28-day compressive strength of Geopolymer Concrete using XGBoost ML model.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model & Scaler Loading ────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "geopolymer_best_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "models", "geopolymer_scaler.pkl")

model = None
scaler = None
feature_importances_cache = None

FEATURE_NAMES = [
    "FlyAsh(kg/m³)", "GGBS(kg/m³)", "NaOH_Molarity", "Na₂SiO₃/NaOH",
    "Water(kg/m³)", "Superplasticizer(kg/m³)", "Fine_Agg(kg/m³)",
    "Coarse_Agg(kg/m³)", "Curing_Temp(°C)", "Curing_Time(h)", "Age(days)"
]

try:
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    print("✅ Scaler loaded successfully.")
except Exception as e:
    print(f"❌ Scaler load error: {e}")

try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print(f"✅ Model loaded: {type(model).__name__}")
    if hasattr(model, "feature_importances_"):
        feature_importances_cache = model.feature_importances_.tolist()
except Exception as e:
    print(f"❌ Model load error: {e}")
    print("   → Make sure 'xgboost' is installed: pip install xgboost")


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class ConcreteInput(BaseModel):
    fly_ash: float       = Field(..., ge=150, le=450, description="Fly Ash content (kg/m³)")
    ggbs: float          = Field(..., ge=0,   le=150, description="GGBS content (kg/m³)")
    naoh_molarity: float = Field(..., ge=6,   le=18,  description="NaOH Molarity (M)")
    na2sio3_naoh: float  = Field(..., ge=0.5, le=3.5, description="Na₂SiO₃/NaOH ratio")
    water: float         = Field(..., ge=100, le=250, description="Water content (kg/m³)")
    superplasticizer: float = Field(..., ge=0, le=15, description="Superplasticizer (kg/m³)")
    fine_agg: float      = Field(..., ge=500, le=900, description="Fine Aggregate (kg/m³)")
    coarse_agg: float    = Field(..., ge=900, le=1500,description="Coarse Aggregate (kg/m³)")
    curing_temp: float   = Field(..., ge=20,  le=100, description="Curing Temperature (°C)")
    curing_time: float   = Field(..., ge=8,   le=48,  description="Curing Time (h)")
    age: float           = Field(..., ge=1,   le=90,  description="Age (days)")


class PredictionResponse(BaseModel):
    compressive_strength: float
    strength_category: str
    usability: list
    input_summary: dict


# ── Helpers ───────────────────────────────────────────────────────────────────
def classify_strength(mpa: float) -> dict:
    """Map MPa value to civil engineering usability."""
    if mpa < 15:
        return {
            "category": "Very Low Strength",
            "color": "#ff4444",
            "grade": "M15 (Below Standard)",
            "uses": [
                {"application": "Mass Filling", "icon": "🏗️",
                 "detail": "Non-structural mass filling, sub-base layers"},
                {"application": "Screed/Leveling", "icon": "📐",
                 "detail": "Floor leveling and surface screeds only"},
            ],
            "not_suitable": ["Load-bearing walls", "Bridges", "Pavements", "Structural slabs"],
            "recommendation": "Increase GGBS content, NaOH molarity, or curing temperature for better strength."
        }
    elif mpa < 25:
        return {
            "category": "Low Strength",
            "color": "#ff8c00",
            "grade": "M20 – M25",
            "uses": [
                {"application": "Plain Cement Concrete", "icon": "🧱",
                 "detail": "Non-structural PCC work, pathways"},
                {"application": "Residential Footpaths", "icon": "🚶",
                 "detail": "Pedestrian walkways and garden paths"},
                {"application": "Low-Traffic Pavements", "icon": "🛤️",
                 "detail": "Rural roads, parking lots with light traffic"},
            ],
            "not_suitable": ["High-rise buildings", "Bridges", "Prestressed elements"],
            "recommendation": "Suitable for light construction. Consider raising Age(days) or Curing_Temp for higher grades."
        }
    elif mpa < 35:
        return {
            "category": "Moderate Strength",
            "color": "#ffd700",
            "grade": "M25 – M35",
            "uses": [
                {"application": "Residential Buildings", "icon": "🏠",
                 "detail": "G+2 residential structures, slabs and beams"},
                {"application": "Urban Pavements", "icon": "🛣️",
                 "detail": "City roads and municipal pavements"},
                {"application": "Retaining Walls", "icon": "🧱",
                 "detail": "Moderate-load retaining structures"},
                {"application": "Drainage Structures", "icon": "🌊",
                 "detail": "Culverts, drains, and canal linings"},
            ],
            "not_suitable": ["Long-span bridges", "Skyscrapers", "Prestressed concrete"],
            "recommendation": "Good general-purpose strength. Suitable for most low to medium-rise construction."
        }
    elif mpa < 50:
        return {
            "category": "High Strength",
            "color": "#00d4aa",
            "grade": "M35 – M50",
            "uses": [
                {"application": "Multi-Story Buildings", "icon": "🏢",
                 "detail": "Commercial buildings up to G+10 floors"},
                {"application": "Highway Bridges", "icon": "🌉",
                 "detail": "Simply supported & continuous highway bridges"},
                {"application": "Heavy Pavements", "icon": "🏗️",
                 "detail": "Airfield runways, industrial flooring"},
                {"application": "Water Retaining Structures", "icon": "💧",
                 "detail": "Tanks, reservoirs, dams"},
                {"application": "Underground Structures", "icon": "🚇",
                 "detail": "Metro tunnels, basements, pile foundations"},
            ],
            "not_suitable": ["Ultra-high-rise towers (>40 floors)", "Offshore platforms"],
            "recommendation": "Excellent strength for most civil engineering applications. Ideal for sustainable infrastructure."
        }
    elif mpa < 65:
        return {
            "category": "Very High Strength",
            "color": "#00b4ff",
            "grade": "M50 – M65",
            "uses": [
                {"application": "High-Rise Buildings", "icon": "🏙️",
                 "detail": "Towers above 20 floors, core walls & columns"},
                {"application": "Long-Span Bridges", "icon": "🌉",
                 "detail": "Cable-stayed & suspension bridge decks"},
                {"application": "Prestressed Concrete", "icon": "⚙️",
                 "detail": "Pre-tensioned and post-tensioned members"},
                {"application": "Industrial Floors", "icon": "🏭",
                 "detail": "Heavy machinery foundations, port structures"},
                {"application": "Marine Structures", "icon": "⚓",
                 "detail": "Offshore piers, breakwaters, jetties"},
            ],
            "not_suitable": ["Standard residential use (over-designed)"],
            "recommendation": "Exceptional performance. Optimal for premium infrastructure projects requiring sustainability."
        }
    else:
        return {
            "category": "Ultra High Strength",
            "color": "#bf80ff",
            "grade": "M65+",
            "uses": [
                {"application": "Skyscrapers", "icon": "🏙️",
                 "detail": "Supertall towers > 300m, mega-core structures"},
                {"application": "Nuclear Structures", "icon": "☢️",
                 "detail": "Reactor containment vessels, radiation shields"},
                {"application": "Offshore Platforms", "icon": "🛢️",
                 "detail": "Deepwater drilling platforms, oil rigs"},
                {"application": "Military Structures", "icon": "🛡️",
                 "detail": "Blast-resistant bunkers, protective shelters"},
                {"application": "Specialized Foundations", "icon": "⚙️",
                 "detail": "Turbine bases, seismic isolation systems"},
            ],
            "not_suitable": ["Routine construction (economically over-designed)"],
            "recommendation": "World-class performance. Geopolymer concrete excels here with superior durability and low carbon footprint."
        }


# ── API Endpoints ─────────────────────────────────────────────────────────────


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse("static/index.html")

@app.post("/predict", response_model=PredictionResponse)
async def predict(data: ConcreteInput):
    if model is None or scaler is None:
        raise HTTPException(
            status_code=503,
            detail="Model or scaler not loaded. Ensure xgboost is installed and PKL files exist."
        )
    features = np.array([[
        data.fly_ash, data.ggbs, data.naoh_molarity, data.na2sio3_naoh,
        data.water, data.superplasticizer, data.fine_agg, data.coarse_agg,
        data.curing_temp, data.curing_time, data.age
    ]])
    scaled = scaler.transform(features)
    raw_pred = float(model.predict(scaled)[0])
    strength = round(max(0.0, raw_pred), 2)

    info = classify_strength(strength)

    return PredictionResponse(
        compressive_strength=strength,
        strength_category=info["category"],
        usability=info["uses"],
        input_summary={
            "fly_ash": data.fly_ash, "ggbs": data.ggbs,
            "naoh_molarity": data.naoh_molarity, "na2sio3_naoh": data.na2sio3_naoh,
            "water": data.water, "superplasticizer": data.superplasticizer,
            "fine_agg": data.fine_agg, "coarse_agg": data.coarse_agg,
            "curing_temp": data.curing_temp, "curing_time": data.curing_time, "age": data.age
        }
    )


@app.get("/feature-importance")
async def feature_importance():
    if feature_importances_cache:
        return {"features": FEATURE_NAMES, "importances": feature_importances_cache}
    # Fallback using correlation-based approximation from EDA
    fallback = [0.18, 0.52, 0.50, 0.04, 0.08, 0.03, 0.06, 0.02, 0.12, 0.02, 0.59]
    total = sum(fallback)
    normalized = [round(v / total, 4) for v in fallback]
    return {"features": FEATURE_NAMES, "importances": normalized, "source": "correlation-approx"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "model_type": type(model).__name__ if model else None
    }


# ── Serve Static Frontend ─────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Dev Server Entry Point ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
