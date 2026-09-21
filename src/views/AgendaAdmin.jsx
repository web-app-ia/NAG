import React, { useEffect, useState } from "react";
import { Card, Table, Button, Form, Row, Col, Badge } from "react-bootstrap";

// ===========================================================================
// AGENDA DES CONFERENCES (admin) : programme par exposition + rappels visibles
// dans la cloche de notifications des visiteurs (via /api/agenda/:exhibitionId).
// ===========================================================================
const inputStyle = { background: "#0b1020", color: "#e2e8f0", border: "1px solid #334155" };

export default function AgendaAdmin() {
  const exhibitionId = localStorage.getItem("exhibitionId") || "demo";
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", stallId: "", speaker: "", startsAt: "", durationMin: 30 });

  const load = async () => {
    try {
      const r = await fetch("/api/agenda/" + encodeURIComponent(exhibitionId));
      if (r.ok) setItems(await r.json());
    } catch (e) { /* */ }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title) return;
    await fetch("/api/agenda", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, exhibitionId, startsAt: form.startsAt ? new Date(form.startsAt).getTime() : Date.now() }),
    });
    setForm({ title: "", stallId: "", speaker: "", startsAt: "", durationMin: 30 });
    load();
  };

  const remove = async (id) => {
    await fetch("/api/agenda/" + id, { method: "DELETE" });
    load();
  };

  return (
    <Card style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155" }}>
      <Card.Header style={{ background: "#1e293b" }}><strong>🗓️ Agenda des conférences — {exhibitionId}</strong></Card.Header>
      <Card.Body>
        <Row className="g-2 mb-3">
          <Col md={3}><Form.Control size="sm" style={inputStyle} placeholder="Titre de la conférence" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Col>
          <Col md={2}><Form.Control size="sm" style={inputStyle} placeholder="Stand (id)" value={form.stallId} onChange={(e) => setForm({ ...form, stallId: e.target.value })} /></Col>
          <Col md={2}><Form.Control size="sm" style={inputStyle} placeholder="Intervenant" value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></Col>
          <Col md={3}><Form.Control size="sm" type="datetime-local" style={inputStyle} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Col>
          <Col md={2}><Button size="sm" variant="primary" className="w-100" onClick={add}>➕ Ajouter</Button></Col>
        </Row>
        <Table size="sm" variant="dark" responsive style={{ fontSize: 12 }}>
          <thead><tr><th>Titre</th><th>Stand</th><th>Intervenant</th><th>Début</th><th>Durée</th><th></th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.title}</td>
                <td>{it.stallId || "—"}</td>
                <td>{it.speaker || "—"}</td>
                <td>{new Date(it.startsAt).toLocaleString()}</td>
                <td><Badge bg="secondary">{it.durationMin} min</Badge></td>
                <td><Button size="sm" variant="outline-danger" onClick={() => remove(it.id)}>✕</Button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="text-muted text-center">Aucune conférence programmée</td></tr>}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
