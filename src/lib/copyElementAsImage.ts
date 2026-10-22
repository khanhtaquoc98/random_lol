"use client";

const imageDataUrlCache = new Map<string, string>();

async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url;
  if (imageDataUrlCache.has(url)) {
    return imageDataUrlCache.get(url)!;
  }

  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to data URL"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    imageDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

function collectSameOriginCssText(): string {
  const cssChunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        const text = rule.cssText;
        // Skip external @import or @font-face with remote URLs so SVG foreignObject never blocks or taints
        if (text.startsWith("@import")) continue;
        if (text.startsWith("@font-face") && text.includes("http")) continue;
        cssChunks.push(text);
      }
    } catch {
      // Cross-origin stylesheet; ignore
    }
  }

  return cssChunks.join("\n");
}

async function inlineImagesInClone(
  originalRoot: HTMLElement,
  clonedRoot: HTMLElement
): Promise<void> {
  const origImgs = Array.from(originalRoot.querySelectorAll("img"));
  const cloneImgs = Array.from(clonedRoot.querySelectorAll("img"));

  await Promise.all(
    cloneImgs.map(async (cloneImg, idx) => {
      const origImg = origImgs[idx];
      const src = origImg?.currentSrc || origImg?.src || cloneImg.getAttribute("src") || "";
      cloneImg.removeAttribute("loading");
      cloneImg.removeAttribute("srcset");

      if (!src) return;

      const dataUrl = await fetchUrlAsDataUrl(src);
      if (dataUrl) {
        cloneImg.setAttribute("src", dataUrl);
      } else {
        // Fallback transparent 1x1 pixel so broken/blocked external image never taints the canvas
        cloneImg.setAttribute(
          "src",
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
    })
  );
}

export async function renderElementToPngBlob(
  element: HTMLElement,
  options?: {
    backgroundColor?: string;
    paddingPx?: number;
    watermarkText?: string;
  }
): Promise<Blob> {
  const padding = options?.paddingPx ?? 20;
  const bgColor = options?.backgroundColor ?? "#080b13";

  const rect = element.getBoundingClientRect();
  const contentWidth = Math.max(Math.ceil(rect.width), element.scrollWidth, 360);
  const contentHeight = Math.max(Math.ceil(rect.height), element.scrollHeight, 120);

  const clone = element.cloneNode(true) as HTMLElement;

  // Remove interactive toolbar elements marked with data-export-ignore="true"
  clone
    .querySelectorAll('[data-export-ignore="true"]')
    .forEach((el) => el.remove());

  await inlineImagesInClone(element, clone);

  // Ensure root clone has explicit width and no outer margin
  clone.style.width = `${contentWidth}px`;
  clone.style.maxWidth = `${contentWidth}px`;
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";

  const compiledCss = collectSameOriginCssText();
  const bodyComputed = window.getComputedStyle(document.body);
  const fontFamily =
    bodyComputed.fontFamily ||
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const watermarkHeight = options?.watermarkText ? 36 : 0;
  const totalWidth = contentWidth + padding * 2;
  const totalHeight = contentHeight + padding * 2 + watermarkHeight;

  const wrapperDiv = document.createElement("div");
  wrapperDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapperDiv.className = `${document.documentElement.className} ${document.body.className}`;
  wrapperDiv.style.width = `${totalWidth}px`;
  wrapperDiv.style.height = `${totalHeight}px`;
  wrapperDiv.style.padding = `${padding}px`;
  wrapperDiv.style.backgroundColor = bgColor;
  wrapperDiv.style.fontFamily = fontFamily;
  wrapperDiv.style.color = "#f1f5f9";
  wrapperDiv.style.boxSizing = "border-box";

  wrapperDiv.appendChild(clone);

  if (options?.watermarkText) {
    const footer = document.createElement("div");
    footer.style.marginTop = "10px";
    footer.style.display = "flex";
    footer.style.alignItems = "center";
    footer.style.justifyContent = "space-between";
    footer.style.fontSize = "11px";
    footer.style.fontWeight = "700";
    footer.style.color = "#38bdf8";
    footer.style.paddingTop = "6px";
    footer.style.borderTop = "1px solid #1f2844";
    footer.textContent = options.watermarkText;
    wrapperDiv.appendChild(footer);
  }

  const serializedHtml = new XMLSerializer().serializeToString(wrapperDiv);

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
    <defs>
      <style type="text/css"><![CDATA[
        ${compiledCss}
        * { box-sizing: border-box; }
      ]]></style>
    </defs>
    <foreignObject x="0" y="0" width="${totalWidth}" height="${totalHeight}">
      ${serializedHtml}
    </foreignObject>
  </svg>`;

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svgString
  )}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Không thể kết xuất giao diện thành hình ảnh."));
    image.src = svgDataUrl;
  });

  // Cap scale so canvas dimension stays within safe browser limits (<= 8000px)
  const maxDimension = Math.max(totalWidth, totalHeight, 1);
  const scale = Math.min(2, Math.max(1, 7600 / maxDimension));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(totalWidth * scale);
  canvas.height = Math.round(totalHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, totalWidth, totalHeight);
  ctx.drawImage(img, 0, 0, totalWidth, totalHeight);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Không thể xuất dữ liệu ảnh PNG."));
      },
      "image/png",
      0.95
    );
  });

  return pngBlob;
}

export async function copyElementAsPngToClipboard(
  element: HTMLElement,
  options?: {
    filename?: string;
    watermarkText?: string;
  }
): Promise<{ mode: "CLIPBOARD" | "DOWNLOAD" }> {
  const filename = options?.filename || `lol-ai-analysis-${Date.now()}.png`;
  const blobPromise = renderElementToPngBlob(element, {
    watermarkText: options?.watermarkText,
  });

  // Modern Clipboard API with ClipboardItem
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof window !== "undefined" &&
    "ClipboardItem" in window
  ) {
    try {
      // First try passing Promise<Blob> directly to preserve transient user activation in Safari/WebKit
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blobPromise,
        }),
      ]);
      return { mode: "CLIPBOARD" };
    } catch {
      try {
        const resolvedBlob = await blobPromise;
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": resolvedBlob,
          }),
        ]);
        return { mode: "CLIPBOARD" };
      } catch {
        // Fall through to file download if clipboard write permission is denied
      }
    }
  }

  // Fallback: trigger PNG download
  const blob = await blobPromise;
  downloadBlobAsFile(blob, filename);
  return { mode: "DOWNLOAD" };
}

export async function downloadElementAsPng(
  element: HTMLElement,
  options?: {
    filename?: string;
    watermarkText?: string;
  }
): Promise<void> {
  const filename = options?.filename || `lol-ai-analysis-${Date.now()}.png`;
  const blob = await renderElementToPngBlob(element, {
    watermarkText: options?.watermarkText,
  });
  downloadBlobAsFile(blob, filename);
}

function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
