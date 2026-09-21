import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Form, Nav, Badge, Button } from "react-bootstrap";
import * as analytics from "net/analytics";
import playerStore from "components/AvatarCustomization/playerStore";
import * as mp from "net/multiplayer";
import { liveBounds } from "net/hallConfig";
import {
  HALL,
  AISLE,
  POD_RADIUS,
  STALL_COLS,
  stallLayout,
  stallApproach,
  facingHeading,
  podColor,
  hallZones,
} from "./hallLayout";

// ---------------------------------------------------------------------------
// Plan vu de dessus : repere MONDE -> repere SVG.
// Le sol fait 80 x 40 (x de -40 a +40, z de -20 a +20). On ajoute 2 unites de
// marge de chaque cote => 84 x 44 unites projetees sur 600 px de large.
// ---------------------------------------------------------------------------
const SX = 600 / 84;
const MAP_W = 600;
const MAP_H = 44 * SX;
const toSvg = (x, z) => [(x + 42) * SX, (z + 22) * SX];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Couleur de la pastille de statut (disponibilite) affichee dans la liste.
const AVAIL_BADGE = {
  online: "success",
  busy: "danger",
  away: "warning",
  offline: "secondary",
};
const availBadge = (a) => AVAIL_BADGE[a] || "secondary";

/**
 * Plan interactif du salon.
 *
 * - Vue de dessus : stands, allees centrales, zones, "vous etes ici".
 * - Cliquer une destination (liste ou plan) TELEPORTE l'avatar sur place et
 *   l'oriente vers le stand vise. La teleportation passe par playerStore :
 *   Player.jsx la consomme a la frame suivante (aucun re-rendu React).
 * - Le marqueur de position est mis a jour en requestAnimationFrame (il bouge
 *   en direct pendant qu'on marche) sans re-rendre le composant.
 * - Les AUTRES visiteurs (multijoueur) sont lus directement depuis le module
 *   temps reel : points mis a jour chaque frame + liste "Personnes" live.
 *
 * props :
 *   stalls      liste des stands (meme ordre que dans le hall 3D)
 *   selectedId  stallId selectionne
 *   onSelect    (stall) => void
 */
const ExhibitionMap = ({ stalls = [], selectedId, onSelect }) => {
  const [tab, setTab] = useState("stalls");
  const [query, setQuery] = useState("");
  const [heat, setHeat] = useState(null); // heatmap admin (frequentation)
  const [dwell, setDwell] = useState([]); // temps passe par stand (admin)
  const svgRef = useRef(null);
  const markerRef = useRef(null);
  const facingRef = useRef(null);
  const peopleRefs = useRef({}); // id -> <g> SVG du point "personne" (maj au frame)

  const count = stalls.length || 20;
  const zones = useMemo(() => hallZones(count), [count]);

  // Liste live des autres visiteurs (changement a chaque join/leave/statut).
  const [people, setPeople] = useState(() => mp.getPeers());
  useEffect(() => mp.onPeersChange(() => setPeople(mp.getPeers())), []);
  const hasPeople = people.length > 0;

  // Suivi "vous etes ici" + points des autres visiteurs : lecture du magasin /
  // des pairs a chaque frame d'affichage (pas de re-rendu React).
  useEffect(() => {
    let raf;
    const tick = () => {
      const [mx, my] = toSvg(playerStore.position.x, playerStore.position.z);
      if (markerRef.current) {
        markerRef.current.setAttribute(
          "transform",
          `translate(${mx.toFixed(2)} ${my.toFixed(2)})`
        );
      }
      if (facingRef.current) {
        // Cap monde (0 = +Z) -> rotation SVG. Sur le plan +Z pointe vers le bas,
        // donc un triangle dessine vers le haut doit tourner de (180 - cap).
        const deg = (playerStore.heading * 180) / Math.PI;
        facingRef.current.setAttribute("transform", `rotate(${(180 - deg).toFixed(1)})`);
      }
      // Points des autres visiteurs (positions live, objets vivants du module).
      for (const p of mp.getPeers()) {
        const el = peopleRefs.current[p.id];
        if (!el) continue;
        const [px, py] = toSvg(p.x, p.z);
        el.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const goTo = (x, z, heading) => {
    // Bornes live depuis la config du Hall Builder (suivent la surface du sol).
    playerStore.requestTeleport(
      clamp(x, -liveBounds.x, liveBounds.x),
      clamp(z, -liveBounds.z, liveBounds.z),
      typeof heading === "number" ? heading : playerStore.heading
    );
  };

  // Teleporte devant un stand, en le regardant.
  const goToStall = (index) => {
    const [ax, az] = stallApproach(index, count);
    const [sx, sz] = stallLayout(index, count);
    goTo(ax, az, facingHeading(ax, az, sx, sz));
  };

  // Clic n'importe ou sur le plan : on y va directement.
  const onMapClick = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const vx = ((e.clientX - r.left) / r.width) * MAP_W;
    const vy = ((e.clientY - r.top) / r.height) * MAP_H;
    goTo(vx / SX - 42, vy / SX - 22);
  };

  const q = query.trim().toLowerCase();
  const filteredStalls = stalls
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => {
      if (!q) return true;
      return (
        String(s.stallName || s.stallId || "").toLowerCase().includes(q) ||
        String(s.stallType || s.tier || "").toLowerCase().includes(q) ||
        String(s.exhibitorEmail || "").toLowerCase().includes(q)
      );
    });

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
  };

  return (
    <Card>
      <Card.Header className="pb-0">
        <div className="d-flex justify-content-between align-items-center">
          <strong>Plan du salon</strong>
          <Badge bg="secondary">{stalls.length} stands</Badge>
        </div>
        <Nav variant="tabs" activeKey={tab} onSelect={(k) => setTab(k)} className="mt-2">
          <Nav.Item>
            <Nav.Link eventKey="stalls">Stands</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="zones">Zones</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="people">Personnes</Nav.Link>
          </Nav.Item>
        </Nav>
      </Card.Header>

      <Card.Body className="pt-2">
        {/* ---------------- Plan (vue de dessus) ---------------- */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 8, cursor: "crosshair" }}
          onClick={onMapClick}
        >
          <title>Plan du hall vu de dessus</title>

          {/* Fond */}
          <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#0e1630" rx="8" />

          {/* Sol de la salle (80 x 40) */}
          {(() => {
            const [x0, y0] = toSvg(-HALL.sizeX / 2, -HALL.sizeZ / 2);
            return (
              <rect
                x={x0}
                y={y0}
                width={HALL.sizeX * SX}
                height={HALL.sizeZ * SX}
                fill="#1a2340"
                stroke="#4a5a8a"
                strokeWidth="1"
                rx="4"
              />
            );
          })()}

          {/* Allees centrales (moquette rouge) */}
          {(() => {
            const [ax, ay] = toSvg(-AISLE.width / 2, -AISLE.length / 2);
            return (
              <rect
                x={ax}
                y={ay}
                width={AISLE.width * SX}
                height={AISLE.length * SX}
                fill="#7a1f2b"
                opacity="0.75"
              />
            );
          })()}

          {/* Zones nommees */}
          {zones.map((z) => {
            const [zx, zy] = toSvg(z.x, z.z);
            return (
              <g
                key={z.id}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(z.x, z.z);
                }}
                style={{ cursor: "pointer" }}
              >
                <title>{`Aller : ${z.name}`}</title>
                <rect
                  x={zx - 5}
                  y={zy - 5}
                  width="10"
                  height="10"
                  fill="#0d6efd"
                  opacity="0.85"
                  rx="2"
                />
              </g>
            );
          })}

          {/* Stands */}
          {stalls.map((s, i) => {
            const [sx, sz] = stallLayout(i, count);
            const [cx, cy] = toSvg(sx, sz);
            const t = s.stallType || s.tier;
            const selected = s.stallId === selectedId;
            return (
              <g
                key={s.stallId || i}
                onClick={(e) => {
                  e.stopPropagation();
                  goToStall(i);
                  if (onSelect) onSelect(s);
                }}
                style={{ cursor: "pointer" }}
              >
                <title>{`${i + 1}. ${s.stallName || s.stallId} (${t || "Standard"}) — cliquer pour s'y rendre`}</title>
                <circle
                  cx={cx}
                  cy={cy}
                  r={POD_RADIUS * SX}
                  fill={podColor(t)}
                  opacity={selected ? 0.95 : 0.55}
                  stroke={selected ? "#ffffff" : "#0b1020"}
                  strokeWidth={selected ? 2 : 1}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fill="#0b1020"
                  fontWeight="600"
                  style={{ pointerEvents: "none" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Autres visiteurs (multijoueur) : points jaunes mis a jour au frame */}
          {people.map((p) => {
            const [px, py] = toSvg(p.x, p.z);
            return (
              <g
                key={p.id}
                ref={(el) => {
                  if (el) peopleRefs.current[p.id] = el;
                  else delete peopleRefs.current[p.id];
                }}
                transform={`translate(${px.toFixed(2)} ${py.toFixed(2)})`}
              >
                <title>{`${p.name}${p.availability ? ` — ${p.availability}` : ""}`}</title>
                <circle r="6" fill="#ffd166" stroke="#0b1020" strokeWidth="1" />
              </g>
            );
          })}

          {/* Heatmap de frequentation (admin) : cercles chauds par cellule */}
          {heat && heat.map((c, i) => {
            const [hx, hy] = toSvg(c.x, c.z);
            const max = Math.max(...heat.map((x) => x.hits), 1);
            const r = 6 + (c.hits / max) * 26;
            return (
              <circle key={"h" + i} className="ve-heatcell" cx={hx} cy={hy} r={r}
                fill="rgba(239,68,68,0.28)" stroke="rgba(239,68,68,0.5)" strokeWidth="0.6" />
            );
          })}

          {/* Marqueur "vous etes ici" */}
          <g ref={markerRef} transform="translate(300 157.14)">
            <circle r="9" fill="#0d6efd" opacity="0.28" />
            <circle r="4" fill="#ffffff" stroke="#0d6efd" strokeWidth="2" />
            <g ref={facingRef}>
              <path d="M0 -15 L5 -6 L-5 -6 Z" fill="#0d6efd" />
            </g>
          </g>
        </svg>

        <small className="text-muted d-block mt-1 mb-2">
          Vue de dessus. Cliquez une pastille, une zone ou n'importe quel point du
          plan : l'avatar s'y rend instantanement.
        </small>

        {/* Analytics admin : heatmap de frequentation + dwell time par stand */}
        {(localStorage.getItem("userRole") || "ADMIN") === "ADMIN" && (
          <div className="d-flex align-items-center mb-2" style={{ gap: 6 }}>
            <Button
              size="sm"
              variant={heat ? "danger" : "outline-danger"}
              onClick={async () => {
                if (heat) { setHeat(null); setDwell([]); return; }
                const h = await analytics.fetchHeatmap();
                const d = await analytics.fetchDwell();
                setHeat(h.cells || []);
                setDwell(d || []);
              }}
            >
              🔥 Fréquentation
            </Button>
            {!!dwell.length && (
              <span className="text-muted" style={{ fontSize: 11 }}>
                Top stand : {dwell[0].stallId} ({Math.round(dwell[0].seconds / 60)} min cumulées)
              </span>
            )}
          </div>
        )}

        {/* ---------------- Listes cliquables ---------------- */}
        {tab === "stalls" && (
          <>
            <Form.Control
              size="sm"
              placeholder="Rechercher un stand, un type, un exposant..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-2"
            />
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {filteredStalls.length === 0 && (
                <div className="text-muted small py-2">Aucun resultat.</div>
              )}
              {filteredStalls.map(({ s, i }) => {
                const selected = s.stallId === selectedId;
                return (
                  <div
                    key={s.stallId || i}
                    style={{
                      ...rowStyle,
                      background: selected ? "#e7f0ff" : "transparent",
                    }}
                    onClick={() => {
                      goToStall(i);
                      if (onSelect) onSelect(s);
                    }}
                  >
                    <Badge bg={selected ? "primary" : "secondary"}>{i + 1}</Badge>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="text-truncate"
                        style={{ fontWeight: selected ? 600 : 400 }}
                      >
                        {s.stallName || s.stallId}
                      </div>
                      <small className="text-muted text-truncate d-block">
                        {s.stallType || s.tier || "Standard"}
                        {s.exhibitorEmail ? ` · ${s.exhibitorEmail}` : ""}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "zones" && (
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {zones.map((z) => (
              <div key={z.id} style={rowStyle} onClick={() => goTo(z.x, z.z)}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "#0d6efd",
                    borderRadius: 2,
                    display: "inline-block",
                    flex: "0 0 auto",
                  }}
                />
                <span>{z.name}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "people" && (
          <div>
            {!hasPeople && (
              <div className="text-muted small py-2">
                Aucun autre visiteur connecte pour l'instant.
                <br />
                Cette liste se remplit des que d'autres avatars rejoignent le
                meme salon en temps reel (position, photo et disponibilite).
              </div>
            )}
            {people.map((p) => (
              <div
                key={p.id}
                style={rowStyle}
                onClick={() => goTo(p.x, p.z)}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "#ffd166",
                    borderRadius: "50%",
                    display: "inline-block",
                    flex: "0 0 auto",
                  }}
                />
                <span className="text-truncate">{p.name}</span>
                <Badge bg={availBadge(p.availability)} className="ml-2">
                  {p.availability || "online"}
                </Badge>
                {/* Visite guidee : suivre ce visiteur (follow mode). */}
                <Button
                  size="sm"
                  variant={playerStore.followId === p.id ? "success" : "outline-info"}
                  className="ml-2 py-0"
                  style={{ fontSize: 11 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playerStore.setFollow(playerStore.followId === p.id ? null : p.id);
                  }}
                >
                  {playerStore.followId === p.id ? "Suivi ✓" : "Suivre"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ExhibitionMap;
