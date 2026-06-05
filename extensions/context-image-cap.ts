import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * cap-context-images
 * --------------------
 * Durable fix for the "infinite compaction" / "Prompt is too long during turn-prefix
 * summarization" loop on the pi <-> claude-bridge path.
 *
 * Root cause: pi/claude-bridge has no image-aware context management. Full-resolution
 * base64 screenshots (browser/winshot/gpt-image) accumulate in the session and are
 * re-sent on EVERY provider request, including the compaction summarizer request.
 * Compaction can only summarize text — images are kept verbatim or dropped — so once
 * enough images pile up the payload never drops below the threshold and summarization
 * itself overflows the model context ("Prompt is too long").
 *
 * Fix: on every outbound provider request, keep only the most recent KEEP_IMAGES image
 * blocks and replace older ones with a tiny text placeholder. The on-disk session jsonl
 * is NOT touched, so the user's transcript still shows the screenshots — only the bytes
 * sent to the model are trimmed.
 *
 * Tuning: change KEEP_IMAGES below. Revert: delete this file + /reload.
 */

const KEEP_IMAGES = 3;
const PLACEHOLDER = "[image omitted to conserve context — older screenshot trimmed by cap-context-images]";

type JsonObject = Record<string, unknown>;

function clonePayload<T>(payload: T): T {
  if (typeof structuredClone === "function") return structuredClone(payload);
  return JSON.parse(JSON.stringify(payload)) as T;
}

function isImageBlock(obj: JsonObject): boolean {
  if (obj.type === "image" || obj.type === "image_url") return true;
  return false;
}

/** Turn an image content block into a plain text block in-place. */
function neutralize(obj: JsonObject): void {
  for (const k of Object.keys(obj)) delete obj[k];
  obj.type = "text";
  obj.text = PLACEHOLDER;
}

export default function (pi: ExtensionAPI) {
  pi.on("before_provider_request", (event) => {
    const root = clonePayload(event.payload) as JsonObject;

    // First pass: collect every image content block in document order.
    const imageBlocks: JsonObject[] = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }
      const obj = value as JsonObject;
      if (isImageBlock(obj)) imageBlocks.push(obj);
      for (const item of Object.values(obj)) visit(item);
    };
    visit(root);

    if (imageBlocks.length <= KEEP_IMAGES) return undefined;

    // Neutralize all but the last KEEP_IMAGES images.
    const cutoff = imageBlocks.length - KEEP_IMAGES;
    for (let i = 0; i < cutoff; i++) neutralize(imageBlocks[i]);

    return root;
  });
}
