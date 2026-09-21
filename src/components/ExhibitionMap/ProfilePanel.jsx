import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import * as mp from "net/multiplayer";

// Profil persistant du joueur (nom / photo / disponibilite). Stocke en local
// pour survivre au rechargement et etre envoye au serveur a la connexion.
const PROFILE_KEY = "veProfile";
// Plafond cote client : ~1,1 Mo d'image en base64. Le serveur accepte jusqu'a
// MAX_PHOTO (2,5 Mo) ; on reste en dessous pour garder les snapshots legers.
const MAX_LOCAL_PHOTO = 1_500_000;

function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

const AVAIL_OPTIONS = [
  { value: "online", label: "Disponible" },
  { value: "busy", label: "Occupé(e)" },
  { value: "away", label: "Absent(e)" },
  { value: "offline", label: "Hors ligne" },
];

// Bouton flottant + fenetre de reglage du profil : photo de profil (ronde,
// affichee au-dessus de la tete) et disponibilite (pastille de couleur).
export default function ProfilePanel() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [availability, setAvailability] = useState("online");
  const [error, setError] = useState("");

  // Prefill depuis le profil stocke + le profil local courant a l'ouverture.
  useEffect(() => {
    if (!show) return;
    const stored = loadStored();
    const self = mp.getSelfProfile();
    setName(stored.name || self.name || "");
    setPhoto(stored.photo || self.photo || "");
    setAvailability(stored.availability || self.availability || "online");
    setError("");
  }, [show]);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisissez un fichier image (JPG, PNG, GIF, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl.length > MAX_LOCAL_PHOTO) {
        setError("Image trop lourde (max ~1 Mo). Réduisez-la avant l'envoi.");
        return;
      }
      setPhoto(dataUrl);
      setError("");
    };
    reader.onerror = () => setError("Impossible de lire le fichier.");
    reader.readAsDataURL(file);
    // Reset pour permettre de re-selectionner le meme fichier.
    e.target.value = "";
  };

  const save = () => {
    const stored = loadStored();
    const next = {
      ...stored,
      name: name.trim().slice(0, 40),
      photo,
      availability,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    // Met a jour le profil local (etiquette instantanee) + le diffuse aux pairs.
    mp.updatePresence({ name: next.name, photo, availability });
    setShow(false);
  };

  const clearPhoto = () => {
    setPhoto("");
    const stored = loadStored();
    delete stored.photo;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(stored));
    mp.updatePresence({ photo: "" });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        title="Mon profil (photo + disponibilité)"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1051,
          border: "1px solid #888",
          borderRadius: 999,
          background: "rgba(11,16,32,0.85)",
          color: "#fff",
          fontSize: 13,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        ⚙ Profil
      </button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Mon profil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="warning" className="py-2">
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Nom affiché</Form.Label>
            <Form.Control
              type="text"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Photo de profil (ronde, au-dessus de la tête)</Form.Label>
            <div className="d-flex align-items-center mb-2">
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #0d6efd",
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#2563eb",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {(name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <Form.Control type="file" accept="image/*" onChange={onFile} />
            {photo && (
              <Button
                variant="link"
                size="sm"
                className="p-0 mt-1"
                onClick={clearPhoto}
              >
                Supprimer la photo
              </Button>
            )}
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Disponibilité</Form.Label>
            <Form.Select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              {AVAIL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <small className="text-muted">
            La pastille de couleur au-dessus de la tête reflète votre disponibilité
            (vert = disponible, rouge = occupé, orange = absent, gris = hors
            ligne). Elle est visible par les autres visiteurs.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save}>
            Enregistrer
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
