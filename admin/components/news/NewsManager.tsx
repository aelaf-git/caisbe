"use client";

import { useRef, useState, type RefObject } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, apiUpload, ApiError, type NewsPost } from "@/lib/auth";

const IMAGE_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif";
const VIDEO_ACCEPT = "video/*,.mp4,.webm,.mov,.m4v";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

function resetFileInput(ref: RefObject<HTMLInputElement | null>) {
  if (ref.current) ref.current.value = "";
}

function toInputDate(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fromInputDate(value: string) {
  if (!value) return null;
  return `${value}T12:00:00.000Z`;
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewsManager({
  posts,
  loading,
  onRefresh,
  onError,
  onSuccess,
  askConfirm,
}: {
  posts: NewsPost[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [postedOn, setPostedOn] = useState(todayInput());
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;

  function clearForm() {
    setEditingId(null);
    setTitle("");
    setTag("");
    setShortDescription("");
    setLongDescription("");
    setCoverUrl(null);
    setImageUrls([]);
    setVideoUrls([]);
    setPostedOn(todayInput());
    setPublished(true);
    setFeatured(false);
    setUploadProgress(0);
    resetFileInput(coverInputRef);
    resetFileInput(imagesInputRef);
    resetFileInput(videoInputRef);
  }

  function startEdit(post: NewsPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setTag(post.tag ?? "");
    setShortDescription(post.short_description ?? "");
    setLongDescription(post.long_description ?? "");
    setCoverUrl(post.cover_url);
    setImageUrls(post.image_urls ?? []);
    setVideoUrls(post.video_urls ?? []);
    setPostedOn(toInputDate(post.posted_on));
    setPublished(post.published);
    setFeatured(post.featured);
    resetFileInput(coverInputRef);
    resetFileInput(imagesInputRef);
    resetFileInput(videoInputRef);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadFile(file: File): Promise<string> {
    const uploaded = await apiUpload("/admin/uploads", file, {
      onProgress: (percent) => setUploadProgress(percent),
    });
    return uploaded.url;
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      setCoverUrl(await uploadFile(file));
      setUploadProgress(100);
      onSuccess("Cover image uploaded.");
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Cover upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const next = [...imageUrls];
      for (let i = 0; i < files.length; i += 1) {
        const file = files.item(i);
        if (!file) continue;
        next.push(await uploadFile(file));
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setImageUrls(next);
      onSuccess("Images uploaded.");
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Image upload failed.");
    } finally {
      setUploading(false);
      resetFileInput(imagesInputRef);
    }
  }

  async function uploadVideo(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadFile(file);
      setVideoUrls((prev) => [...prev, url]);
      setUploadProgress(100);
      onSuccess("Video uploaded.");
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Video upload failed.");
    } finally {
      setUploading(false);
      resetFileInput(videoInputRef);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    if (!postedOn) {
      onError("Post date is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        tag: tag.trim() || null,
        short_description: shortDescription.trim() || null,
        long_description: longDescription.trim() || null,
        cover_url: coverUrl,
        image_urls: imageUrls,
        video_urls: videoUrls,
        posted_on: fromInputDate(postedOn),
        published,
        featured,
      };
      if (isEditing) {
        await apiFetch(`/admin/news/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess("News post updated.");
      } else {
        await apiFetch("/admin/news", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess("News post created.");
      }
      clearForm();
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save news post.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(post: NewsPost) {
    try {
      await apiFetch(`/admin/news/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !post.published }),
      });
      onSuccess(post.published ? "News unpublished." : "News published.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to update publish state.");
    }
  }

  async function deletePost(post: NewsPost) {
    const ok = await askConfirm({
      title: "Delete news post?",
      description: `“${post.title}” will be removed from the site.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/news/${post.id}`, { method: "DELETE" });
      if (editingId === post.id) clearForm();
      onSuccess("News post deleted.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete news post.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div ref={formRef} className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-caisbe-text-dark">
              {isEditing ? "Edit news post" : "Add news post"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              Publish announcements with a cover image, gallery images, videos, and short/long
              descriptions.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Title">
              <input
                id="news-title"
                className={fieldClassName}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
            <FormField label="Tag (optional)">
              <input
                id="news-tag"
                className={fieldClassName}
                placeholder="Membership, Events, Learning…"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </FormField>
            <FormField label="Post date">
              <input
                id="news-date"
                type="date"
                className={fieldClassName}
                value={postedOn}
                onChange={(e) => setPostedOn(e.target.value)}
              />
            </FormField>
            <div className="flex flex-wrap items-end gap-4 pb-1">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-caisbe-text">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Published
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-caisbe-text">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                Featured
              </label>
            </div>
          </div>

          <FormField label="Short description">
            <textarea
              id="news-short"
              className={textAreaClassName}
              rows={3}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Shown on the news listing cards."
            />
          </FormField>

          <FormField label="Long description">
            <textarea
              id="news-long"
              className={textAreaClassName}
              rows={8}
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="Full announcement body on the detail page."
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Cover image">
              <input
                ref={coverInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className={fieldClassName}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
              />
              {coverUrl ? (
                <div className="mt-2 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt=""
                    className="h-28 w-full object-cover border border-ifma-border"
                  />
                  <Button variant="secondary" onClick={() => setCoverUrl(null)}>
                    Remove cover
                  </Button>
                </div>
              ) : null}
            </FormField>

            <FormField label="Additional images">
              <input
                ref={imagesInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                className={fieldClassName}
                onChange={(e) => void uploadImages(e.target.files)}
              />
              {imageUrls.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {imageUrls.map((url) => (
                    <li key={url} className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-14 w-20 object-cover border border-ifma-border"
                      />
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setImageUrls((prev) => prev.filter((item) => item !== url))
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </FormField>

            <FormField label="Videos">
              <input
                ref={videoInputRef}
                type="file"
                accept={VIDEO_ACCEPT}
                className={fieldClassName}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadVideo(file);
                }}
              />
              {videoUrls.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {videoUrls.map((url) => (
                    <li
                      key={url}
                      className="flex flex-wrap items-center gap-2 text-sm text-caisbe-muted"
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-caisbe-red hover:underline"
                      >
                        View video
                      </a>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setVideoUrls((prev) => prev.filter((item) => item !== url))
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </FormField>
          </div>

          {uploading ? <ProgressBar value={uploadProgress} /> : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleSave()} disabled={saving || uploading}>
              {saving ? "Saving…" : isEditing ? "Update post" : "Create post"}
            </Button>
            {isEditing ? (
              <Button variant="secondary" onClick={clearForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-ifma-border px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text-dark">News posts</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No news posts"
            description="Create your first announcement with cover media and descriptions."
          />
        ) : (
          <ul className="divide-y divide-ifma-border">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-caisbe-text-dark">{post.title}</p>
                    <Badge tone={post.published ? "success" : "neutral"}>
                      {post.published ? "Published" : "Draft"}
                    </Badge>
                    {post.featured ? <Badge tone="brand">Featured</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-caisbe-muted">
                    {toInputDate(post.posted_on)}
                    {post.tag ? ` · ${post.tag}` : ""}
                    {post.cover_url ? " · Cover" : ""}
                    {post.image_urls?.length
                      ? ` · ${post.image_urls.length} image${post.image_urls.length === 1 ? "" : "s"}`
                      : ""}
                    {post.video_urls?.length
                      ? ` · ${post.video_urls.length} video${post.video_urls.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => void togglePublished(post)}>
                    {post.published ? "Unpublish" : "Publish"}
                  </Button>
                  <EditIconButton
                    label={`Edit ${post.title}`}
                    onClick={() => startEdit(post)}
                  />
                  <DeleteIconButton
                    label={`Delete ${post.title}`}
                    onClick={() => void deletePost(post)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
