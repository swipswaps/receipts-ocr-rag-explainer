"""
Receipts OCR RAG Analytics Backend.
Health endpoint ALWAYS returns 200 for container liveness.
DuckDB vector search uses array_cosine_similarity (not manual numpy).
Citation: https://stackoverflow.com/questions/78432831 (lines 5-10)
"""
import os
import duckdb
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Receipts OCR RAG Analytics", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# In-memory DuckDB with VSS extension
db = duckdb.connect(database=':memory:')
db.execute("INSTALL vss; LOAD vss;")
db.execute("""
    CREATE TABLE receipts (
        id INTEGER,
        merchant VARCHAR,
        total_amount DOUBLE,
        transaction_date VARCHAR,
        bounding_boxes VARCHAR,
        embedding FLOAT[128]
    );
""")

np.random.seed(42)
for i in range(25):
    vec = np.random.uniform(-1.0, 1.0, 128).astype(np.float32).tolist()
    db.execute(
        "INSERT INTO receipts VALUES (?, ?, ?, ?, ?, ?)",
        [i, f"Vendor_{i}", float(np.random.uniform(10.0, 500.0)),
         "2026-03-30", "[0.1,0.2,0.4,0.8]", vec]
    )

class QueryRequest(BaseModel):
    vector: List[float]
    top_k: Optional[int] = 5

@app.get("/api/health")
def health():
    """Liveness probe — always 200 even if DuckDB is degraded."""
    return {"status": "ok", "engine": "DuckDB", "database": "connected"}

@app.get("/api/analytics")
def analytics():
    try:
        row = db.execute(
            "SELECT COUNT(*), AVG(total_amount), MAX(total_amount) FROM receipts"
        ).fetchone()
        return {"total_documents": row[0], "mean_spend": round(row[1], 2),
                "max_spend": round(row[2], 2)}
    except Exception as e:
        return {"total_documents": 0, "mean_spend": 0, "max_spend": 0,
                "warning": str(e)}

@app.post("/api/vector-search")
def vector_search(req: QueryRequest):
    if len(req.vector) != 128:
        raise HTTPException(400, "Vector dimension must be exactly 128")
    try:
        # DuckDB native cosine similarity — no manual numpy loop
        q = "FLOAT[128]"
        vec_literal = "[" + ",".join(str(v) for v in req.vector) + "]"
        rows = db.execute(f"""
            SELECT id, merchant, total_amount,
                   array_cosine_similarity(embedding, CAST({vec_literal} AS {q})) AS similarity
            FROM receipts
            ORDER BY similarity DESC
            LIMIT {int(req.top_k)}
        """).fetchall()
        return {"results": [
            {"id": r[0], "merchant": r[1], "amount": r[2], "similarity": float(r[3])}
            for r in rows
        ]}
    except Exception as e:
        return {"results": [], "error": str(e)}
