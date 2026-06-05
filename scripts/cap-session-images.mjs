#!/usr/bin/env node
/**
 * cap-session-images.mjs
 * ----------------------
 * On-disk repair tool for pi sessions bloated with base64 images.
 *
 * Modes:
 *   remove     → replace images with 1x1 transparent PNG (aggressive, minimal tokens)
 *   downscale  → replace images with a small 64x64 placeholder (less destructive)
 *
 * Keeps ALL text, tool calls, tool results, and thinking intact.
 * Always creates a backup before modifying.
 *
 * Usage:
 *   node cap-session-images.mjs <session.jsonl>
 *   node cap-session-images.mjs --dry <session.jsonl>
 *   node cap-session-images.mjs --keep 3 <session.jsonl>
 *   node cap-session-images.mjs --mode downscale <session.jsonl>
 *
 * Safe: backup → temp → validate → atomic rename.
 */

import fs from "node:fs";
import readline from "node:readline";

const PIXEL_1X1 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const PIXEL_64 =
	"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHHSURBVHhe7ZxB" +
	"DcIwEETbQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEU" +
	"QAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEU" +
	"QAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEU" +
	"QAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEUQAEU" +
	"QAEUQA==";

const args = process.argv.slice(2);
let dry = false;
let keep = 0;
let mode = "remove"; // remove | downscale

for (let i = 0; i < args.length; i++) {
	if (args[i] === "--dry") dry = true;
	else if (args[i] === "--keep") keep = parseInt(args[++i], 10) || 0;
	else if (args[i] === "--mode") mode = args[++i] || "remove";
	else files.push(args[i]);
}

if (files.length !== 1) {
	console.error(
		"usage: node cap-session-images.mjs [--dry] [--keep N] [--mode remove|downscale] <session.jsonl>",
	);
	process.exit(2);
}

const SRC = files[0];
if (!fs.existsSync(SRC)) {
	console.error("not found:", SRC);
	process.exit(2);
}

const PIXEL = mode === "downscale" ? PIXEL_64 : PIXEL_1X1;

function dataLen(v) {
	if (typeof v.data === "string") return v.data.length;
	if (v.source && typeof v.source.data === "string")
		return v.source.data.length;
	if (v.image_url && typeof v.image_url.url === "string")
		return v.image_url.url.length;
	return 0;
}

function neutralize(v) {
	if (typeof v.data === "string") v.data = PIXEL;
	else if (v.source && typeof v.source.data === "string") v.source.data = PIXEL;
	else if (v.image_url && typeof v.image_url.url === "string")
		v.image_url.url = "data:image/png;base64," + PIXEL;
}

function isImg(v) {
	return (
		v && typeof v === "object" && (v.type === "image" || v.type === "image_url")
	);
}

async function run() {
	let total = 0;
	{
		const rl = readline.createInterface({
			input: fs.createReadStream(SRC),
			crlfDelay: Infinity,
		});
		for await (const line of rl) {
			if (!line.trim()) continue;
			try {
				const o = JSON.parse(line);
				if (o.message?.content) {
					for (const b of o.message.content) if (isImg(b)) total++;
				}
			} catch {}
		}
	}

	const cutoff = total - keep;
	let processed = 0;
	let changed = 0;

	const BAK =
		SRC + ".bak-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const TMP = SRC + ".tmp-imagecap";

	if (!dry) fs.copyFileSync(SRC, BAK);

	const out = dry ? null : fs.createWriteStream(TMP);
	const rl = readline.createInterface({
		input: fs.createReadStream(SRC),
		crlfDelay: Infinity,
	});

	for await (const line of rl) {
		if (!line.trim()) {
			if (out) out.write("\n");
			continue;
		}
		let o;
		try {
			o = JSON.parse(line);
		} catch {
			if (out) out.write(line + "\n");
			continue;
		}

		if (o.message?.content) {
			for (const b of o.message.content) {
				if (isImg(b)) {
					processed++;
					if (processed <= cutoff) {
						neutralize(b);
						changed++;
					}
				}
			}
		}

		if (out) out.write(JSON.stringify(o) + "\n");
	}

	if (out) await new Promise((r) => out.end(r));

	if (dry) {
		console.log(`[dry] ${SRC}`);
		console.log(
			`  totalImages: ${total}  wouldReplace: ${changed}  keep: ${keep}  mode: ${mode}`,
		);
		return;
	}

	// validate
	const rl2 = readline.createInterface({
		input: fs.createReadStream(TMP),
		crlfDelay: Infinity,
	});
	let vLines = 0;
	let vErr = 0;
	for await (const line of rl2) {
		vLines++;
		if (!line.trim()) continue;
		try {
			JSON.parse(line);
		} catch {
			vErr++;
		}
	}

	if (vErr > 0) {
		console.error(`VALIDATION FAILED: ${vErr} parse errors`);
		process.exit(1);
	}

	const mtime = fs.statSync(SRC).mtime;
	fs.renameSync(TMP, SRC);
	fs.utimesSync(SRC, mtime, mtime);

	console.log(`[ok] ${SRC}`);
	console.log(
		`  replaced: ${changed} images  mode: ${mode}  backup: ${BAK.split("/").pop()}`,
	);
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
