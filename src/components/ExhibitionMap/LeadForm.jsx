import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";

// Formulaire de collecte de coordonnees sur un stand (lead). Envoie POST /api/leads.
export default function LeadForm({ stall, exhibitionId, show, onHide }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!form.email) { setErr("Email requis"); return; }
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stallId: stall && (stall.stallId || stall.id), exhibitionId }),
      });
      if (!r.ok) throw new Error("refus");
      setDone(true);
    } catch (e) {
      setErr("Envoi impossible. Reessayez.");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>📇 Laisser mes coordonnees — {stall ? stall.stallName || stall.stallId : ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {done ? (
          <Alert variant="success">Merci ! L exposant a recu vos coordonnees.</Alert>
        ) : (
          <>
            {err && <Alert variant="danger">{err}</Alert>}
            <Form.Group className="mb-2">
              <Form.Label>Nom</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Societe</Form.Label>
              <Form.Control value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Message</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Fermer</Button>
        {!done && <Button variant="primary" onClick={submit}>Envoyer</Button>}
      </Modal.Footer>
    </Modal>
  );
}
