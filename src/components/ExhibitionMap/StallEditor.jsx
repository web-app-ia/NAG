import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Row, Col, Card } from "react-bootstrap";
import * as stallDecor from "net/stallDecor";
import { uploadFile } from "net/upload";

// Plafond cote client pour un visuel de stand (~2,2 Mo en base64).
const MAX_LOCAL_ASSET = 3_000_000;
// Doit rester aligne avec MAX_ASSETS cote serveur.
const MAX_ASSETS = 6;

const MODELS = [
  { value: "Gold", label: "Or (Gold)" },
  { value: "Platinum", label: "Platine (Platinum)" },
  { value: "Diamond", label: "Diamant (Diamond)" },
];

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

// Fenetre d'habillage d'un stand (menu admin) : modele, visuel 2D (image ou
// video), kakemono (banniere) et zone audio 3D. Enregistre cote serveur.
export default function StallEditor({ stall, show, onHide }) {
  const stallId = stall && (stall.stallId || stall.id);
  const [model, setModel] = useState("Gold");
  const [displayKind, setDisplayKind] = useState("image");
  const [displayUrl, setDisplayUrl] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [kakemonoUrl, setKakemonoUrl] = useState("");
  const [zone, setZone] = useState({ dx: 0, dz: 0, r: 6 });
  // Assets 3D / interactifs importes sur le stand (modeles glTF + pages web).
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState("");
  // Ecrans supplementaires (playlist multi-ecrans) + audio 3D positionnel.
  const [screens, setScreens] = useState([]);
  const [audio3d, setAudio3d] = useState({ enabled: false, url: "", dx: 0, dz: 0, distance: 14, rolloff: 1.4, volume: 0.8, loop: true });
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Upload serveur (40 Mo) preferé : fallback data URL pour les petits fichiers.
  const storePicked = async (file, kindHint) => {
    setUploading(true);
    try {
      const r = await uploadFile(file);
      setUploading(false);
      setError("");
      return r.url;
    } catch (e) {
      setUploading(false);
      // Fallback : data URL si assez petit (compatibilite).
      const url = await readFile(file);
      if (url.length > MAX_LOCAL_ASSET) {
        setError("Fichier trop lourd (max ~2 Mo en local).");
        throw e;
      }
      setError("");
      return url;
    }
  };

  useEffect(() => {
    if (!show || !stallId) return;
    const d = stallDecor.get(stallId) || {};
    setModel(d.model || (stall && (stall.stallType || stall.tier)) || "Gold");
    setDisplayKind((d.display && d.display.kind) || "image");
    setDisplayUrl((d.display && d.display.dataUrl) || "");
    setDisplayTitle((d.display && d.display.title) || "");
    setKakemonoUrl((d.kakemono && d.kakemono.dataUrl) || "");
    setZone(d.audioZone || { dx: 0, dz: 0, r: 6 });
    setScreens(Array.isArray(d.screens) ? d.screens : []);
    setAudio3d(d.audio3d || { enabled: false, url: "", dx: 0, dz: 0, distance: 14, rolloff: 1.4, volume: 0.8, loop: true });
    setAssets(
      Array.isArray(d.assets)
        ? d.assets.map((a) => ({ ...a, interactUrl: a.interactUrl || "" }))
        : []
    );
    setError("");
  }, [show, stallId]);

  const addAsset = () => {
    setAssets((list) =>
      list.length >= MAX_ASSETS
        ? list
        : [
            ...list,
            {
              id: "asset-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              kind: "model",
              name: "",
              url: "",
              dx: 0,
              dz: 4.5,
              scale: 1,
              rotY: 0,
              interactUrl: "",
            },
          ]
    );
  };

  const patchAsset = (i, patch) =>
    setAssets((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const removeAsset = (i) => setAssets((list) => list.filter((_, j) => j !== i));

  // Import d'un modele depuis le disque (.glb / .gltf) -> data URL.
  // Reserve aux petits modeles : une URL est preferable pour tout le reste.
  const onPickAsset = async (e, i) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setError("Un modèle 3D doit être un fichier .glb ou .gltf.");
      return;
    }
    try {
      const url = await readFile(file);
      if (url.length > MAX_LOCAL_ASSET) {
        setError("Modèle trop lourd (max ~2 Mo). Utilisez plutôt une URL.");
        return;
      }
      patchAsset(i, { url });
      setError("");
    } catch (err) {
      setError("Impossible de lire le fichier.");
    }
  };

    const onPick = async (e, kind) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    if (kind === "display" && !isVideo && !isImage) {
      setError("Choisissez une image ou une vidéo.");
      return;
    }
    if (kind === "kakemono" && !isImage) {
      setError("Le kakemono doit être une image.");
      return;
    }
    if ((kind === "screen" || kind === "audio3d") && !isVideo && !isImage && !isAudio) {
      setError("Choisissez un fichier audio, image ou vidéo.");
      return;
    }
    try {
      const url = await storePicked(file, kind);
      if (kind === "display") {
        setDisplayUrl(url);
        setDisplayKind(isVideo ? "video" : "image");
      } else if (kind === "kakemono") {
        setKakemonoUrl(url);
      } else if (kind === "screen") {
        setScreens((list) => [...list.slice(0, 5), {
          id: "screen-" + Date.now().toString(36),
          kind: isVideo ? "video" : "image",
          url, dx: 0, dy: 1.6, dz: 2.2, width: 1.8, height: 1.1,
        }]);
      } else if (kind === "audio3d") {
        setAudio3d((a) => ({ ...a, enabled: true, url }));
      }
      setError("");
    } catch (err) {
      setError("Impossible de lire le fichier.");
    }
  };

  const save = async () => {
    if (!stallId) return;
    const decor = {
      model,
      audioZone: { dx: Number(zone.dx), dz: Number(zone.dz), r: Number(zone.r) },
    };
    if (displayUrl) {
      decor.display = {
        kind: displayKind,
        dataUrl: displayUrl,
        title: displayTitle.trim().slice(0, 80),
      };
    }
    if (kakemonoUrl) decor.kakemono = { dataUrl: kakemonoUrl };
    // Ecrans supplementaires (playlist multi-ecrans) + sortie audio 3D.
    decor.screens = screens.filter((s) => s.url && s.url.trim());
    if (audio3d && audio3d.url) decor.audio3d = { ...audio3d };
    // On n'enregistre que les assets ayant une URL ; un tableau vide est envoye
    // volontairement pour que la suppression de tous les assets soit persistee.
    decor.assets = assets
      .filter((a) => a.url && a.url.trim())
      .map((a) => {
        const item = {
          id: a.id,
          kind: a.kind,
          name: (a.name || "").trim().slice(0, 60),
          url: a.url.trim(),
          dx: Number(a.dx),
          dz: Number(a.dz),
          scale: Number(a.scale),
          rotY: Number(a.rotY),
        };
        if (a.kind === "model" && a.interactUrl && a.interactUrl.trim()) {
          item.interactUrl = a.interactUrl.trim();
        }
        return item;
      });
    try {
      await stallDecor.save(stallId, decor);
      onHide();
    } catch (e) {
      setError("Échec de l'enregistrement (serveur injoignable ?).");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Habiller le stand — {stall ? stall.stallName || stall.stallId : ""}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="warning" className="py-2">
            {error}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Modèle de stand</Form.Label>
          <Form.Select value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Visuel 2D (image ou vidéo) — affiché devant le stand</Form.Label>
          <Form.Control type="file" accept="image/*,video/*" onChange={(e) => onPick(e, "display")} />
          {uploading && <small className="text-muted">Upload en cours…</small>}
          {displayUrl && (
            <div className="mt-2 d-flex align-items-center" style={{ gap: 8 }}>
              {displayKind === "video" ? (
                <video src={displayUrl} muted loop style={{ width: 120, borderRadius: 6 }} />
              ) : (
                <img src={displayUrl} alt="" style={{ width: 120, borderRadius: 6 }} />
              )}
              <Button variant="link" size="sm" className="p-0" onClick={() => setDisplayUrl("")}>
                Retirer
              </Button>
            </div>
          )}
          <Form.Control
            className="mt-2"
            type="text"
            placeholder="Titre du visuel (optionnel)"
            value={displayTitle}
            maxLength={80}
            onChange={(e) => setDisplayTitle(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Kakemono (bannière verticale)</Form.Label>
          <Form.Control type="file" accept="image/*" onChange={(e) => onPick(e, "kakemono")} />
          {kakemonoUrl && (
            <div className="mt-2 d-flex align-items-center" style={{ gap: 8 }}>
              <img src={kakemonoUrl} alt="" style={{ height: 90, borderRadius: 6 }} />
              <Button variant="link" size="sm" className="p-0" onClick={() => setKakemonoUrl("")}>
                Retirer
              </Button>
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Écrans supplémentaires (playlist multi-écrans)</Form.Label>
          <Form.Control type="file" accept="image/*,video/*" onChange={(e) => onPick(e, "screen")} />
          {screens.map((s, i) => (
            <div key={s.id || i} className="mt-2 d-flex align-items-center" style={{ gap: 8 }}>
              <span style={{ fontSize: 12 }}>{s.kind === "video" ? "🎬" : "🖼️"} {String(s.url).slice(0, 34)}…</span>
              <Form.Control size="sm" type="number" step={0.5} value={s.dx} title="X"
                style={{ width: 60 }} onChange={(e) => setScreens((l) => l.map((x, j) => (j === i ? { ...x, dx: Number(e.target.value) } : x)))} />
              <Form.Control size="sm" type="number" step={0.5} value={s.dz} title="Z"
                style={{ width: 60 }} onChange={(e) => setScreens((l) => l.map((x, j) => (j === i ? { ...x, dz: Number(e.target.value) } : x)))} />
              <Button variant="link" size="sm" className="p-0"
                onClick={() => setScreens((l) => l.filter((_, j) => j !== i))}>Retirer</Button>
            </div>
          ))}
          {screens.length === 0 && <small className="text-muted">Aucun écran supplémentaire.</small>}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Sortie audio 3D positionnelle du stand</Form.Label>
          <div className="d-flex mb-2" style={{ gap: 8 }}>
            <Form.Control type="file" accept="audio/*,video/*" onChange={(e) => onPick(e, "audio3d")} style={{ flex: 1 }} />
          </div>
          <Form.Check type="switch" label="Activée" checked={audio3d.enabled}
            onChange={(e) => setAudio3d((a) => ({ ...a, enabled: e.target.checked }))} />
          <Row className="mt-2">
            <Col>
              <Form.Label className="small text-muted mb-1">Portée : {audio3d.distance} m</Form.Label>
              <Form.Range min={2} max={60} step={1} value={audio3d.distance}
                onChange={(e) => setAudio3d((a) => ({ ...a, distance: Number(e.target.value) }))} />
            </Col>
            <Col>
              <Form.Label className="small text-muted mb-1">Volume : {Math.round(audio3d.volume * 100)}%</Form.Label>
              <Form.Range min={0} max={1} step={0.05} value={audio3d.volume}
                onChange={(e) => setAudio3d((a) => ({ ...a, volume: Number(e.target.value) }))} />
            </Col>
          </Row>
          {audio3d.url && <small className="text-muted d-block">Source : {String(audio3d.url).slice(0, 50)}…</small>}
        </Form.Group>

        <Form.Group className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <Form.Label className="mb-0">
              Assets 3D / interactifs ({assets.length}/{MAX_ASSETS})
            </Form.Label>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={addAsset}
              disabled={assets.length >= MAX_ASSETS}
            >
              + Ajouter un asset
            </Button>
          </div>
          {assets.length === 0 && (
            <small className="text-muted d-block">
              Importez un modèle 3D (.glb / .gltf) ou une page interactive. Un
              modèle peut aussi ouvrir une page web lorsqu'on clique dessus.
            </small>
          )}
          {assets.map((a, i) => (
            <Card key={a.id} className="mb-2">
              <Card.Body className="py-2">
                <Row className="align-items-end">
                  <Col md={4}>
                    <Form.Label className="small mb-1">Type</Form.Label>
                    <Form.Select
                      size="sm"
                      value={a.kind}
                      onChange={(e) => patchAsset(i, { kind: e.target.value })}
                    >
                      <option value="model">Modèle 3D (.glb / .gltf)</option>
                      <option value="interactive">Contenu interactif (page web)</option>
                    </Form.Select>
                  </Col>
                  <Col md={5}>
                    <Form.Label className="small mb-1">Nom affiché</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      maxLength={60}
                      value={a.name}
                      placeholder={a.kind === "model" ? "ex. Robot compagnon" : "ex. Configurateur"}
                      onChange={(e) => patchAsset(i, { name: e.target.value })}
                    />
                  </Col>
                  <Col md={3} className="text-end">
                    <Button variant="outline-danger" size="sm" onClick={() => removeAsset(i)}>
                      Retirer
                    </Button>
                  </Col>
                </Row>

                <Row className="mt-2">
                  <Col md={a.kind === "model" ? 8 : 12}>
                    <Form.Label className="small mb-1">
                      {a.kind === "model" ? "URL du modèle (.glb / .gltf)" : "URL de la page interactive"}
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={a.url}
                      placeholder={
                        a.kind === "model"
                          ? "https://exemple.com/robot.glb"
                          : "https://exemple.com/demo"
                      }
                      onChange={(e) => patchAsset(i, { url: e.target.value })}
                    />
                  </Col>
                  {a.kind === "model" && (
                    <Col md={4}>
                      <Form.Label className="small mb-1">… ou un fichier</Form.Label>
                      <Form.Control
                        size="sm"
                        type="file"
                        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                        onChange={(e) => onPickAsset(e, i)}
                      />
                    </Col>
                  )}
                </Row>

                {a.kind === "model" && (
                  <Form.Group className="mt-2">
                    <Form.Label className="small mb-1">
                      Page ouverte au clic sur le modèle (optionnel)
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={a.interactUrl || ""}
                      placeholder="https://exemple.com/panneau-de-controle"
                      onChange={(e) => patchAsset(i, { interactUrl: e.target.value })}
                    />
                  </Form.Group>
                )}

                <Row className="mt-2">
                  <Col>
                    <Form.Label className="small text-muted mb-1">
                      Décalage X : {Number(a.dx).toFixed(1)}
                    </Form.Label>
                    <Form.Range
                      min={-14}
                      max={14}
                      step={0.5}
                      value={a.dx}
                      onChange={(e) => patchAsset(i, { dx: Number(e.target.value) })}
                    />
                  </Col>
                  <Col>
                    <Form.Label className="small text-muted mb-1">
                      Décalage Z : {Number(a.dz).toFixed(1)}
                    </Form.Label>
                    <Form.Range
                      min={-14}
                      max={14}
                      step={0.5}
                      value={a.dz}
                      onChange={(e) => patchAsset(i, { dz: Number(e.target.value) })}
                    />
                  </Col>
                  <Col>
                    <Form.Label className="small text-muted mb-1">
                      Échelle : {Number(a.scale).toFixed(1)}×
                    </Form.Label>
                    <Form.Range
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={a.scale}
                      onChange={(e) => patchAsset(i, { scale: Number(e.target.value) })}
                    />
                  </Col>
                  <Col>
                    <Form.Label className="small text-muted mb-1">
                      Rotation : {Math.round(Number(a.rotY))}°
                    </Form.Label>
                    <Form.Range
                      min={-180}
                      max={180}
                      step={5}
                      value={a.rotY}
                      onChange={(e) => patchAsset(i, { rotY: Number(e.target.value) })}
                    />
                  </Col>
                </Row>

                {a.url && a.url.startsWith("data:") && (
                  <small className="text-muted d-block mt-1">
                    Fichier local intégré ({Math.round(a.url.length / 1024)} Ko).
                  </small>
                )}
                {a.url && !a.url.startsWith("data:") && !/^https?:\/\//i.test(a.url) && (
                  <small className="text-warning d-block mt-1">
                    Une URL d'asset doit commencer par http:// ou https://
                  </small>
                )}
              </Card.Body>
            </Card>
          ))}
          <small className="text-muted">
            Un modèle 3D est automatiquement redimensionné et posé au sol.
          </small>
        </Form.Group>

        <Form.Group className="mb-1">
          <Form.Label>Zone audio 3D (rayon au sol autour du stand)</Form.Label>
          <Row>
            <Col>
              <Form.Label className="small text-muted">
                Décalage X : {Number(zone.dx).toFixed(1)}
              </Form.Label>
              <Form.Range
                min={-15}
                max={15}
                step={0.5}
                value={zone.dx}
                onChange={(e) => setZone((z) => ({ ...z, dx: Number(e.target.value) }))}
              />
            </Col>
            <Col>
              <Form.Label className="small text-muted">
                Décalage Z : {Number(zone.dz).toFixed(1)}
              </Form.Label>
              <Form.Range
                min={-15}
                max={15}
                step={0.5}
                value={zone.dz}
                onChange={(e) => setZone((z) => ({ ...z, dz: Number(e.target.value) }))}
              />
            </Col>
            <Col>
              <Form.Label className="small text-muted">
                Rayon : {Number(zone.r).toFixed(1)} m
              </Form.Label>
              <Form.Range
                min={2}
                max={25}
                step={0.5}
                value={zone.r}
                onChange={(e) => setZone((z) => ({ ...z, r: Number(e.target.value) }))}
              />
            </Col>
          </Row>
        </Form.Group>
        <small className="text-muted">
          Dans la zone audio, la voix de proximité porte plus loin (utile pour les
          démonstrations sur un stand).
        </small>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Annuler
        </Button>
        <Button variant="primary" onClick={save}>
          Enregistrer
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
