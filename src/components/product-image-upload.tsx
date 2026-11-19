"use client";

import Image from "next/image";
import { ImagePlus, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ProductImageUpload({ currentImageUrl }: { currentImageUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function selectFile(file?: File) {
    if (!file) return;
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="product-upload-layout">
      <div className="product-upload-preview" aria-live="polite">
        {preview || currentImageUrl ? (
          <Image
            alt={preview ? "Selected product photo preview" : "Current product photo"}
            className="product-upload-image"
            fill
            sizes="(max-width: 720px) 100vw, 220px"
            src={preview ?? currentImageUrl!}
            unoptimized
          />
        ) : (
          <span className="product-upload-empty"><ImagePlus aria-hidden="true" size={30} /><span>Photo preview</span></span>
        )}
      </div>
      <label
        className="product-drop-zone"
        htmlFor="product-image-file"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          selectFile(event.dataTransfer.files[0]);
        }}
      >
        <UploadCloud aria-hidden="true" size={24} />
        <strong>Drop a product photo here</strong>
        <span>or choose an image from your device</span>
        <span className="product-browse-button">Browse image</span>
        <input
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="product-upload-input"
          id="product-image-file"
          name="image"
          onChange={(event) => selectFile(event.currentTarget.files?.[0])}
          ref={inputRef}
          type="file"
        />
        <small>JPEG, PNG, WebP, or AVIF · up to 5 MB</small>
      </label>
    </div>
  );
}
