import React, { useEffect, useRef, useState } from "react";
import { Card, Form, Button, Row, Col, Alert, Badge } from "react-bootstrap";
import * as worlds from "../../net/worlds";
import { stallLayout } from "./hallLayout";

// ===========================================================================
// POSITIONS DES STANDS : placement a la souris (drag & drop) sur la grille du
// monde courant. Les positions sont enregistrees dans world.standPositions et
// remplacent la grille automatique 5xN (hallLayout) dans le hall 3D et le plan.
// Permet aussi d IMPORTER un plan de foire JSON (positions issues d un autre
// logiciel) : [{ stallId, x, z, rotY }].
// ===========================================================================
const SX = 600 / 84; // meme projection que le plan (marge 2 m)

export default function StallPlacement() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState("");
  const [stalls, setStalls] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ve.demoStalls") || "[]"); } catch (e) { return []; }
  });
  const svgRef = useRef(null);
  const dragId = useRef(null);

  useEffect(() => {
    worlds.ensureDefaultWorld().then(() => {
      const ws = worlds.getWorlds();
      setList(ws);
      setSel(worlds.getCurrentWorldId() || (ws[0] && ws[0].id) || "hub");
    });
  }, []);

  const current = list.find((w) => w.id === sel) || list[0] || null;
  const floor = (current && current.floor) || { sizeX: 80, sizeZ: 40 };
  const toSvg = (x, z) => [((x + floor.sizeX / 2 + 2) / (floor.sizeX + 4)) * 600,
                           ((z + floor.sizeZ / 2 + 2) / (floor.sizeZ + 4)) * 600];
  const fromSvg = (px, py) => [((px / 600) * (floor.sizeX + 4)) - floor.sizeX / 2 - 2,
                               ((py / 600) * (floor.sizeZ + 4)) - floor.sizeZ / 2 - 2];

  const positions = (current && current.standPositions) || {};

  const posOf = (i, stallId) => {
    if (positions[stallId]) return [positions[stallId].x, positions[stallId].z];
    return stallLayout(i, Math.max(stalls.length, 1));
  };

  const savePos = async (stallId, x, z, rotY) => {
    const next = list.map((w) => (w.id === current.id
      ? { ...w, standPositions: { ...(w.standPositions || {}), [stallId]: { x, z, rotY: rotY || 0 } } }
      : w));
    setList(next);
    await worlds.save({ worlds: next });
  };

  const resetAll = async () => {
    const next = list.map((w) => (w.id === current.id ? { ...w, standPositions: {} } : w));
    setList(next);
    await worlds.save({ worlds: next });
  };

  // Import d un plan de foire (JSON exporte d un autre logiciel).
  const importPlan = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const txt = await f.text();
      const data = JSON.parse(txt);
      const sp = {};
      for (const s of (data.stands || [])) {
        if (!s.stallId) continue;
        sp[s.stallId] = { x: Number(s.x) || 0, z: Number(s.z) || 0, rotY: Number(s.rotY) || 0 };
      }
      const next = list.map((w) => (w.id === current.id ? { ...w, standPositions: sp } : w));
      setList(next);
      await worlds.save({ worlds: next });
      if (data.landscapeUrl) {
        const next2 = next.map((w) => (w.id === current.id ? { ...w, landscapeUrl: data.landscapeUrl } : w));
        setList(next2);
        await worlds.save({ worlds: next2 });
      }
      alert("Plan importé : " + Object.keys(sp).length + " stands positionnés.");
    } catch (err) {
      alert("Fichier JSON invalide.");
    }
  };

  const downloadTemplate = () => {
    const tpl = {
      landscapeUrl: "/worlds/hall.glb",
      stands: (stalls.length ? stalls : [{ stallId: "expo-01", stallName: "Exemple" }])
        .map((s, i) => ({ stallId: s.stallId, name: s.stallName || s.stallId, x: 0, z: i * 9 - 18, rotY: 0 })),
    };
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plan-foire.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const onMove = (evt) => {
    if (!dragId.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * 600;
    const py = ((evt.clientY - rect.top) / rect.height) * 600;
    const [x, z] = fromSvg(px, py);
    savePos(dragId.current, Math.round(x * 2) / 2, Math.round(z * 2) / 2, (positions[dragId.current] || {}).rotY || 0);
  };

  return (
    <div>
      <Alert variant="info" style={{ fontSize: 13 }}>
        Glissez les pastilles pour <strong>placer les stands</strong> librement sur la
        grille du monde (ou importez un plan JSON d&apos;un autre logiciel).
      </Alert>
      <Row className="g-2 mb-2">
        <Col md={4}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Monde</div>
          <Form.Select size="sm" style={{ background: "#0b1020", color: "#e2e8f0", border: "1px solid #334155" }}
            value={sel} onChange={(e) => setSel(e.target.value)}>
            {list.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
          </Form.Select>
        </Col>
        <Col md={3}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Stands (JSON local ou demo)</div>
          <Form.Control size="sm" as="textarea" rows={2}
            style={{ background: "#0b1020", color: "#e2e8f0", border: "1px solid #334155", fontSize: 11 }}
            placeholder='[{"stallId":"expo-01","stallName":"NovaLabs"}]'
            defaultValue={JSON.stringify(stalls)}
            onChange={(e) => { try { const v = JSON.parse(e.target.value); if (Array.isArray(v)) { setStalls(v); localStorage.setItem("ve.demoStalls", JSON.stringify(v)); } } catch (err) { /* saisie en cours */ } }} />
        </Col>
        <Col md={5} className="d-flex align-items-end" style={{ gap: 6 }}>
          <input type="file" accept=".json" onChange={importPlan} style={{ fontSize: 12, color: "#94a3b8" }} />
          <Button size="sm" variant="outline-light" onClick={downloadTemplate}>⬇️ Modèle JSON</Button>
          <Button size="sm" variant="outline-danger" onClick={resetAll}>↺ Réinitialiser</Button>
        </Col>
      </Row>

      <Card style={{ background: "#0b1020", border: "1px solid #334155" }}>
        <Card.Body>
          <svg ref={svgRef} viewBox="0 0 600 600" width="100%" height={520}
            style={{ background: "#0f172a", borderRadius: 8, touchAction: "none" }}
            onMouseMove={onMove}
            onMouseUp={() => { dragId.current = null; }}
            onMouseLeave={() => { dragId.current = null; }}>
            {/* Grille */}
            {Array.from({ length: 21 }, (_, i) => (
              <line key={"gx" + i} x1={(i * 600) / 20} y1={0} x2={(i * 600) / 20} y2={600} stroke="#1e293b" strokeWidth="1" />
            ))}
            {Array.from({ length: 21 }, (_, i) => (
              <line key={"gz" + i} x1={0} y1={(i * 600) / 20} x2={600} y2={(i * 600) / 20} stroke="#1e293b" strokeWidth="1" />
            ))}
            {/* Axes + reperes de coordonnees */}
            <line x1={300} y1={0} x2={300} y2={600} stroke="#475569" strokeDasharray="4 4" />
            <line x1={0} y1={300} x2={600} y2={300} stroke="#475569" strokeDasharray="4 4" />
            <text x={305} y={14} fill="#64748b" fontSize={11}>+X</text>
            <text x={305} y={594} fill="#64748b" fontSize={11}>+Z</text>
            {/* Portes du monde */}
            {((current && current.doors) || []).map((d) => {
              const [dx, dz] = toSvg(d.x, d.z);
              return <rect key={d.id} x={dx - 8} y={dz - 8} width={16} height={16} fill="#22d3ee" opacity={0.7} rx={3} />;
            })}
            {/* Stands deplacables */}
            {(stalls.length ? stalls : []).map((s, i) => {
              const [x, z] = posOf(i, s.stallId);
              const [px, pz] = toSvg(x, z);
              return (
                <g key={s.stallId} transform={`translate(${px} ${pz})`} style={{ cursor: "grab" }}
                  onMouseDown={(e) => { e.preventDefault(); dragId.current = s.stallId; }}>
                  <circle r={11} fill="#0d6efd" opacity={0.85} />
                  <text y={4} textAnchor="middle" fill="#fff" fontSize={10}>{i + 1}</text>
                  <text y={26} textAnchor="middle" fill="#cbd5e1" fontSize={10}>{s.stallName || s.stallId}</text>
                </g>
              );
            })}
          </svg>
          <div className="mt-2">
            <Badge bg="secondary">{Object.keys(positions).length} stand(s) repositionné(s)</Badge>
            <span className="text-muted ml-2" style={{ fontSize: 12 }}>
              Sol : {floor.sizeX} × {floor.sizeZ} m — glissez-déposez, les coordonnées sont enregistrées automatiquement.
            </span>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
