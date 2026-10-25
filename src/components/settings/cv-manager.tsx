"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Trash2, RefreshCcw, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { userRepository } from "@/lib/repositories";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

export function CVManager({ user }: { user: UserProfile }) {
  const client = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const replace = async (file: File | null) => {
    if (!file) return;
    setError(null);

    // Zyphnaro requires PDF specifically — see /docs/backend-integration.md
    // for why (consistent rendering, one text-extraction path for the
    // upcoming AI phase, no legacy .doc edge cases).
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file — other formats aren't supported yet.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(localUrl);

    if (!isSupabaseConfigured) {
      // MOCK MODE: remember the filename only, same as before. The local
      // preview above still works for the rest of this session.
      await userRepository.updateProfile({ cvFileName: file.name, cvUploadedAt: new Date().toISOString() });
      client.invalidateQueries({ queryKey: ["current-user"] });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not signed in");

      const path = `${authUser.id}/resume.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("cv-documents")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      await userRepository.updateProfile({
        cvFileName: file.name,
        cvStoragePath: path,
        cvUploadedAt: new Date().toISOString(),
      });
      client.invalidateQueries({ queryKey: ["current-user"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isSupabaseConfigured && user.cvStoragePath) {
        const supabase = createClient();
        await supabase.storage.from("cv-documents").remove([user.cvStoragePath]);
      }
      setLocalPreviewUrl(null);
      await userRepository.updateProfile({ cvFileName: undefined, cvStoragePath: undefined, cvUploadedAt: undefined });
      client.invalidateQueries({ queryKey: ["current-user"] });
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    setDialogOpen(true);
    setPreviewError(null);

    if (localPreviewUrl) {
      setPreviewUrl(localPreviewUrl);
      return;
    }

    if (isSupabaseConfigured && user.cvStoragePath) {
      setPreviewLoading(true);
      try {
        const supabase = createClient();
        const { data, error: signError } = await supabase.storage
          .from("cv-documents")
          .createSignedUrl(user.cvStoragePath, 60);
        if (signError || !data) throw signError ?? new Error("Couldn't generate a preview link.");
        setPreviewUrl(data.signedUrl);
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : "Couldn't load the preview.");
      } finally {
        setPreviewLoading(false);
      }
      return;
    }

    // Mock mode with no in-memory file from this session — nothing real to show.
    setPreviewUrl(null);
  };

  if (!user.cvFileName) {
    return (
      <div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-z-border-strong p-6 text-center hover:bg-z-surface">
          <Upload className="h-5 w-5 text-z-ink-faint" />
          <span className="text-sm font-medium text-z-ink">Upload your CV</span>
          <span className="text-xs text-z-ink-faint">PDF only, up to 5MB</span>
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => replace(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="mt-2 text-xs text-z-danger">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-z-border bg-z-surface p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-z-brand-50 text-z-brand-600">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-z-ink">{user.cvFileName}</p>
            {user.cvUploadedAt && <p className="text-xs text-z-ink-faint">Uploaded {timeAgo(user.cvUploadedAt)}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="secondary" disabled={saving} onClick={openPreview}>
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => inputRef.current?.click()}>
            <RefreshCcw className="h-3.5 w-3.5" /> Replace
          </Button>
          <Button size="sm" variant="ghost" disabled={saving} onClick={discard}>
            <Trash2 className="h-3.5 w-3.5" /> Discard
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => replace(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-z-danger">{error}</p>}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={user.cvFileName} className="h-[85vh]">
        {previewLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-z-ink-faint">Loading preview…</div>
        ) : previewError ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-z-danger">{previewError}</div>
        ) : previewUrl ? (
          <iframe src={previewUrl} title={user.cvFileName} className="h-full w-full" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <FileText className="h-8 w-8 text-z-ink-faint" />
            <p className="text-sm font-medium text-z-ink">No stored file to preview yet</p>
            <p className="max-w-sm text-xs text-z-ink-faint">
              Mock mode only remembers your CV&apos;s filename, not the file itself. Connect Supabase and re-upload to
              get a real, reopenable preview — or upload a PDF now to preview it for this session.
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
