# pi-context-image-cap

Prevent old screenshots and images from bloating your pi sessions.

[한국어](./README.ko.md)

This package helps keep context usage under control when you frequently paste images from browsers, winshot, or other sources.

## Why this exists

Pi's built-in compaction focuses on summarizing text. Images (base64) stay as-is, so they keep getting resent to the provider on every request. Over time this makes sessions heavier and can trigger unnecessary or failed compactions.

This package offers two layers of protection:

- A live extension that trims old images before they reach the provider
- An offline script that cleans up already bloated session files

## What's included

### Live prevention (extension)

`extensions/context-image-cap.ts`

Automatically keeps only the most recent images when sending requests to the model. Older images are replaced with a short text placeholder.

This does not modify your on-disk session history — only the data sent to the provider.

### Offline repair (script)

`scripts/cap-session-images.mjs`

Cleans up existing `.jsonl` session files that have grown too large due to accumulated images.

```bash
# Preview what would change
node scripts/cap-session-images.mjs --dry session.jsonl

# Replace images with 1x1 placeholder (minimal tokens)
node scripts/cap-session-images.mjs session.jsonl

# Replace with small 64x64 images instead (less destructive)
node scripts/cap-session-images.mjs --mode downscale session.jsonl

# Keep the last 5 images and clean the rest
node scripts/cap-session-images.mjs --keep 5 session.jsonl
```

Always creates a backup before modifying files.

## Installation

```bash
pi install git:Blue-B/pi-context-image-cap
```

## Notes

- This tool reduces image data sent to the model. If your workflow requires seeing older screenshots, consider increasing `KEEP_IMAGES` or using `--mode downscale`.
- The offline script is destructive to image data in the session file. Always review with `--dry` first.
- These tools are not limited to `claude-bridge`. They can help with any provider when image usage becomes heavy.

## License

MIT

## Support

If this package helps you, consider supporting the work:

- [GitHub Sponsors](https://github.com/sponsors/Blue-B)
- [Buy Me a Coffee](https://www.buymeacoffee.com/blueb)
- [Ko-fi](https://ko-fi.com/blueb)
