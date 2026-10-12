"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { EditIconButton } from "@/components/ui/IconPencil";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormField, { fieldClassName, textAreaClassName } from "@/components/ui/FormField";
import ProgressBar from "@/components/ui/ProgressBar";
import SaveButton from "@/components/ui/SaveButton";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, apiUpload, ApiError, type NewsPost } from "@/lib/auth";

type NewsTab = "posts" | "links";

function isLinkPost(post: NewsPost) {
  return Boolean((post.external_url || "").trim());
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

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
  const [tab, setTab] = useState<NewsTab>("posts");
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [postedOn, setPostedOn] = useState(todayInput());
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  const isEditing = editingId !== null;
  const isLinksTab = tab === "links";
  const visiblePosts = useMemo(
    () => posts.filter((post) => (isLinksTab ? isLinkPost(post) : !isLinkPost(post))),
    [posts, isLinksTab],
  );

  const formValues = useMemo(
    () => ({
      title: title.trim(),
      tag: tag.trim(),
      short_description: shortDescription.trim(),
      long_description: longDescription.trim(),
      external_url: externalUrl.trim(),
      cover_url: coverUrl,
      image_urls: imageUrls,
      video_urls: videoUrls,
      posted_on: postedOn,
      published,
      featured,
    }),
    [
      title,
      tag,
      shortDescription,
      longDescription,
      externalUrl,
      coverUrl,
      imageUrls,
      videoUrls,
      postedOn,
      published,
      featured,
    ],
  );
  const { dirty, resetBaseline } = useDirtyForm(formValues);

  function clearForm() {
    const posted = todayInput();
    setEditingId(null);
    setTitle("");
    setTag("");
    setShortDescription("");
    setLongDescription("");
    setExternalUrl("");
    setCoverUrl(null);
    setImageUrls([]);
    setVideoUrls([]);
    setPostedOn(posted);
    setPublished(true);
    setFeatured(false);
    setUploadProgress(0);
    resetFileInput(coverInputRef);
    resetFileInput(imagesInputRef);
    resetFileInput(videoInputRef);
    resetBaseline({
      title: "",
      tag: "",
      short_description: "",
      long_description: "",
      external_url: "",
      cover_url: null,
      image_urls: [],
      video_urls: [],
      posted_on: posted,
      published: true,
      featured: false,
    });
  }

  function changeTab(next: NewsTab) {
    setTab(next);
    clearForm();
  }

  function startEdit(post: NewsPost) {
    setTab(isLinkPost(post) ? "links" : "posts");
    setEditingId(post.id);
    setTitle(post.title);
    setTag(post.tag ?? "");
    setShortDescription(post.short_description ?? "");
    setLongDescription(post.long_description ?? "");
    setExternalUrl(post.external_url ?? "");
    setCoverUrl(post.cover_url);
    setImageUrls(post.image_urls ?? []);
    setVideoUrls(post.video_urls ?? []);
    setPostedOn(toInputDate(post.posted_on));
    setPublished(post.published);
    setFeatured(post.featured);
    resetFileInput(coverInputRef);
    resetFileInput(imagesInputRef);
    resetFileInput(videoInputRef);
    resetBaseline({
      title: post.title.trim(),
      tag: (post.tag ?? "").trim(),
      short_description: (post.short_description ?? "").trim(),
      long_description: (post.long_description ?? "").trim(),
      external_url: (post.external_url ?? "").trim(),
      cover_url: post.cover_url,
      image_urls: post.image_urls ?? [],
      video_urls: post.video_urls ?? [],
      posted_on: toInputDate(post.posted_on),
      published: post.published,
      featured: post.featured,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadFile(file: File): Promise<string> {
    const uploaded = await apiUpload("/admin/uploads", file, {
      folder: "news",
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
    if (!dirty) return;
    if (!title.trim()) {
      onError("Title is required.");
      return;
    }
    if (!postedOn) {
      onError("Post date is required.");
      return;
    }
    const link = externalUrl.trim();
    if (isLinksTab) {
      if (!link) {
        onError("Paste the article or page URL to share.");
        return;
      }
      if (!isHttpUrl(link)) {
        onError("The link must start with http:// or https://");
        return;
      }
    } else if (link && !isHttpUrl(link)) {
      onError("The link must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        tag: tag.trim() || null,
        short_description: shortDescription.trim() || null,
        long_description: isLinksTab ? null : longDescription.trim() || null,
        external_url: link || null,
        cover_url: coverUrl,
        image_urls: isLinksTab ? [] : imageUrls,
        video_urls: isLinksTab ? [] : videoUrls,
        posted_on: fromInputDate(postedOn),
        published,
        featured,
      };
      if (isEditing) {
        await apiFetch(`/admin/news/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onSuccess(isLinksTab ? "Shared link updated." : "News post updated.");
      } else {
        await apiFetch("/admin/news", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onSuccess(isLinksTab ? "Shared link created." : "News post created.");
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
      <Tabs
        ariaLabel="News sections"
        value={tab}
        onChange={changeTab}
        items={[
          {
            id: "posts",
            label: "Posts",
            count: posts.filter((post) => !isLinkPost(post)).length,
          },
          {
            id: "links",
            label: "Links",
            count: posts.filter((post) => isLinkPost(post)).length,
          },
        ]}
      />

      <Card>
        <div ref={formRef} className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-caisbe-text-dark">
              {isLinksTab
                ? isEditing
                  ? "Edit shared link"
                  : "Share a link"
                : isEditing
                  ? "Edit news post"
                  : "Add news post"}
            </h2>
            <p className="mt-1 text-sm text-caisbe-muted">
              {isLinksTab
                ? "Paste an external article or page URL. Visitors open the link from News & Announcements."
                : "Publish announcements with a cover image, gallery images, videos, and short/long descriptions."}
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

          <FormField
            label={isLinksTab ? "Article or page URL" : "External link (optional)"}
            hint={
              isLinksTab
                ? "Required. Example: https://example.com/article"
                : "Optional. Add a URL if this post should also open an external article."
            }
          >
            <input
              id="news-external-url"
              type="url"
              inputMode="url"
              className={fieldClassName}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://"
              required={isLinksTab}
            />
          </FormField>

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

          {!isLinksTab ? (
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
          ) : null}

          <div className={`grid gap-4 ${isLinksTab ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
            <FormField label="Cover image (optional)">
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
                    className="h-28 w-full max-w-sm object-cover border border-ifma-border"
                  />
                  <Button variant="secondary" onClick={() => setCoverUrl(null)}>
                    Remove cover
                  </Button>
                </div>
              ) : null}
            </FormField>

            {!isLinksTab ? (
              <>
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
              </>
            ) : null}
          </div>

          {uploading ? <ProgressBar value={uploadProgress} /> : null}

          <div className="flex flex-wrap gap-3">
            <SaveButton
              dirty={dirty}
              saving={saving}
              disabled={uploading}
              idleLabel={
                isLinksTab
                  ? isEditing
                    ? "Update link"
                    : "Share link"
                  : isEditing
                    ? "Update post"
                    : "Create post"
              }
              onClick={() => void handleSave()}
            />
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
          <h2 className="text-lg font-semibold text-caisbe-text-dark">
            {isLinksTab ? "Shared links" : "News posts"}
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : visiblePosts.length === 0 ? (
          <EmptyState
            title={isLinksTab ? "No shared links" : "No news posts"}
            description={
              isLinksTab
                ? "Paste an external article URL above to share it on the public news page."
                : "Create your first announcement with cover media and descriptions."
            }
          />
        ) : (
          <ul className="divide-y divide-ifma-border">
            {visiblePosts.map((post) => (
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
                    {isLinkPost(post) ? <Badge tone="neutral">Link</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-caisbe-muted">
                    {toInputDate(post.posted_on)}
                    {post.tag ? ` · ${post.tag}` : ""}
                    {post.external_url ? " · External link" : ""}
                    {post.cover_url ? " · Cover" : ""}
                    {post.image_urls?.length
                      ? ` · ${post.image_urls.length} image${post.image_urls.length === 1 ? "" : "s"}`
                      : ""}
                    {post.video_urls?.length
                      ? ` · ${post.video_urls.length} video${post.video_urls.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  {post.external_url ? (
                    <a
                      href={post.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block truncate text-sm font-semibold text-caisbe-red hover:underline"
                    >
                      {post.external_url}
                    </a>
                  ) : null}
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
