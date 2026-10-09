# AI 100 Sports Image Classification System

React + TypeScript + Tailwind frontend, Flask + SQLAlchemy (SQLite) backend, serving **your own trained Keras model**.
The app never trains a model, ships no dataset and contains no demo data. Until you make predictions, pages show "No predictions yet."

```
sports-classification/
├── backend/   Flask API (app.py, config.py, predictor.py, routes/, model/, uploads/)
├── frontend/  React app (src/pages, components, services/api.ts)
└── database/  sports_predictions.db is created automatically
```

## Requirements
Python 3.10–3.12 (a TensorFlow-supported version) and Node.js 18+.

## 1. Model setup
1. Train the model separately in VS Code with your dataset.
2. Put the trained model in `backend/model/` (default name `model.keras`; `.h5` also works).
3. Put `class_names.json` in `backend/model/`: a JSON list of your 100 sport names **in the same order as your model's output units**:
   ```json
   ["sport_1", "sport_2", "...", "sport_100"]
   ```
   (If you saved a class-index dict like `{"0": "archery", ...}` that works too.)
4. If your filenames differ, set `MODEL_PATH` / `CLASS_NAMES_PATH` (see below).
5. **Match preprocessing to training** in `backend/config.py` (or env vars):
   - `IMAGE_SIZE` (default 224)
   - `NORMALIZATION`: `0-1` (pixels/255, default), `-1-1` (pixels/127.5 - 1), or `none` (raw 0–255, if your model rescales internally).
   If predictions look wrong, this setting is the first thing to check.
6. Optional files in `backend/model/` for the Model Performance page: `model_metrics.json`
   (`{"accuracy":0.95,"precision":0.95,"recall":0.95,"f1_score":0.95}`; values ≤ 1 display as %), `confusion_matrix.png`,
   `training_history.json` (Keras `history.history`: `accuracy`, `val_accuracy`, `loss`, `val_loss`).

## 2. Run the backend  → http://localhost:5000
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows   (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
python app.py
```
Check http://localhost:5000/api/health → `{"status":"ok","model_loaded":true}`.
If `model_loaded` is false, `GET /api/model-info` (and the Model Performance page) shows the reason.

## 3. Run the frontend  → http://localhost:5173
```bash
cd frontend
npm install
npm run dev
```
The backend URL is `VITE_API_URL` in `frontend/.env` (default `http://localhost:5000/api`).

## Configuration (environment variables, all optional)
| Variable | Default |
|---|---|
| `MODEL_PATH` | `backend/model/model.keras` (relative paths are from the project root) |
| `CLASS_NAMES_PATH` | `backend/model/class_names.json` |
| `IMAGE_SIZE` / `NORMALIZATION` | `224` / `0-1` |
| `CONFIDENCE_THRESHOLD` | `50` (percent; below it the UI shows "Low confidence prediction") |
| `MAX_UPLOAD_MB` / `MAX_BATCH_FILES` | `10` / `50` |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` |
| `PORT` | `5000` |

## API
`POST /api/predict` (form field `image`) · `POST /api/predict/batch` (field `images`) · `GET /api/history` ·
`GET|DELETE /api/history/<id>` · `GET /api/analytics` · `GET /api/sports` · `GET /api/model-info` · `GET /api/health`

## Notes
- Uploaded images are kept in `backend/uploads/` so history thumbnails work; they are deleted when you delete the prediction, or if prediction fails.
- Camera capture needs `localhost` or HTTPS and browser permission; if denied, normal upload still works.
- Delete `database/sports_predictions.db` to reset history.
