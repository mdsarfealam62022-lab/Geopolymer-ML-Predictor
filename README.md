# GeoPredict — Geopolymer Concrete Strength Predictor
## Complete Setup & Deployment Guide

> **Developed by:** Sarfe Alam — [LinkedIn](https://www.linkedin.com/in/sarfe-alam-92a213300)  
> **Guided by:** Ass. Prof. Saurav (BCE)

---

## 📁 Project Structure

```
geopolymer-predictor/
├── main.py                          ← FastAPI backend (Python)
├── requirements.txt                 ← Python dependencies
├── README.md                        ← This guide
├── models/
│   ├── geopolymer_best_model.pkl    ← Trained XGBoost model
│   └── geopolymer_scaler.pkl        ← StandardScaler
└── static/
    ├── index.html                   ← Main web page
    ├── css/
    │   └── style.css                ← All styles
    └── js/
        └── app.js                   ← Charts, prediction, PDF export
```

---

## 🖥️ Step 1: Setup in VS Code

### 1.1 Open the Project
```bash
# In VS Code terminal:
cd path/to/geopolymer-predictor
```

### 1.2 Create a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 1.3 Install Dependencies
```bash
pip install -r requirements.txt
```

> ⚠️ **Important:** The XGBoost model requires `xgboost` to be installed.  
> If you see a model load error, run: `pip install xgboost==2.1.1`

---

## 🚀 Step 2: Run Locally

```bash
# From the project root:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open your browser at: **http://localhost:8000/static/index.html**

Or visit the API docs: **http://localhost:8000/docs**

### VS Code Tip: Use the `Run & Debug` panel
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI Dev",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload", "--port", "8000"],
      "jinja": true,
      "justMyCode": true
    }
  ]
}
```

---

## ☁️ Step 3: Free Deployment Options

### Option A: Render.com (Recommended ✅ — 100% Free)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - GeoPredict"
   git remote add origin https://github.com/YOUR_USERNAME/geopolymer-predictor.git
   git push -u origin main
   ```

2. **Create `render.yaml`** in project root:
   ```yaml
   services:
     - type: web
       name: geopredict
       env: python
       buildCommand: pip install -r requirements.txt
       startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
       envVars:
         - key: PYTHON_VERSION
           value: 3.11.0
   ```

3. **Deploy on Render:**
   - Go to https://render.com → Sign up free
   - New → Web Service → Connect GitHub repo
   - Select your repo, Render auto-detects `render.yaml`
   - Click **Deploy** — Your URL: `https://geopredict.onrender.com`

4. **Add model files:** Upload `.pkl` files via Render dashboard or include in repo.

---

### Option B: Railway.app (Easy, Free Tier)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. Create `Procfile` in project root:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. Deploy:
   ```bash
   railway init
   railway up
   ```

---

### Option C: Hugging Face Spaces (Great for ML Projects ✅)

1. Create account at https://huggingface.co
2. New Space → SDK: **Gradio** → But we want FastAPI, so:
   - Choose **Docker** as SDK
   - Create `Dockerfile`:
     ```dockerfile
     FROM python:3.11-slim
     WORKDIR /app
     COPY requirements.txt .
     RUN pip install -r requirements.txt
     COPY . .
     EXPOSE 7860
     CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
     ```
3. Push to HF Space repo — automatically deployed

---

### Option D: Deta Space (Free Micro-server)

1. Install Deta CLI: `curl -fsSL https://get.deta.dev/space-cli.sh | sh`
2. Create `Spacefile`:
   ```yaml
   v: 0
   micros:
     - name: geopredict
       src: .
       engine: python3.9
       run: uvicorn main:app --host 0.0.0.0 --port 8080
   ```
3. Deploy: `space push`

---

## 🔧 Step 4: Git Setup (GitHub)

```bash
# Initialize and push
git init
git add .
git commit -m "GeoPredict v1.0 — ML-powered geopolymer concrete predictor"

# Create .gitignore first:
echo "venv/
__pycache__/
*.pyc
.env
.DS_Store" > .gitignore

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/geopredict.git
git push -u origin main
```

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | Predict compressive strength |
| `GET`  | `/feature-importance` | Get XGBoost feature importances |
| `GET`  | `/health` | Check server & model status |
| `GET`  | `/docs` | Swagger UI auto-docs |

### Example cURL:
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "fly_ash": 300, "ggbs": 75, "naoh_molarity": 12,
    "na2sio3_naoh": 2.0, "water": 175, "superplasticizer": 5.0,
    "fine_agg": 700, "coarse_agg": 1200,
    "curing_temp": 60, "curing_time": 24, "age": 28
  }'
```

---

## 📦 Input Feature Ranges

| Feature | Min | Max | Unit |
|---------|-----|-----|------|
| Fly Ash | 150 | 450 | kg/m³ |
| GGBS | 0 | 150 | kg/m³ |
| NaOH Molarity | 6 | 18 | M |
| Na₂SiO₃/NaOH | 0.5 | 3.5 | — |
| Water | 100 | 250 | kg/m³ |
| Superplasticizer | 0 | 15 | kg/m³ |
| Fine Aggregate | 500 | 900 | kg/m³ |
| Coarse Aggregate | 900 | 1500 | kg/m³ |
| Curing Temperature | 20 | 100 | °C |
| Curing Time | 8 | 48 | h |
| Age | 1 | 90 | days |

---

## 🤔 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: xgboost` | `pip install xgboost` |
| Model not loading | Check `models/` folder has both `.pkl` files |
| CORS error | Already configured in `main.py` |
| Port in use | Change port: `--port 8001` |
| Static files not serving | Run from project root, not `static/` folder |
| Charts not loading | Check internet (Chart.js from CDN) |

---

## 📊 Model Performance Summary

| Model | R² | MAE (MPa) | RMSE (MPa) |
|-------|-----|-----------|------------|
| Random Forest | 0.978 | 1.394 | 1.751 |
| **XGBoost** ✅ | **0.993** | **0.755** | **1.011** |

---

## 📖 Data Sources

- Singh et al. (2015) — https://doi.org/10.1016/j.jclepro.2015.01.031
- Ahmad et al. (2021) — https://doi.org/10.1016/j.jclepro.2021.127885
- Assi et al. (2018) — https://doi.org/10.1016/j.conbuildmat.2018.04.183
- Mendeley GPC Data Hub — https://data.mendeley.com/datasets/3p95wzw7x9/1

---

*© 2025 GeoPredict — For academic & research use. Verify with lab testing for structural design.*
