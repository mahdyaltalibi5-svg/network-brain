"use client";

import { useActionState, useRef, useTransition } from "react";
import { Upload } from "lucide-react";
import { uploadFilesAction, type UploadState } from "@/app/(crm)/profile-actions";

/** Phone photos are 3–12 MB; shrink them to ~1600px JPEG in the browser before upload. */
async function shrink(f: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) || f.size < 900_000) return f;
  try {
    const bmp = await createImageBitmap(f);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

export function FileUpload({ id }: { id: string }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadFilesAction, {});
  const [busy, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const picked = [...(input.current?.files ?? [])];
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          for (const f of picked) fd.append("files", await shrink(f));
          action(fd);
          if (input.current) input.current.value = "";
        });
      }}
    >
      <label className="sr-only" htmlFor={`files-${id}`}>Photos or documents</label>
      <input ref={input} id={`files-${id}`} name="files" type="file" multiple accept="image/*,application/pdf" className="field !w-auto max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-ivory" />
      <button className="btn" disabled={pending || busy}><Upload className="h-3.5 w-3.5" aria-hidden="true" />{pending || busy ? "Uploading…" : "Upload"}</button>
      {state.error && <p role="alert" className="w-full text-sm text-bad">{state.error}</p>}
      {state.ok && <p role="status" className="w-full text-sm text-ok">Uploaded {state.ok} file{state.ok === 1 ? "" : "s"}.</p>}
    </form>
  );
}
