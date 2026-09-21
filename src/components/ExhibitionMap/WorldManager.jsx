import React, { useEffect, useState } from "react";
import { Card, Form, Button, Row, Col, Table, Badge, Alert } from "react-bootstrap";
import * as worlds from "../../net/worlds";
import { uploadFile } from "../../net/upload";

// ===========================================================================
// MONDE & PORTES (Hall Builder) : creation de pavillons/halls modulaires,
// import du paysage GLB (concu dans un logiciel 3D externe), et PORTES de
// transit vers un autre univers (chargement au franchissement).
// ===========================================================================
const inputStyle = { background: "#0b1020", color: "#e2e8f0", border: "1px solid #334155" };
const label = { color: "#94a3b8", fontSize: 12, marginBottom: 2 };

function Num({ label: l, value, onChange, step = 1 }) {
  return (
    <div>
      <div style={label}>{l}</div>
      <Form.Control size="sm" type="number" step={step} style={inputStyle} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function WorldManager() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState("hub");
  const [busy, setBusy] = useState("");
  const [newWorld, setNewWorld] = useState({ id: "", name: "" });
  const [newDoor, setNewDoor] = useState({ label: "", x: 0, z: -18, width: 4, height: 5, targetWorldId: "", spawnX: 0, spawnZ: 0, spawnHeading: 0 });

  const refresh = async () => {
    await worlds.ensureDefaultWorld();
    setList(worlds.getWorlds());
  };
  useEffect(() => { refresh(); }, []);

  const current = list.find((w) => w.id === sel) || list[0] || null;

  const saveWorld = async (patch) => {
    const next = list.map((w) => (w.id === current.id ? { ...w, ...patch } : w));
    setList(next);
    await worlds.save({ worlds: next });
  };

  const addWorld = async () => {
    if (!newWorld.id) return;
    const next = [...list, {
      id: newWorld.id.replace(/[^a-z0-9-_]/gi, "-").toLowerCase(),
      name: newWorld.name || newWorld.id,
      floor: { sizeX: 80, sizeZ: 40, color: "#1a2340" },
      walls: { height: 12, invisibleForTPS: true },
      doors: [], objects: [], standPositions: {},
    }];
    setList(next);
    await worlds.save({ worlds: next });
    setNewWorld({ id: "", name: "" });
  };

  // Import du paysage GLB (upload -> /_imgout/uploads/...).
  const onLandscape = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBusy("Upload du paysage…");
    try {
      const r = await uploadFile(f);
      await saveWorld({ landscapeUrl: r.url });
    } catch (err) {
      alert("Upload impossible : " + err.message);
    }
    setBusy("");
  };

  const addDoor = async () => {
    if (!newDoor.targetWorldId) return;
    const doors = [...(current.doors || []), { ...newDoor, id: "door-" + Date.now().toString(36) }];
    await saveWorld({ doors });
    setNewDoor({ ...newDoor, label: "" });
  };

  const removeDoor = async (id) => {
    await saveWorld({ doors: (current.doors || []).filter((d) => d.id !== id) });
  };

  return (
    <div>
      <Alert variant="info" style={{ fontSize: 13 }}>
        Conception <strong>modulaire</strong> : chaque <em>monde</em> (hall, pavillon)
        a son paysage, ses stands et ses <strong>portes de transit</strong>. Franchir
        une porte charge l&apos;univers cible et place l&apos;avatar au point d&apos;arrivée.
      </Alert>

      <Row className="g-2 mb-3">
        <Col md={3}>
          <div style={label}>Monde courant</div>
          <Form.Select size="sm" style={inputStyle} value={sel} onChange={(e) => setSel(e.target.value)}>
            {list.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
          </Form.Select>
        </Col>
        <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="id du nouveau monde (ex: pavillon-tech)" value={newWorld.id} onChange={(e) => setNewWorld({ ...newWorld, id: e.target.value })} /></Col>
        <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="Nom affiché" value={newWorld.name} onChange={(e) => setNewWorld({ ...newWorld, name: e.target.value })} /></Col>
        <Col md={3}><Button size="sm" variant="primary" className="w-100" onClick={addWorld}>➕ Créer le monde</Button></Col>
      </Row>

      {current && (
        <Card style={{ background: "#0b1020", border: "1px solid #334155" }} className="mb-3">
          <Card.Body>
            <strong>🌍 {current.name}</strong>
            <Row className="g-2 mt-2">
              <Col md={6}>
                <div style={label}>Paysage importé (GLB d&apos;un logiciel 3D)</div>
                <Form.Control size="sm" style={inputStyle} value={current.landscapeUrl || ""}
                  placeholder="/_imgout/uploads/... ou /worlds/hall.glb"
                  onChange={(e) => saveWorld({ landscapeUrl: e.target.value })} />
              </Col>
              <Col md={3}>
                <div style={label}>Importer un fichier</div>
                <input type="file" accept=".glb,.gltf" onChange={onLandscape} style={{ fontSize: 12, color: "#94a3b8" }} />
              </Col>
              <Col md={3}>
                <div style={label}>&nbsp;</div>
                <Button size="sm" variant="outline-light" className="w-100"
                  onClick={() => saveWorld({ landscapeUrl: "" })}>Retirer le paysage</Button>
              </Col>
            </Row>
            <Row className="g-2 mt-2">
              <Col><Num label="Sol X" value={current.floor ? current.floor.sizeX : 80} onChange={(v) => saveWorld({ floor: { ...(current.floor || {}), sizeX: v } })} /></Col>
              <Col><Num label="Sol Z" value={current.floor ? current.floor.sizeZ : 40} onChange={(v) => saveWorld({ floor: { ...(current.floor || {}), sizeZ: v } })} /></Col>
              <Col><Num label="Hauteur murs" value={current.walls ? current.walls.height : 12} onChange={(v) => saveWorld({ walls: { ...(current.walls || {}), height: v } })} /></Col>
            </Row>
            {busy && <Badge bg="warning" className="mt-2">{busy}</Badge>}
          </Card.Body>
        </Card>
      )}

      {/* ---------------- PORTES DE TRANSIT ---------------- */}
      {current && (
        <Card style={{ background: "#0b1020", border: "1px solid #334155" }}>
          <Card.Body>
            <strong>🚪 Portes de transit</strong>
            <Row className="g-2 mt-2">
              <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="Libellé (ex: Pavillon Tech)" value={newDoor.label} onChange={(e) => setNewDoor({ ...newDoor, label: e.target.value })} /></Col>
              <Col md={3}>
                <Form.Select size="sm" style={inputStyle} value={newDoor.targetWorldId} onChange={(e) => setNewDoor({ ...newDoor, targetWorldId: e.target.value })}>
                  <option value="">— Monde cible —</option>
                  {list.filter((w) => w.id !== current.id).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}><Num label="x" value={newDoor.x} step={0.5} onChange={(v) => setNewDoor({ ...newDoor, x: v })} /></Col>
              <Col md={2}><Num label="z" value={newDoor.z} step={0.5} onChange={(v) => setNewDoor({ ...newDoor, z: v })} /></Col>
              <Col md={2}><Button size="sm" variant="primary" className="w-100" onClick={addDoor}>➕ Ajouter</Button></Col>
            </Row>
            <Row className="g-2 mt-1">
              <Col><Num label="Largeur" value={newDoor.width} step={0.5} onChange={(v) => setNewDoor({ ...newDoor, width: v })} /></Col>
              <Col><Num label="Hauteur" value={newDoor.height} step={0.5} onChange={(v) => setNewDoor({ ...newDoor, height: v })} /></Col>
              <Col><Num label="Spawn X (arrivée)" value={newDoor.spawnX} step={0.5} onChange={(v) => setNewDoor({ ...newDoor, spawnX: v })} /></Col>
              <Col><Num label="Spawn Z (arrivée)" value={newDoor.spawnZ} step={0.5} onChange={(v) => setNewDoor({ ...newDoor, spawnZ: v })} /></Col>
              <Col><Num label="Cap (rad)" value={newDoor.spawnHeading} step={0.1} onChange={(v) => setNewDoor({ ...newDoor, spawnHeading: v })} /></Col>
            </Row>
            <Table size="sm" variant="dark" className="mt-3" style={{ fontSize: 12 }}>
              <thead><tr><th>Libellé</th><th>Cible</th><th>x</th><th>z</th><th>Taille</th><th>Spawn</th><th></th></tr></thead>
              <tbody>
                {(current.doors || []).map((d) => (
                  <tr key={d.id}>
                    <td>{d.label || d.id}</td>
                    <td>{d.targetWorldId}</td>
                    <td>{d.x}</td>
                    <td>{d.z}</td>
                    <td>{d.width}×{d.height}</td>
                    <td>({d.spawnX}, {d.spawnZ})</td>
                    <td><Button size="sm" variant="outline-danger" onClick={() => removeDoor(d.id)}>✕</Button></td>
                  </tr>
                ))}
                {!(current.doors || []).length && <tr><td colSpan={7} className="text-muted text-center">Aucune porte</td></tr>}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
