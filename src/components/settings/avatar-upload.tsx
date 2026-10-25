"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { Avatar } from "@/components/shared/avatar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { userRepository } from "@/lib/repositories";
import { cn } from "@/lib/utils";

export function AvatarUpload({ initials, currentUrl }: { initials: string; currentUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl;

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    // Show an instant local preview regardless of mode, then persist for
    // real if Supabase is configured.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    if (!isSupabaseConfigured) {
      // MOCK MODE: nothing to persist to — the local preview above is all
      // that's available, and it won't survive a refresh.
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new photo shows immediately instead of a stale
      // cached copy at the same URL.
      const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      await userRepository.updateProfile({ avatarUrl: url });
      client.invalidateQueries({ queryKey: ["current-user"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setPreview(null);
    setError(null);
    if (!isSupabaseConfigured) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.storage.from("avatars").list(user.id).then(({ data }) => {
          const paths = (data ?? []).map((f) => `${user.id}/${f.name}`);
          if (paths.length) return supabase.storage.from("avatars").remove(paths);
        });
      }
      await userRepository.updateProfile({ avatarUrl: undefined });
      client.invalidateQueries({ queryKey: ["current-user"] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="group relative h-16 w-16 shrink-0">
        <div className={cn("h-16 w-16 overflow-hidden rounded-full bg-z-brand-50 text-lg font-semibold text-z-brand-600")}>
          <Avatar url={displayUrl} initials={initials} />
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Change photo"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-left text-xs font-semibold text-z-brand hover:underline disabled:opacity-50"
        >
          Upload new photo
        </button>
        {displayUrl && (
          <button
            onClick={remove}
            disabled={uploading}
            className="inline-flex w-fit items-center gap-1 text-xs text-z-ink-faint hover:text-z-danger disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
        {!isSupabaseConfigured && (
          <p className="text-[11px] text-z-ink-faint">Mock mode — photo won&apos;t persist after refresh.</p>
        )}
        {error && <p className="text-[11px] text-z-danger">{error}</p>}
      </div>
    </div>
  );
}
