/** Turn a Word clipboard HTML fragment into editor HTML. */

const KEEP_STYLE = ["font-size", "color", "background-color", "text-align"] as const;

export function isWordHtml(html: string): boolean {
  return /class\s*=\s*["']?Mso|urn:schemas-microsoft-com|<o:p\b|mso-list:|MsoNormal|MsoList/i.test(html);
}

export function cleanWordHtml(html: string): { html: string; skippedFileImages: number } {
  const stripped = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, "");
  const doc = new DOMParser().parseFromString(stripped, "text/html");
  doc.querySelectorAll("style, script, meta, link, title, xml").forEach((node) => node.remove());
  removeComments(doc);
  stripOfficeTags(doc.body);
  convertLists(doc.body);
  promoteHeadings(doc.body);
  let skippedFileImages = 0;
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src || /^file:/i.test(src) || /^cid:/i.test(src)) {
      skippedFileImages += 1;
      img.remove();
    }
  });
  doc.body.querySelectorAll("*").forEach((el) => cleanElement(el as HTMLElement));
  ensureTableCells(doc.body);
  return { html: doc.body.innerHTML, skippedFileImages };
}

export function dataUrlToFile(dataUrl: string, name: string): File | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  const type = match[1];
  const binary = atob(match[2].replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const extension = type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return new File([bytes], name.endsWith(`.${extension}`) ? name : `${name}.${extension}`, { type });
}

export async function replaceDataImages(
  html: string,
  upload: (file: File) => Promise<string>,
): Promise<string> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(doc.querySelectorAll("img"));
  let index = 0;
  for (const img of images) {
    const src = img.getAttribute("src") || "";
    if (!src.startsWith("data:image/")) continue;
    index += 1;
    const file = dataUrlToFile(src, `word-image-${index}`);
    if (!file) {
      img.remove();
      continue;
    }
    const url = await upload(file);
    img.setAttribute("src", url);
  }
  return doc.body.innerHTML;
}

function removeComments(root: Document | HTMLElement) {
  const doc = root.nodeType === Node.DOCUMENT_NODE ? (root as Document) : root.ownerDocument;
  if (!doc) return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.forEach((comment) => comment.remove());
}

function stripOfficeTags(root: HTMLElement) {
  let pending = true;
  while (pending) {
    pending = false;
    for (const el of Array.from(root.querySelectorAll("*"))) {
      if (!el.tagName.includes(":")) continue;
      unwrap(el);
      pending = true;
      break;
    }
  }
}

function unwrap(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  el.remove();
}

function peekList(el: Element): { level: number; ordered: boolean } | null {
  if (el.tagName !== "P" && el.tagName !== "H1" && el.tagName !== "H2" && el.tagName !== "H3") return null;
  const style = el.getAttribute("style") || "";
  const className = el.getAttribute("class") || "";
  const levelMatch = style.match(/mso-list:\s*l\d+\s+level(\d+)/i);
  if (!levelMatch && !/MsoList/i.test(className)) return null;
  const marker = markerText(el);
  return {
    level: levelMatch ? Math.max(1, Number(levelMatch[1])) : 1,
    ordered: /^(\d+|[a-z]|[ivxlcdm]+)[.)]$/i.test(marker),
  };
}

function markerText(el: Element): string {
  const ignore = findIgnore(el);
  const fromIgnore = (ignore?.textContent || "").replace(/\u00a0/g, " ").trim();
  if (fromIgnore) return fromIgnore.split(/\s+/)[0] || "";
  const text = (el.textContent || "").replace(/\u00a0/g, " ").trim();
  const match = text.match(/^(\d+[.)]|[a-z][.)]|[ivxlcdm]+[.)]|[•·●○■▪‣])\s*/i);
  return match?.[1] || "";
}

function findIgnore(el: Element): HTMLElement | null {
  return (
    Array.from(el.querySelectorAll("span")).find((span) =>
      /mso-list\s*:\s*Ignore/i.test(span.getAttribute("style") || ""),
    ) ?? null
  );
}

function isBlankText(node: ChildNode): boolean {
  return node.nodeType === Node.TEXT_NODE && !(node.textContent || "").replace(/\u00a0/g, " ").trim();
}

function convertLists(parent: HTMLElement) {
  const nodes = Array.from(parent.childNodes);
  const fragment = document.createDocumentFragment();
  let index = 0;
  while (index < nodes.length) {
    const node = nodes[index];
    if (isBlankText(node)) {
      fragment.appendChild(node);
      index += 1;
      continue;
    }
    if (node.nodeType === Node.ELEMENT_NODE && peekList(node as Element)) {
      const built = buildList(nodes, index, peekList(node as Element)!.level);
      fragment.appendChild(built.list);
      index = built.next;
      continue;
    }
    fragment.appendChild(node);
    if (node.nodeType === Node.ELEMENT_NODE) convertLists(node as HTMLElement);
    index += 1;
  }
  parent.replaceChildren(...Array.from(fragment.childNodes));
}

function buildList(
  nodes: ChildNode[],
  start: number,
  level: number,
): { list: HTMLElement; next: number } {
  const first = peekList(nodes[start] as Element)!;
  const list = document.createElement(first.ordered ? "ol" : "ul");
  let index = start;
  while (index < nodes.length) {
    const node = nodes[index];
    if (isBlankText(node)) {
      index += 1;
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) break;
    const meta = peekList(node as Element);
    if (!meta || meta.level < level) break;
    if (meta.level === level && meta.ordered !== first.ordered) break;
    if (meta.level > level) {
      const nested = buildList(nodes, index, meta.level);
      const last = list.lastElementChild;
      if (last) last.appendChild(nested.list);
      else {
        const item = document.createElement("li");
        item.appendChild(document.createElement("p"));
        item.appendChild(nested.list);
        list.appendChild(item);
      }
      index = nested.next;
      continue;
    }
    list.appendChild(takeListItem(node as HTMLElement));
    index += 1;
  }
  return { list, next: index };
}

function takeListItem(el: HTMLElement): HTMLElement {
  const ignore = findIgnore(el);
  ignore?.remove();
  if (!ignore) stripLeadingMarker(el);
  const paragraph = document.createElement("p");
  const align = textAlign(el.getAttribute("style") || "");
  if (align) paragraph.setAttribute("style", `text-align: ${align}`);
  while (el.firstChild) paragraph.appendChild(el.firstChild);
  const item = document.createElement("li");
  item.appendChild(paragraph);
  return item;
}

function stripLeadingMarker(el: HTMLElement) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNode = walker.nextNode() as Text | null;
  if (!textNode) return;
  textNode.data = textNode.data.replace(/^(?:\u00a0|\s)*(?:\d+[.)]|[a-z][.)]|[ivxlcdm]+[.)]|[•·●○■▪‣])\s*/i, "");
}

function promoteHeadings(root: HTMLElement) {
  root.querySelectorAll("p").forEach((paragraph) => {
    const level = headingLevel(paragraph);
    if (!level) return;
    const heading = document.createElement(`h${level}`);
    while (paragraph.firstChild) heading.appendChild(paragraph.firstChild);
    const style = filterStyle(paragraph.getAttribute("style") || "");
    if (style) heading.setAttribute("style", style);
    paragraph.replaceWith(heading);
  });
}

function headingLevel(el: Element): number | null {
  const className = el.getAttribute("class") || "";
  if (/MsoTitle/i.test(className)) return 1;
  const named = className.match(/MsoHeading(\d)/i);
  if (named) return Math.min(3, Number(named[1]) || 1);
  const outline = (el.getAttribute("style") || "").match(/mso-outline-level:\s*(\d)/i);
  if (outline) return Math.min(3, Number(outline[1]) || 1);
  return null;
}

function ensureTableCells(root: HTMLElement) {
  root.querySelectorAll("td, th").forEach((cell) => {
    const blocks = new Set(["P", "H1", "H2", "H3", "UL", "OL", "BLOCKQUOTE", "TABLE", "HR"]);
    const children = Array.from(cell.childNodes);
    const hasBlock = children.some(
      (node) => node.nodeType === Node.ELEMENT_NODE && blocks.has((node as Element).tagName),
    );
    if (!hasBlock) {
      const paragraph = document.createElement("p");
      while (cell.firstChild) paragraph.appendChild(cell.firstChild);
      cell.appendChild(paragraph);
      return;
    }
    let pending: ChildNode[] = [];
    const flush = (before: ChildNode | null) => {
      if (!pending.length) return;
      const paragraph = document.createElement("p");
      pending.forEach((node) => paragraph.appendChild(node));
      cell.insertBefore(paragraph, before);
      pending = [];
    };
    children.forEach((node) => {
      const isBlock = node.nodeType === Node.ELEMENT_NODE && blocks.has((node as Element).tagName);
      if (isBlock) flush(node);
      else pending.push(node);
    });
    flush(null);
  });
}

function cleanElement(el: HTMLElement) {
  if (el.tagName === "FONT") {
    const color = el.getAttribute("color") || "";
    const span = document.createElement("span");
    if (isSafeColor(color)) span.setAttribute("style", `color: ${color}`);
    while (el.firstChild) span.appendChild(el.firstChild);
    el.replaceWith(span);
    cleanElement(span);
    return;
  }

  const colspan = el.getAttribute("colspan");
  const rowspan = el.getAttribute("rowspan");
  const href = el.getAttribute("href");
  const src = el.getAttribute("src");
  const alt = el.getAttribute("alt");
  const style = filterStyle(el.getAttribute("style") || "");
  for (const attribute of Array.from(el.attributes)) el.removeAttribute(attribute.name);

  if ((el.tagName === "TD" || el.tagName === "TH") && colspan && /^\d+$/.test(colspan)) {
    el.setAttribute("colspan", colspan);
  }
  if ((el.tagName === "TD" || el.tagName === "TH") && rowspan && /^\d+$/.test(rowspan)) {
    el.setAttribute("rowspan", rowspan);
  }
  if (el.tagName === "A" && href && /^(https?:|mailto:)/i.test(href.trim())) {
    el.setAttribute("href", href.trim());
  }
  if (el.tagName === "IMG" && src && !/^javascript:/i.test(src) && (src.startsWith("data:image/") || !src.startsWith("data:"))) {
    el.setAttribute("src", src);
    if (alt) el.setAttribute("alt", alt);
  }
  if (style) el.setAttribute("style", style);
  promoteHighlight(el);
  if (el.tagName === "SPAN" && !el.getAttribute("style") && el.attributes.length === 0) unwrap(el);
  if (el.tagName === "A" && !el.getAttribute("href")) unwrap(el);
}

function promoteHighlight(el: HTMLElement) {
  if (el.tagName !== "SPAN") return;
  const style = el.getAttribute("style") || "";
  const background = style.match(/(?:^|;)\s*background-color:\s*([^;]+)/i)?.[1]?.trim();
  if (!background) return;
  const rest = style
    .replace(/(?:^|;)\s*background-color:\s*[^;]+;?/i, ";")
    .replace(/^;+|;+$/g, "")
    .replace(/;{2,}/g, ";")
    .trim();
  const mark = document.createElement("mark");
  mark.setAttribute("style", `background-color: ${background}`);
  while (el.firstChild) mark.appendChild(el.firstChild);
  el.appendChild(mark);
  if (rest) el.setAttribute("style", rest);
  else el.removeAttribute("style");
  if (!el.getAttribute("style")) unwrap(el);
}

function filterStyle(style: string): string {
  const kept: string[] = [];
  for (const chunk of style.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon <= 0) continue;
    const key = chunk.slice(0, colon).trim().toLowerCase();
    let value = chunk.slice(colon + 1).trim();
    if (key === "background" && isSafeColor(value)) {
      kept.push(`background-color: ${value}`);
      continue;
    }
    if (!KEEP_STYLE.includes(key as (typeof KEEP_STYLE)[number])) continue;
    if (/mso-|expression|url\s*\(/i.test(value)) continue;
    if (key === "font-size") {
      const normalized = normalizeFontSize(value);
      if (!normalized) continue;
      value = normalized;
    } else if ((key === "color" || key === "background-color") && !isSafeColor(value)) {
      continue;
    } else if (key === "text-align") {
      const align = textAlign(value);
      if (!align) continue;
      value = align;
    }
    kept.push(`${key}: ${value}`);
  }
  return kept.join("; ");
}

function textAlign(styleOrValue: string): string | null {
  const value = styleOrValue.includes(":")
    ? styleOrValue.match(/(?:^|;)\s*text-align:\s*([^;]+)/i)?.[1]?.trim().toLowerCase() || ""
    : styleOrValue.trim().toLowerCase();
  return value === "left" || value === "right" || value === "center" || value === "justify" ? value : null;
}

function normalizeFontSize(value: string): string | null {
  const point = value.match(/^([\d.]+)\s*pt$/i);
  if (point) return `${Math.max(1, Math.round((Number(point[1]) * 96) / 72))}px`;
  const pixel = value.match(/^([\d.]+)\s*px$/i);
  if (pixel) return `${Math.max(1, Math.round(Number(pixel[1])))}px`;
  return null;
}

function isSafeColor(value: string): boolean {
  const color = value.trim().toLowerCase();
  if (!color || /url\s*\(|expression|javascript/.test(color)) return false;
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return true;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) {
    return true;
  }
  return /^(?:black|white|red|green|blue|yellow|orange|gray|grey|purple|navy|teal|maroon|silver|fuchsia|aqua|lime|olive)$/.test(
    color,
  );
}
