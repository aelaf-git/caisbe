export function toSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[®©]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "page"
  );
}

export function buildPath(...segments: string[]): string {
  return `/${segments.map(toSlug).join("/")}`;
}

export function slugToTitle(slug: string[]): string {
  return slug
    .map((part) =>
      part
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" / ");
}

export function linkPath(label: string, ...prefix: string[]): string {
  return buildPath(...prefix, label);
}
