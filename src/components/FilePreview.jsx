import { useState, useEffect } from "react";
import "./FilePreview.css";

export default function FilePreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl || !file) return null;

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  if (isImage) {
    return (
      <div className="file-preview">
        <img src={previewUrl} alt="Preview" className="file-preview-img" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="file-preview">
        <iframe src={previewUrl} title="PDF Preview" className="file-preview-pdf" />
      </div>
    );
  }

  return null;
}
