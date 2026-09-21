import React, { useEffect, useState } from "react";
import { Card, Table, Button, Badge, Row, Col, Alert, Form } from "react-bootstrap";

// ===========================================================================
// GESTION DES COMPTES (admin) : liste par role, bannissement, reset de mot de
// passe, export CSV des leads collectes sur les stands.
// ===========================================================================
export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/admin/users");
      if (r.ok) setUsers(await r.json());
      const r2 = await fetch("/api/leads");
      if (r2.ok) setLeads(await r2.json());
    } catch (e) { /* serveur injoignable */ }
  };
  useEffect(() => { load(); }, []);

  const ban = async (email, banned) => {
    await fetch("/api/admin/users/" + (banned ? "unban" : "ban"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    load();
  };

  const reset = async (email) => {
    const r = await fetch("/api/admin/users/resetPassword", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    setMsg("Mot de passe temporaire pour " + email + " : " + (d.tempPassword || "?"));
  };

  const shown = users.filter((u) => !filter || (u.email || "").toLowerCase().includes(filter.toLowerCase()) || (u.role || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <Card style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155" }} className="mb-3">
        <Card.Header style={{ background: "#1e293b" }}><strong>👥 Comptes utilisateurs</strong></Card.Header>
        <Card.Body>
          {msg && <Alert variant="info" className="py-2" style={{ fontSize: 13 }}>{msg}</Alert>}
          <Row className="g-2 mb-2">
            <Col md={4}><Form.Control size="sm" placeholder="Filtrer (email ou role)" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: "#0b1020", color: "#e2e8f0", border: "1px solid #334155" }} /></Col>
            <Col md={4}><Button size="sm" variant="outline-light" onClick={load}>Rafraîchir</Button></Col>
          </Row>
          <Table size="sm" variant="dark" responsive style={{ fontSize: 12 }}>
            <thead><tr><th>Role</th><th>Nom</th><th>Email</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.email}>
                  <td><Badge bg="secondary">{u.role}</Badge></td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.banned ? <Badge bg="danger">banni</Badge> : <Badge bg="success">actif</Badge>}</td>
                  <td className="d-flex" style={{ gap: 4 }}>
                    <Button size="sm" variant={u.banned ? "outline-success" : "outline-danger"} onClick={() => ban(u.email, u.banned)}>
                      {u.banned ? "Reactiver" : "Bannir"}
                    </Button>
                    <Button size="sm" variant="outline-warning" onClick={() => reset(u.email)}>Reset MDP</Button>
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={5} className="text-muted text-center">Aucun compte (les fichiers _data/*.json alimentent cette liste)</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155" }}>
        <Card.Header style={{ background: "#1e293b" }} className="d-flex justify-content-between align-items-center">
          <strong>📇 Leads collectes sur les stands</strong>
          <Button size="sm" variant="outline-light" href="/api/leads/export" target="_blank">⬇️ Export CSV</Button>
        </Card.Header>
        <Card.Body>
          <Table size="sm" variant="dark" responsive style={{ fontSize: 12 }}>
            <thead><tr><th>Stand</th><th>Nom</th><th>Email</th><th>Societe</th><th>Date</th></tr></thead>
            <tbody>
              {leads.slice(-100).reverse().map((l) => (
                <tr key={l.id}>
                  <td>{l.stallId}</td><td>{l.name}</td><td>{l.email}</td><td>{l.company}</td>
                  <td>{new Date(l.ts).toLocaleString()}</td>
                </tr>
              ))}
              {!leads.length && <tr><td colSpan={5} className="text-muted text-center">Aucun lead pour l instant</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
