import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function App() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [tab, setTab] = useState('manifold');
  const threeRef = useRef(null);
  const d3Ref = useRef(null);

  // Health detection with 3s timeout — graceful fallback
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3000);
    fetch(`${API_BASE}/api/health`, { signal: c.signal })
      .then(r => {
        if (r.ok) {
          setBackendOnline(true);
          return fetch(`${API_BASE}/api/analytics`).then(r2 => r2.json());
        }
      })
      .then(d => { if (d) setAnalytics(d); })
      .catch(() => {})
      .finally(() => clearTimeout(t));
  }, []);

  // Three.js 3D vector manifold
  useEffect(() => {
    if (tab !== 'manifold' || !threeRef.current) return;
    const el = threeRef.current;
    const w = el.clientWidth, h = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 15;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const geo = new THREE.BufferGeometry();
    const count = 300;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 20;
      pos[i + 1] = (Math.random() - 0.5) * 20;
      pos[i + 2] = (Math.random() - 0.5) * 20;
      col[i] = 0.13; col[i + 1] = 0.58; col[i + 2] = 0.95;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true,
                                           transparent: true, opacity: 0.8 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let id;
    const animate = () => {
      id = requestAnimationFrame(animate);
      points.rotation.x += 0.002;
      points.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup — dispose GPU resources
    return () => {
      cancelAnimationFrame(id);
      geo.dispose(); mat.dispose(); renderer.dispose();
      el.innerHTML = '';
    };
  }, [tab]);

  // D3 pipeline diagram
  useEffect(() => {
    if (tab !== 'pipeline' || !d3Ref.current) return;
    const svg = d3.select(d3Ref.current);
    svg.selectAll('*').remove();

    const data = [
      { name: 'Document Capture', x: 50 },
      { name: 'VLM Encoder', x: 250 },
      { name: 'Spatial BBox', x: 450 },
      { name: 'HNSW Index', x: 650 }
    ];

    svg.selectAll('line').data(data.slice(0, -1)).enter()
      .append('line')
      .attr('x1', (d, i) => d.x + 140)
      .attr('y1', 60)
      .attr('x2', (d, i) => data[i + 1].x)
      .attr('y2', 60)
      .attr('stroke', '#30363d').attr('stroke-width', 2);

    const g = svg.selectAll('g').data(data).enter()
      .append('g').attr('transform', d => `translate(${d.x},30)`);
    g.append('rect').attr('width', 140).attr('height', 60)
      .attr('rx', 8).attr('fill', '#161b22')
      .attr('stroke', '#58a6ff').attr('stroke-width', 2);
    g.append('text').attr('x', 70).attr('y', 35)
      .attr('text-anchor', 'middle').attr('fill', '#c9d1d9')
      .attr('font-size', '12px').text(d => d.name);
  }, [tab]);

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#0d1117',
                  color: '#c9d1d9', minHeight: '100vh' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #30363d',
                       display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#f0f6fc' }}>
          Receipts OCR RAG Architecture Explainer
        </h2>
        <span style={{ fontSize: 12,
                       color: backendOnline ? '#3fb950' : '#d29922' }}>
          {backendOnline ? 'Backend Connected' : 'Demo Mode — Backend Offline'}
        </span>
      </header>

      <div style={{ display: 'flex', padding: 16, gap: 16 }}>
        <div style={{ width: 200 }}>
          <button onClick={() => setTab('manifold')}
                  style={{ width: '100%', padding: 10, marginBottom: 8,
                           background: tab === 'manifold' ? '#1f6beb' : 'transparent',
                           color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            3D Vector Manifold
          </button>
          <button onClick={() => setTab('pipeline')}
                  style={{ width: '100%', padding: 10, marginBottom: 8,
                           background: tab === 'pipeline' ? '#1f6beb' : 'transparent',
                           color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Processing Pipeline
          </button>
          {analytics && (
            <div style={{ fontSize: 12, marginTop: 16, lineHeight: 1.8 }}>
              <div>Documents: <strong>{analytics.total_documents}</strong></div>
              <div>Mean Spend: <strong>${analytics.mean_spend}</strong></div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 400, position: 'relative' }}>
          {tab === 'manifold' && <div ref={threeRef} style={{ width: '100%', height: 400 }} />}
          {tab === 'pipeline' && (
            <svg ref={d3Ref} style={{ width: '100%', height: 300 }} />
          )}
        </div>
      </div>
    </div>
  );
}
