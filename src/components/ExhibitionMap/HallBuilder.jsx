import React, { useEffect, useState } from "react";
import { Card, Form, Button, Row, Col, Nav, Tab, Badge, Alert, Table } from "react-bootstrap";
import * as hallConfig from "../../net/hallConfig";
import { HALL, hallZones } from "./hallLayout";
import WorldManager from "./WorldManager";
import StallPlacement from "./StallPlacement";
import { uploadFile } from "../../net/upload";

// ===========================================================================
// HALL BUILDER (menu admin) : editeur complet de la geometrie de l exposition.
//
// Onglets :
//  - Perimetre & Grille : dimensions du sol, pas du quadrillage (x,y,z)
//  - Sol / Murs / Plafond : modeles + hauteur des murs + murs invisibles (TPS)
//  - Objets 3D : placement libre par coordonnees de la grille
//  - Zones audio : cubiques redimensionnables (sections map + par rangee + stand)
//  - Avatars : import de nouveaux modeles
// ===========================================================================

const inputStyle = { background: "#0b1020", color: "#e2e8f0", border: "1px solid #334155" };
const labelStyle = { color: "#94a3b8", fontSize: 12, marginBottom: 2 };

function Num({ label, value, onChange, step = 1, min, max }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <Form.Control
        size="sm"
        type="number"
        style={inputStyle}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", height: 32, border: "1px solid #334155", borderRadius: 6, background: "#0b1020" }}
      />
    </div>
  );
}

const MODEL_CHOICES = {
  floor: [
    { v: "flat", l: "Plat (couleur)" },
    { v: "checker", l: "Damier" },
    { v: "wood", l: "Parquet" },
    { v: "marble", l: "Marbre" },
  ],
  walls: [
    { v: "box", l: "Pleins (couleur)" },
    { v: "glass", l: "Verre" },
    { v: "curtain", l: "Rideau" },
  ],
  ceiling: [
    { v: "flat", l: "Plat (couleur)" },
    { v: "beams", l: "Poutres" },
    { v: "sky", l: "Ciel ouvert" },
  ],
};

export default function HallBuilder() {
  const [cfg, setCfg] = useState(hallConfig.get());
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("perimeter");
  const [newObj, setNewObj] = useState({ name: "", url: "", kind: "model", x: 0, y: 0, z: 0, scale: 1, rotY: 0, interactUrl: "" });
  const [newZone, setNewZone] = useState({ name: "", x: 0, y: 0, z: 0, sizeX: 10, sizeY: 6, sizeZ: 10, sourceStallId: "" });
  const [newAv, setNewAv] = useState({ name: "", url: "" });

  useEffect(() => {
    hallConfig.load();
    return hallConfig.onChange(setCfg);
  }, []);

  const save = async (part) => {
    await hallConfig.patch(part);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const rows = Math.max(1, Math.ceil((cfg.__stallCount || 20) / 5));

  return (
    <Card style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155" }}>
      <Card.Header className="d-flex justify-content-between align-items-center" style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}>
        <strong>🏗️ Hall Builder — Conception de l&apos;espace d&apos;exposition</strong>
        {saved && <Badge bg="success">Enregistré ✓</Badge>}
      </Card.Header>
      <Card.Body>
        <Tab.Container activeKey={tab} onSelect={setTab}>
          <Nav variant="tabs" className="mb-3" style={{ borderBottomColor: "#334155" }}>
            {[
              ["perimeter", "📐 Périmètre & Grille"],
              ["shell", "🧱 Sol / Murs / Plafond"],
              ["objects", "📦 Objets 3D"],
              ["audio", "🔊 Zones audio"],
              ["avatars", "🧍 Avatars"],
              ["worlds", "🌍 Monde & Portes"],
              ["placement", "🗺️ Positions des stands"],
            ].map(([k, l]) => (
              <Nav.Item key={k}>
                <Nav.Link eventKey={k} style={{ color: tab === k ? "#fff" : "#94a3b8", background: tab === k ? "#334155" : "transparent", border: "none" }}>
                  {l}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>

          <Tab.Content>
            {/* -------------------- PERIMETRE & GRILLE -------------------- */}
            <Tab.Pane eventKey="perimeter">
              <Alert variant="info" style={{ fontSize: 13 }}>
                Définissez le <strong>périmètre total du sol</strong> et le pas du
                quadrillage. Toutes les coordonnées (x, y, z) des objets et zones
                audio utilisent cette grille.
              </Alert>
              <Row className="g-3">
                <Col md={3}><Num label="Sol — Longueur X (m)" value={cfg.floor.sizeX} min={10} max={500} onChange={(v) => save({ floor: { ...cfg.floor, sizeX: v } })} /></Col>
                <Col md={3}><Num label="Sol — Profondeur Z (m)" value={cfg.floor.sizeZ} min={10} max={500} onChange={(v) => save({ floor: { ...cfg.floor, sizeZ: v } })} /></Col>
                <Col md={3}><Num label="Pas du quadrillage (m)" value={cfg.grid.step} step={0.5} min={0.5} max={20} onChange={(v) => save({ grid: { ...cfg.grid, step: v } })} /></Col>
                <Col md={3}>
                  <div style={labelStyle}>Quadrillage visible</div>
                  <Form.Check
                    type="switch"
                    label={cfg.grid.show ? "Oui" : "Non"}
                    checked={cfg.grid.show}
                    onChange={(e) => save({ grid: { ...cfg.grid, show: e.target.checked } })}
                  />
                </Col>
              </Row>
              <hr style={{ borderColor: "#334155" }} />
              <Row className="g-3">
                <Col md={3}><Num label="Allée — Largeur (m)" value={cfg.aisle.width} min={0} max={100} onChange={(v) => save({ aisle: { ...cfg.aisle, width: v } })} /></Col>
                <Col md={3}><Num label="Allée — Longueur (m)" value={cfg.aisle.length} min={0} max={200} onChange={(v) => save({ aisle: { ...cfg.aisle, length: v } })} /></Col>
                <Col md={3}><ColorField label="Allée — Couleur" value={cfg.aisle.color} onChange={(v) => save({ aisle: { ...cfg.aisle, color: v } })} /></Col>
              </Row>
              <small className="text-muted d-block mt-3">
                Grille : X de −{cfg.floor.sizeX / 2} à +{cfg.floor.sizeX / 2} • Z de −{cfg.floor.sizeZ / 2} à +{cfg.floor.sizeZ / 2} • pas {cfg.grid.step} m
              </small>
            </Tab.Pane>

            {/* -------------------- SOL / MURS / PLAFOND -------------------- */}
            <Tab.Pane eventKey="shell">
              <Row className="g-3">
                <Col md={4}>
                  <Card style={{ background: "#0b1020", border: "1px solid #334155" }}>
                    <Card.Body>
                      <strong>🟫 Sol</strong>
                      <div className="mt-2">
                        <div style={labelStyle}>Modèle</div>
                        <Form.Select size="sm" style={inputStyle} value={cfg.floor.model} onChange={(e) => save({ floor: { ...cfg.floor, model: e.target.value } })}>
                          {MODEL_CHOICES.floor.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                        </Form.Select>
                      </div>
                      <div className="mt-2"><ColorField label="Couleur" value={cfg.floor.color} onChange={(v) => save({ floor: { ...cfg.floor, color: v } })} /></div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card style={{ background: "#0b1020", border: "1px solid #334155" }}>
                    <Card.Body>
                      <strong>🧱 Murs</strong>
                      <div className="mt-2">
                        <div style={labelStyle}>Modèle</div>
                        <Form.Select size="sm" style={inputStyle} value={cfg.walls.model} onChange={(e) => save({ walls: { ...cfg.walls, model: e.target.value } })}>
                          {MODEL_CHOICES.walls.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                        </Form.Select>
                      </div>
                      <div className="mt-2"><Num label="Hauteur des murs (m)" value={cfg.walls.height} step={0.5} min={2} max={60} onChange={(v) => save({ walls: { ...cfg.walls, height: v } })} /></div>
                      <div className="mt-2"><Num label="Épaisseur (m)" value={cfg.walls.thickness} step={0.1} min={0.1} max={5} onChange={(v) => save({ walls: { ...cfg.walls, thickness: v } })} /></div>
                      <div className="mt-2"><ColorField label="Couleur" value={cfg.walls.color} onChange={(v) => save({ walls: { ...cfg.walls, color: v } })} /></div>
                      <Form.Check
                        className="mt-2"
                        type="switch"
                        label="Invisible en 3ᵉ personne (hors périmètre)"
                        checked={cfg.walls.invisibleForTPS}
                        onChange={(e) => save({ walls: { ...cfg.walls, invisibleForTPS: e.target.checked } })}
                      />
                      <small className="text-muted">Évite la vue sombre quand la caméra sort du hall.</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card style={{ background: "#0b1020", border: "1px solid #334155" }}>
                    <Card.Body>
                      <strong>⬜ Plafond</strong>
                      <Form.Check
                        className="mt-2"
                        type="switch"
                        label="Activé"
                        checked={cfg.ceiling.enabled}
                        onChange={(e) => save({ ceiling: { ...cfg.ceiling, enabled: e.target.checked } })}
                      />
                      {cfg.ceiling.enabled && (
                        <>
                          <div className="mt-2">
                            <div style={labelStyle}>Modèle</div>
                            <Form.Select size="sm" style={inputStyle} value={cfg.ceiling.model} onChange={(e) => save({ ceiling: { ...cfg.ceiling, model: e.target.value } })}>
                              {MODEL_CHOICES.ceiling.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </Form.Select>
                          </div>
                          <div className="mt-2"><Num label="Hauteur (m)" value={cfg.ceiling.height} step={0.5} min={3} max={100} onChange={(v) => save({ ceiling: { ...cfg.ceiling, height: v } })} /></div>
                          <div className="mt-2"><ColorField label="Couleur" value={cfg.ceiling.color} onChange={(v) => save({ ceiling: { ...cfg.ceiling, color: v } })} /></div>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab.Pane>

            {/* -------------------- OBJETS 3D -------------------- */}
            <Tab.Pane eventKey="objects">
              <Alert variant="info" style={{ fontSize: 13 }}>
                Placez des objets 3D <strong>statiques ou interactifs</strong> par
                coordonnées de la grille (x, y, z). glTF/GLB pour un modèle, URL pour
                un contenu interactif.
              </Alert>
              <Card style={{ background: "#0b1020", border: "1px solid #334155" }} className="mb-3">
                <Card.Body>
                  <strong>➕ Nouvel objet</strong>
                  <Row className="g-2 mt-1">
                    <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="Nom" value={newObj.name} onChange={(e) => setNewObj({ ...newObj, name: e.target.value })} /></Col>
                    <Col md={5}><Form.Control size="sm" style={inputStyle} placeholder="URL (.glb/.gltf ou page web)" value={newObj.url} onChange={(e) => setNewObj({ ...newObj, url: e.target.value })} /></Col>
                    <Col md={2}>
                      <Form.Select size="sm" style={inputStyle} value={newObj.kind} onChange={(e) => setNewObj({ ...newObj, kind: e.target.value })}>
                        <option value="model">Modèle 3D</option>
                        <option value="interactive">Interactif</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Button size="sm" variant="primary" className="w-100" onClick={async () => {
                        if (!newObj.url) return;
                        await hallConfig.addObject({ ...newObj, id: "obj-" + Date.now().toString(36) });
                        setNewObj({ name: "", url: "", kind: "model", x: 0, y: 0, z: 0, scale: 1, rotY: 0, interactUrl: "" });
                      }}>Ajouter</Button>
                    </Col>
                  </Row>
                  <Row className="g-2 mt-1">
                    <Col><Num label="x" value={newObj.x} step={0.5} onChange={(v) => setNewObj({ ...newObj, x: v })} /></Col>
                    <Col><Num label="y" value={newObj.y} step={0.5} onChange={(v) => setNewObj({ ...newObj, y: v })} /></Col>
                    <Col><Num label="z" value={newObj.z} step={0.5} onChange={(v) => setNewObj({ ...newObj, z: v })} /></Col>
                    <Col><Num label="Échelle" value={newObj.scale} step={0.1} min={0.1} max={20} onChange={(v) => setNewObj({ ...newObj, scale: v })} /></Col>
                    <Col><Num label="Rotation Y°" value={newObj.rotY} step={5} min={-180} max={180} onChange={(v) => setNewObj({ ...newObj, rotY: v })} /></Col>
                  </Row>
                  {newObj.kind === "model" && (
                    <Form.Control className="mt-2" size="sm" style={inputStyle} placeholder="URL interactive (optionnel — rend le modèle cliquable)" value={newObj.interactUrl} onChange={(e) => setNewObj({ ...newObj, interactUrl: e.target.value })} />
                  )}
                </Card.Body>
              </Card>

              <Table size="sm" variant="dark" responsive style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>Nom</th><th>Type</th><th>x</th><th>y</th><th>z</th><th>Éch.</th><th>Rot°</th><th></th></tr>
                </thead>
                <tbody>
                  {(cfg.objects || []).map((o) => (
                    <tr key={o.id}>
                      <td>{o.name || o.id}</td>
                      <td>{o.kind === "interactive" ? "✨" : "📦"}</td>
                      <td><Form.Control size="sm" style={{ ...inputStyle, width: 60 }} type="number" step={0.5} value={o.x} onChange={(e) => hallConfig.updateObject(o.id, { x: Number(e.target.value) })} /></td>
                      <td><Form.Control size="sm" style={{ ...inputStyle, width: 60 }} type="number" step={0.5} value={o.y} onChange={(e) => hallConfig.updateObject(o.id, { y: Number(e.target.value) })} /></td>
                      <td><Form.Control size="sm" style={{ ...inputStyle, width: 60 }} type="number" step={0.5} value={o.z} onChange={(e) => hallConfig.updateObject(o.id, { z: Number(e.target.value) })} /></td>
                      <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.1} value={o.scale} onChange={(e) => hallConfig.updateObject(o.id, { scale: Number(e.target.value) })} /></td>
                      <td><Form.Control size="sm" style={{ ...inputStyle, width: 60 }} type="number" step={5} value={o.rotY} onChange={(e) => hallConfig.updateObject(o.id, { rotY: Number(e.target.value) })} /></td>
                      <td><Button size="sm" variant="outline-danger" onClick={() => hallConfig.removeObject(o.id)}>✕</Button></td>
                    </tr>
                  ))}
                  {!(cfg.objects || []).length && <tr><td colSpan={8} className="text-muted text-center">Aucun objet placé</td></tr>}
                </tbody>
              </Table>
            </Tab.Pane>

            {/* -------------------- ZONES AUDIO -------------------- */}
            <Tab.Pane eventKey="audio">
              <Alert variant="info" style={{ fontSize: 13 }}>
                Zones audio <strong>cubiques et redimensionnables</strong>. Une zone
                peut être <strong>liée à un visuel 2D d&apos;un stand</strong> (sa vidéo /
                son audio devient la source) ou diffuser une ambiance. Il existe
                aussi une zone par <strong>rangée de stands</strong>.
              </Alert>

              {/* Zones globales (sections de la map) */}
              <Card style={{ background: "#0b1020", border: "1px solid #334155" }} className="mb-3">
                <Card.Body>
                  <strong>🔊 Zones audio de sections de la map</strong>
                  <Row className="g-2 mt-1">
                    <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="Nom de la zone" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} /></Col>
                    <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="Liée au stand (stallId, optionnel)" value={newZone.sourceStallId} onChange={(e) => setNewZone({ ...newZone, sourceStallId: e.target.value })} /></Col>
                    <Col md={6}>
                      <Button size="sm" variant="primary" onClick={async () => {
                        await hallConfig.addGlobalAudioZone({ ...newZone, id: "zone-" + Date.now().toString(36) });
                        setNewZone({ name: "", x: 0, y: 0, z: 0, sizeX: 10, sizeY: 6, sizeZ: 10, sourceStallId: "" });
                      }}>➕ Ajouter la zone cubique</Button>
                    </Col>
                  </Row>
                  <Row className="g-2 mt-1">
                    <Col><Num label="x" value={newZone.x} step={0.5} onChange={(v) => setNewZone({ ...newZone, x: v })} /></Col>
                    <Col><Num label="y" value={newZone.y} step={0.5} onChange={(v) => setNewZone({ ...newZone, y: v })} /></Col>
                    <Col><Num label="z" value={newZone.z} step={0.5} onChange={(v) => setNewZone({ ...newZone, z: v })} /></Col>
                    <Col><Num label="Taille X" value={newZone.sizeX} step={0.5} min={0.5} onChange={(v) => setNewZone({ ...newZone, sizeX: v })} /></Col>
                    <Col><Num label="Taille Y" value={newZone.sizeY} step={0.5} min={0.5} onChange={(v) => setNewZone({ ...newZone, sizeY: v })} /></Col>
                    <Col><Num label="Taille Z" value={newZone.sizeZ} step={0.5} min={0.5} onChange={(v) => setNewZone({ ...newZone, sizeZ: v })} /></Col>
                  </Row>

                  <Table size="sm" variant="dark" responsive className="mt-3" style={{ fontSize: 12 }}>
                    <thead>
                      <tr><th>Zone</th><th>Source</th><th>x</th><th>y</th><th>z</th><th>SX</th><th>SY</th><th>SZ</th><th></th></tr>
                    </thead>
                    <tbody>
                      {(cfg.globalAudioZones || []).map((z) => (
                        <tr key={z.id}>
                          <td>{z.name || z.id}</td>
                          <td>{z.sourceStallId ? `🔗 ${z.sourceStallId}` : "🎵 ambiance"}</td>
                          <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.5} value={z.x} onChange={(e) => hallConfig.updateGlobalAudioZone(z.id, { x: Number(e.target.value) })} /></td>
                          <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.5} value={z.y} onChange={(e) => hallConfig.updateGlobalAudioZone(z.id, { y: Number(e.target.value) })} /></td>
                          <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.5} value={z.z} onChange={(e) => hallConfig.updateGlobalAudioZone(z.id, { z: Number(e.target.value) })} /></td>
                          <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.5} value={z.sizeX} onChange={(e) => hallConfig.updateGlobalAudioZone(z.id, { sizeX: Number(e.target.value) })} /></td>
                          <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.5} value={z.sizeY} onChange={(e) => hallConfig.updateGlobalAudioZone(z.id, { sizeY: Number(e.target.value) })} /></td>
                          <td><Form.Control size="sm" style={{ ...inputStyle, width: 55 }} type="number" step={0.5} value={z.sizeZ} onChange={(e) => hallConfig.updateGlobalAudioZone(z.id, { sizeZ: Number(e.target.value) })} /></td>
                          <td><Button size="sm" variant="outline-danger" onClick={() => hallConfig.removeGlobalAudioZone(z.id)}>✕</Button></td>
                        </tr>
                      ))}
                      {!(cfg.globalAudioZones || []).length && <tr><td colSpan={9} className="text-muted text-center">Aucune zone de section</td></tr>}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              {/* Zones par rangee */}
              <Card style={{ background: "#0b1020", border: "1px solid #334155" }}>
                <Card.Body>
                  <strong>🎚️ Zone audio par rangée de stands</strong>
                  <small className="text-muted d-block mb-2">
                    Activez une zone cubique pour une rangée : la voix / les médias
                    portent sur toute la rangée.
                  </small>
                  {Array.from({ length: rows }, (_, r) => {
                    const zone = (cfg.rowAudioZones || {})[r];
                    return (
                      <div key={r} className="d-flex align-items-center mb-2" style={{ gap: 8 }}>
                        <Form.Check
                          type="switch"
                          label={`Rangée ${r + 1}`}
                          checked={!!zone}
                          onChange={async (e) => {
                            if (e.target.checked) {
                              const zc = hallZones(20).find((z) => z.id === `row-${r}`) || { x: 0, z: 0 };
                              await hallConfig.setRowAudioZone(r, { x: zc.x, y: 0, z: zc.z, sizeX: cfg.floor.sizeX, sizeY: cfg.walls.height, sizeZ: 9 });
                            } else {
                              const ra = { ...(cfg.rowAudioZones || {}) };
                              delete ra[r];
                              await hallConfig.patch({ rowAudioZones: ra });
                            }
                          }}
                        />
                        {zone && (
                          <span className="text-muted" style={{ fontSize: 11 }}>
                            ({zone.sizeX}×{zone.sizeY}×{zone.sizeZ} m @ {zone.x},{zone.z})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* -------------------- AVATARS -------------------- */}
            {/* -------------------- MONDE & PORTES -------------------- */}
            <Tab.Pane eventKey="worlds">
              <WorldManager />
            </Tab.Pane>

            {/* -------------------- POSITIONS DES STANDS -------------------- */}
            <Tab.Pane eventKey="placement">
              <StallPlacement />
            </Tab.Pane>

            <Tab.Pane eventKey="avatars">
              <Alert variant="info" style={{ fontSize: 13 }}>
                Importez de <strong>nouveaux modèles d&apos;avatars</strong> (GLB/GLTF).
                Ils seront proposés aux utilisateurs dans le configurateur.
              </Alert>
              <Row className="g-2 mb-3">
                <Col md={4}><Form.Control size="sm" style={inputStyle} placeholder="Nom de l avatar" value={newAv.name} onChange={(e) => setNewAv({ ...newAv, name: e.target.value })} /></Col>
                <Col md={6}><Form.Control size="sm" style={inputStyle} placeholder="URL du modèle (.glb/.gltf)" value={newAv.url} onChange={(e) => setNewAv({ ...newAv, url: e.target.value })} /></Col>
                <Col md={2}>
                  <Button size="sm" variant="primary" className="w-100" onClick={async () => {
                    if (!newAv.url) return;
                    await hallConfig.addAvatar({ ...newAv, id: "av-" + Date.now().toString(36) });
                    setNewAv({ name: "", url: "" });
                  }}>➕ Importer</Button>
                </Col>
              </Row>
              <Table size="sm" variant="dark" responsive style={{ fontSize: 12 }}>
                <thead><tr><th>Nom</th><th>URL</th><th></th></tr></thead>
                <tbody>
                  {(cfg.avatars || []).map((a) => (
                    <tr key={a.id}>
                      <td>{a.name || a.id}</td>
                      <td style={{ wordBreak: "break-all" }}>{a.url.slice(0, 60)}{a.url.length > 60 ? "…" : ""}</td>
                      <td><Button size="sm" variant="outline-danger" onClick={() => hallConfig.removeAvatar(a.id)}>✕</Button></td>
                    </tr>
                  ))}
                  {!(cfg.avatars || []).length && <tr><td colSpan={3} className="text-muted text-center">Aucun avatar importé (les modèles par défaut sont utilisés)</td></tr>}
                </tbody>
              </Table>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Card.Body>
    </Card>
  );
}
