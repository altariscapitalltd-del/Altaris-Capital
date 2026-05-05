---
summary: "Workspace template for TOOLS.md"
read_when:
  - Bootstrapping a workspace manually
---

# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

## Model Routing

Use these OpenClaw aliases when switching models:

- `fast` → `openai-codex/gpt-5.4-mini`
- `balanced` → `openai-codex/gpt-5.4`
- `deep` → `openai-codex/gpt-5.4-pro`
- `coder` → `openai-codex/gpt-5.3-codex`
- `spark` → `openai-codex/gpt-5.3-codex-spark`
- `mini` → `openai-codex/gpt-5.1-codex-mini`

Routing policy for Marne:

- Default to `balanced` for normal chat and mixed tasks.
- Use `fast` for quick lookups, short replies, and lightweight admin work.
- Use `deep` for harder reasoning, planning, audits, and important writing.
- Use `coder` for code-heavy debugging or implementation when it seems like the better fit.
- Use `spark` for brainstorming and creative direction.
- Fall back in this order if needed: `balanced` → `fast` → `mini`.

---

Add whatever helps you do your job. This is your cheat sheet.
