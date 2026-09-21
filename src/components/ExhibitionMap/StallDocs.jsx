import React, { useEffect, useState } from "react";

// Liste des brochures/documents d un stand, telechargeables (docs administres
// via PUT /api/stall-docs/:stallId).
export default function StallDocs({ stallId }) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!stallId) return;
    let alive = true;
    fetch("/api/stall-docs/" + encodeURIComponent(stallId))
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (alive) setDocs(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [stallId]);

  if (!docs.length) return null;
  return (
    <div className="mt-2">
      <strong className="small">📎 Documents du stand</strong>
      <ul className="mb-0 pl-3">
        {docs.map((d) => (
          <li key={d.id}>
            <a href={d.url} target="_blank" rel="noopener noreferrer">
              {d.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
