// Upload de fichiers vers le serveur (remplace les data URLs base64).
// POST /api/upload (multipart) -> { url } servi depuis /_imgout/uploads/.
export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  if (!r.ok) throw new Error("Upload echoue (" + r.status + ")");
  return r.json(); // { status, url, size }
}

export async function uploadAndGetDataUrl(file) {
  const res = await uploadFile(file);
  return res.url;
}

export default { uploadFile };
