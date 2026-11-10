RECEIPTS OCR RAG ARCHITECTURE EXPLAINER
========================================
Interactive 3D WebGL / D3 visualization of modern Vision-Language
document intelligence pipelines, deployed to GitHub Pages.

OVERVIEW
--------
This project audits and visualizes the academic architecture described in
the reference transcript: multimodal Transformer embeddings, HNSW vector
search, and DuckDB vectorized OLAP analytics. The frontend auto-detects
the Docker backend and degrades gracefully to a demo mode when the
backend is unreachable.

ARCHITECTURE
------------
- Visual Engine: Three.js (3D vector manifold) + D3.js (pipeline DAG)
- Analytics Backend: FastAPI + DuckDB with array_cosine_similarity()
- Deployment: GitHub Pages (gh-pages branch) + optional Docker backend

PREREQUISITES
-------------
- Node.js >= 18, npm
- gh CLI authenticated with 'repo' scope:  gh auth refresh -s repo
- Docker (optional, for live backend)
- Modern browser with WebGL 2.0

QUICK START (ONE-SHOT)
----------------------
  bash build_and_deploy.sh

The script creates the GitHub repo, deploys the Pages site, and builds the
Docker backend. Re-run any time — it is idempotent.

BACKEND (OPTIONAL)
------------------
  docker compose up -d
  curl http://localhost:8000/api/health
  # -> {"status":"ok"}

GRACEFUL DEGRADATION
--------------------
- Backend reachable  -> full 3D manifold + live vector search
- Backend unreachable -> demo mode banner, static D3 pipeline only
- Proxmox-free backend works with empty .env (health always returns 200)

LICENSE
-------
MIT
