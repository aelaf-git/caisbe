import DOMPurify from "isomorphic-dompurify";

// Keep aligned with api/app/html_sanitize.py ALLOWED_TAGS / ALLOWED_ATTRIBUTES.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
  "code",
  "pre",
  "span",
  "mark",
  "hr",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "class", "style"];

function hardenLinks(node: Element): void {
  if (node.tagName !== "A") return;
  const target = node.getAttribute("target");
  if (target?.toLowerCase() === "_blank") {
    const rel = node.getAttribute("rel") ?? "";
    const parts = new Set(rel.split(/\s+/).filter(Boolean));
    parts.add("noopener");
    parts.add("noreferrer");
    node.setAttribute("rel", Array.from(parts).join(" "));
  }
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  hardenLinks(node);
});

/** Sanitize LMS rich-text HTML before rendering with dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/** Normalize plain text or HTML topic/block bodies for safe display. */
export function sanitizeContentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) {
    return sanitizeHtml(trimmed);
  }
  return sanitizeHtml(`<p>${trimmed}</p>`);
}
