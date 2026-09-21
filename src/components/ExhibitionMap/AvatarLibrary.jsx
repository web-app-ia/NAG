import React, { useEffect, useState } from "react";
import { Card, Button, Row, Col, Badge } from "react-bootstrap";
import { useHallConfig } from "./useHallConfig";

// ===========================================================================
// BANQUE D AVATARS : propose les modeles importes (Hall Builder > Avatars) et
// les 4 modeles par defaut. Le choix est stocke dans localStorage et consomme
// par Player.jsx (avatar 3D de la visite).
// ===========================================================================
const DEFAULT_AVATARS = [
  { id: "def-m1", name: "Visiteur (H)", url: "./avatars/attendeemaleavatar1.glb" },
  { id: "def-m2", name: "Visiteur (H) 2", url: "./avatars/attendeemaleavatar2.glb" },
  { id: "def-f1", name: "Visiteuse (F)", url: "./avatars/attendeefemaleavatar1.glb" },
  { id: "def-f2", name: "Visiteuse (F) 2", url: "./avatars/attendeefemaleavatar2.glb" },
];

export default function AvatarLibrary({ compact }) {
  const cfg = useHallConfig();
  const [selected, setSelected] = useState(() => localStorage.getItem("avatarModelUrl") || DEFAULT_AVATARS[0].url);
  const list = [...DEFAULT_AVATARS, ...((cfg && cfg.avatars) || []).map((a) => ({ id: a.id, name: a.name || a.id, url: a.url, imported: true }))];

  const choose = (url) => {
    setSelected(url);
    localStorage.setItem("avatarModelUrl", url);
  };

  useEffect(() => {
    // Aucun modele choisi : on prend le premier de la banque.
    if (!localStorage.getItem("avatarModelUrl") && list.length) {
      localStorage.setItem("avatarModelUrl", list[0].url);
    }
  }, []);

  return (
    <Card style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155" }} className={compact ? "mb-2" : "mb-3"}>
      <Card.Body>
        <strong>🧍 Banque d&apos;avatars</strong>
        <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Choisissez votre apparence. Les modèles importés par l&apos;administrateur apparaissent ici.
        </div>
        <Row className="g-2">
          {list.map((a) => (
            <Col md={compact ? 6 : 3} key={a.id}>
              <Button
                variant={selected === a.url ? "primary" : "outline-light"}
                size="sm"
                className="w-100 d-flex align-items-center justify-content-between"
                onClick={() => choose(a.url)}
                title={a.url}
              >
                <span className="text-truncate">{a.name}</span>
                {a.imported ? <Badge bg="info">importé</Badge> : null}
              </Button>
            </Col>
          ))}
          {!list.length && <Col className="text-muted">Aucun modèle disponible</Col>}
        </Row>
      </Card.Body>
    </Card>
  );
}
