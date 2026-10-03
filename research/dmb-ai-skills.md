# AI skills, AI video/image generation, and licensing for Ko Kitchen DMB ads

Research date: 2026-09-29. All facts marked with the source URL that was read. Items that could not be verified against a primary source are marked **[uncertain]**.

Scope: motion-graphics animation for in-store digital menu boards (DMB), authored as JavaScript/WebGL, plus AI video/image generation and the commercial-use terms that decide whether output may run in a restaurant's paid in-store advertising.

---

## 1. AI skills / agent toolkits that generate animation code

### 1.1 GSAP official AI skills — the strongest, free, directly relevant hit

| Item | Value |
|---|---|
| Repo | `greensock/gsap-skills` (GitHub) — 15,774 stars, MIT license |
| Install | `npx skills add https://github.com/greensock/gsap-skills` or Claude Code `/plugin marketplace add greensock/gsap-skills` |
| Skills shipped | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-performance`, `gsap-frameworks` |
| What it generates | Correct GSAP code: timelines, sequencing, SplitText/MorphSVG/SVG plugins, React `useGSAP` patterns, performance guidance |
| License | GSAP itself is **100% free including every plugin** after Webflow's acquisition of GSAP — formerly paid Club plugins (SplitText, MorphSVG) are free for commercial use |

Source: https://github.com/greensock/gsap-skills (read).

Why it matters for DMB: SplitText + timeline skills are exactly what large, highly-legible type animation needs, and the entire stack is commercially free. This is the lowest-risk, highest-fit AI skill.

### 1.2 Remotion Agent Skills — code-generated MP4 video

| Item | Value |
|---|---|
| Docs | https://www.remotion.dev/docs/ai/skills |
| Install | `npx skills add remotion-dev/skills`; also offered at `bun create video` |
| Skills shipped | `/remotion-best-practices`, `/remotion-create`, `/remotion-markup`, `/remotion-studio`, `/remotion-render`, `/remotion-maps`, `/remotion-captions`, `/remotion-saas`, `/remotion-interactivity`, `/remotion-docs`, `/remotion-upgrade`, `/remotion-multimedia` |
| Claude Code plugin | https://www.remotion.dev/docs/ai/claude-code-plugin |
| What it generates | React-based compositions rendered to real MP4 via headless Chrome; title cards, layout, typography, effects, audio |
| Remotion's own license | **Not verified in this pass** — Remotion has a separate company license; confirm before commercial delivery **[uncertain]** |

Source: https://www.remotion.dev/docs/ai/skills (read).

Remotion is the natural render target: author with GSAP/React, export a deterministic MP4 loop for the screen. The skills let an agent scaffold and render without hand-holding.

### 1.3 Motion (motion.dev, formerly Framer Motion) — MCP + skill

- MCP server: `https://mcp.motion.dev/` (streamable-http JSON-RPC 2.0; tool `search-motion-docs`).
- Skill source: `github.com/motiondivision/ai-kit`, install `npx motion-ai`, MIT.
- Purpose: animation documentation, examples, Motion UI, CSS easing generation.

Source: https://mcp.motion.dev/ (read).

### 1.4 Three.js / WebGL MCP servers — available but immature

- `@modelcontextprotocol/server-threejs` — npm package, version 1.7.5, MIT, ~2.8K stars reported by npm.io. **[stars unverified on the registry itself]**
- `DmitriyGolub/threejs-devtools-mcp` — "59 tools for objects, materials, shaders, textures, animations, performance monitoring, memory diagnostics"; inspect/modify a live Three.js scene.
- `CharlieKerfoot/threejs-mcp`, `pavithrakv/motion-ui-mcp-server` — small community servers.

Sources: https://npm.io/package/@modelcontextprotocol/server-threejs, https://github.com/DmitriyGolub/threejs-devtools-mcp (listings read via web_search results; full READMEs not opened). Treat these as experimental.

### 1.5 Rive + Lottie skills — 2D vector animation

| Tool | What | Install / source | Maturity |
|---|---|---|---|
| Rive MCP | 75+ Zod-validated MCP tools to create `.riv` files: artboards, shapes, bones/IK, keyframes, state machines, export | `FUNGnix/rive-mcp`, MIT, git clone + `npm run build` | **1 star** — very early; `.riv` writer "verified against Rive's C++ runtime" but export-video is listed as future work |
| LottieFiles MCP | Search 100,000+ animations, import into projects, manage workspace | https://lottiefiles.com/mcp — official, free on every plan | Official |
| Lottie Creator MCP | AI assistant drives the Lottie animation workflow | https://mcpservers.org/servers/lottie-creator-mcp | Official |
| `diffusionstudio/lottie` skill | "Text-to-Lottie" framework generating production-ready Lottie JSON from a coding agent | `npx skills add diffusionstudio/lottie` (YC F24) | Active, open-source |

Sources: https://github.com/FUNGnix/rive-mcp (read); https://lottiefiles.com/mcp; https://claudesuperpower.com/skills/lottie (read).

### 1.6 Generation toolkits via MCP

- **fal.ai MCP** — hosted at `https://mcp.fal.ai/mcp`, 9 tools (`search_models`, `get_model_schema`, `get_pricing`, `run_model`, `submit_job`, `check_job`, `upload_file`, `recommend_model`, `search_docs`), 1,000+ image/video/audio/3D models, free to use, pay only for runs. Sources: https://fal.ai/mcp (read).
- **Higgsfield MCP** — Claude drives video models (Soul, Veo, Kling, Seedance) from chat. Source: https://higgsfield.ai/claude-ai-video-generator.

### 1.7 Skills available in *this* omp environment

Installed: `codebase-design`, `coderpad`, `lexware-office-ui`, `mac-shared-chrome`, `menu-sign`, `oci-free-dev-env`, `sumup-ui`, `task-slicing`. **None are motion-graphics.** Recommendation: author a small `dmb-motion` omp skill that pins the GSAP + Remotion workflow (palette, type scale, safe areas, loop length, render command) so every future promo is reproducible.

---

## 2. AI video and image generators for food advertising

### 2.1 Video models — capability, price, commercial licensing

| Vendor / model | Max resolution & duration | Price (verified) | Commercial-use terms | Source |
|---|---|---|---|---|
| **Runway** Gen-4 / Gen-4.5 | Gen-4: 5 or 10 s clips, image-to-video. Gen-4.5: text+image-to-video | Gen-4 5 s = 60 credits; academy lists Gen-4.5 12 credits/s, Gen-4 12/s, Turbo 5/s. Standard $15/mo, Pro $35, Unlimited $95 | **Paid plans own outputs + commercial use; free = non-commercial.** Trains on your content on all non-Enterprise tiers (no opt-out). All outputs carry **C2PA** provenance. Prohibits real faces/voices without consent | https://terms.law/ai-output-rights/runway/ (read); https://academy.runwayml.com/models-pricing (read); https://help.runwayml.com/hc/en-us/articles/37327109429011 (search snippet) |
| **Google Veo 3** (Cloud) | 4/6/8 s; 720p or 1080p; 24 fps; 9:16 & 16:9; up to 4 videos/prompt; native audio; C2PA supported | Flow credits: 50/day free; **Veo 3.1 Quality 8 s = 100 credits**; 4K upscale Ultra-only (50 credits) | Commercial use of Gemini API outputs is generally permitted, but **Flow (consumer Google AI subscription) commercial terms were not verified** **[uncertain]** | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-0-generate (read); https://support.google.com/flow/answer/16526234 (read) |
| **OpenAI Sora 2** | (historical) 720p–1080p, 16–20 s | — | **Sora 2 models and the Videos API were SHUT DOWN on 24 Sep 2026 — no replacement API.** Do not build on Sora | https://developers.openai.com/api/docs/guides/video-generation (read) |
| **Kling AI** | Pro/Std tiers; current gen Kling 3.0 | Subscription tiers Standard→Enterprise; credits reset monthly (1-month validity) | **Members: "use of the Output for commercial purposes is not restricted"** — may reproduce, modify, create derivative works, except to build competing products. Non-members must keep the Kling watermark/branding | https://kling.ai/docs/payment-policy (read) |
| **Luma Dream Machine** | Free = watermark draft res | Plus / Unlimited / Enterprise | **Free & Lite = personal use only, permanent watermark. Plus+ = commercial rights, no watermark; rights vest permanently per asset** | https://lumalabs.ai/learning-hub/licensing (read) |
| **Pika** | Model-dependent | Free $0; Starter **$10 (NO commercial license)**; Creator **$35 (commercial license)**; Fancy $95 | Commercial license starts at Creator tier; Free and Starter explicitly exclude it | https://pika.art/pricing (read) |
| **Higgsfield** | via Soul/Veo/Kling/Seedance backends | Subscription tiers + Enterprise | **All users own outputs; commercial use not restricted for any user**; paid plans watermark-free; **IP indemnification on Enterprise only** | https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially (read) |
| **LTX-2** (Lightricks) | 720p–4K via fal/cloud; native audio | Open weights free **under $10M revenue**; ≥$10M revenue requires paid commercial license | **LTX-2 Open Weights License (5 Jan 2026):** entities ≥$10M annual revenue must buy a commercial license or face **liquidated damages = double the license fee**; Licensor claims no rights in Output | https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE (read) |

### 2.2 Image models for hero food shots

| Vendor | Commercial terms | Source |
|---|---|---|
| **Midjourney** | Paid plans (Basic $10 … Mega $120) own assets + commercial rights. **Free trial = CC BY-NC 4.0, no commercial.** Companies >$1M gross revenue **must** use Pro ($60) or Mega ($120). **No IP indemnification.** [secondary/attorney analysis] | https://terms.law/2026/01/15/midjourney-commercial-use-rights-complete-2026-guide (read) |
| **Black Forest Labs FLUX** | Weights: FLUX.2 [dev] is **non-commercial** (license v2.0, 25 Nov 2025); commercial weight use needs a BFL tier (Builder/Platform/Professional/Enterprise). **But outputs may be used commercially** even under the dev license (Section 2d) — must not train competing models, and must add AI disclosure. API service terms exist separately | https://bfl.ai/legal/non-commercial-license-terms (read); https://bfl.ai/licensing (read) |
| **GPT Image / OpenAI** | Output ownership + commercial use for paid users; **Copyright Shield only for API/Enterprise tiers** [secondary] | https://terms.law/ai-output-rights/ (related pages) **[uncertain]** |

> Practical note: the image-model "output vs weights" split is the most common licensing trap. FLUX *weights* are non-commercial, but FLUX *outputs* are commercial-usable if you meet the disclosure + no-competing-training conditions.

---

## 3. Fallback path: template ecosystems

| Marketplace | Price | License scope for signage | Restyling with brand assets | Source |
|---|---|---|---|---|
| **Envato Elements** | ~$33/mo monthly, **$16.50/mo annual ($198/yr)** — [secondary aggregator, verify at checkout]; 3 individual tiers Core/Plus/Ultimate | One broad commercial license on every download: in-house, client, advertising, marketing, and end products "where you've added meaningful value". **Cannot resell/redistribute as-is**, no on-demand/POD services, **music cannot be used in broadcast presentations**. License is per end product | Yes — modify freely; completed projects stay licensed after unsubscription | https://elements.envato.com/learn/how-envato-licensing-works (read); https://help.elements.envato.com/hc/en-us/articles/360000628966 (403 — **[uncertain]**) |
| **Motion Array** | Paid membership | Search snippet: assets for paid members cover commercial projects | Likely yes | https://help.motionarray.com/hc/en-us/articles/8995487565981 and https://motionarray.com/license both returned **HTTP 403** — **[uncertain]** |
| **Adobe Stock** | Standard / Plus / Extended | Standard: unlimited web views, use in ads incl. TV/digital programmes when <500k views, modification allowed, **500k copy/view cap**. Extended: >500k + merchandise. **Editorial-only items may NOT be used in ads even with an extended license.** | Modification allowed under Standard | https://stock.adobe.com/de/license-terms (read) |

**Critical Adobe finding for in-store screens:** the German license page states that the **extended audio license is required** for distribution via "**physische Verkaufsstellen**" (physical points of sale) — i.e. a Standard audio license does **not** cover music played on a restaurant's DMB screens. Motion templates used only as visual layers are covered by the Standard visual license (under 500k views).

---

## 4. EU / German angle

### 4.1 EU AI Act Article 50 — the transparency duty that bites

- **Article 50(2)** (providers): systems generating synthetic **audio, image, video or text** must mark outputs in a **machine-readable format, detectable as AI-generated**. Comes into force **2 August 2026**; a limited grace period runs to **2 December 2026** for systems placed on the market before 2 Aug 2026 (marking obligation only). Content generated **before 2 Aug 2026 need not be retroactively labelled.**
- **Article 50(4)** (deployers): deployers of an AI system that generates/manipulates image, audio or video content **constituting a deepfake** must **disclose** that it is AI-generated. Disclosure must be **clear and distinguishable at first exposure** and must **not rely solely on the machine-readable mark**. For evidently artistic/creative/satirical/fictional works, disclosure is limited to an appropriate notice that "does not hamper the display or enjoyment of the work".
- **Who is the deployer?** The legal person (the restaurant / its ad agency). Employees are not separate deployers; **contractors/freelancers acting under your control do not remove your deployer status.**
- **"Deepfake" test** (3 cumulative criteria): resemblance + existing/plausibly-existing subject + would falsely appear authentic. Background scenes, special effects and standard production pre/post-processing are **not** likely to constitute a deepfake, so ordinary food b-roll is low-risk; a fake "authentic" customer or reconstructed real place is high-risk.
- **Enforcement:** national market-surveillance authorities; fines up to **€15M or 3% of worldwide turnover** (proportionality for SMEs).
- **Code of Practice on Transparency of AI-Generated Content** published 10 June 2026; voluntary; assessed as adequate by the Commission and AI Board — signatories get legal certainty.

Sources: https://artificialintelligenceact.eu/article/50/ (read); https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act (read); https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content (search result).

### 4.2 What the vendors' terms say about EU commercial use

- **BFL/FLUX** licenses explicitly name the **EU AI Act (Regulation (EU) 2024/1689)** and GDPR among compliance obligations, and require AI disclosure of outputs.
- **Runway** and **Google Veo** embed **C2PA** provenance — this helps satisfy the Art. 50(2) machine-readable marking, but **deployers must still add their own visible disclosure** for deepfakes.
- **Envato** AI tools (ImageGen/AI Video Generator/MusicGen) are governed by **separate AI Product Terms** with additional restrictions — not the standard Elements license.

---

## 5. Recommendation — fastest path to branded, commercially-safe promos

**Author the motion, don't generate it.**

1. **Text and layout: GSAP + `gsap-skills` (free, MIT, commercially unrestricted).** SplitText for menu-item reveals, timelines for price/beat, all output as HTML/CSS/SVG so type stays crisp at any DMB resolution. Install: `npx skills add https://github.com/greensock/gsap-skills`.
2. **Render/loop: Remotion + `remotion-dev/skills`.** Deterministic MP4 loop at exact screen resolution. Confirm Remotion's company license before delivery.
3. **Hero imagery: FLUX output or GPT Image via API** (commercial-usable outputs; add AI disclosure). Fall back to **Adobe Stock Standard** motion templates, or **Envato Elements** (~$16.50/mo annual) for restylable templates.
4. **Short AI video b-roll only: Kling paid** or **Veo 3.1** (4–8 s clips, stitched). Keep all menu text out of AI video. Under $10M revenue, **LTX-2 open weights are free**; Pika needs ≥$35 Creator for a commercial license.
5. **Compliance checklist for every promo:** keep C2PA marking intact → add a small visible "AI-generated" label where any realistic AI scene appears → never generate real people/places without consent → keep the human-authored animation layer (strengthens copyright, which pure AI output lacks under *Thaler v. Perlmutter*).

**Avoid:** Sora (API shut down 24 Sep 2026), Midjourney on a free trial, Pika Free/Starter, FLUX [dev] *weights* for commercial deployment, and Adobe Stock **Standard audio** for in-store playback (needs extended).

**Cost of the recommended stack:** GSAP + skills = $0. Envato Elements ≈ $198/yr (optional templates). Veo/Flow credits or Kling/Pika ~$10–35/mo for the video tier. Total < ~$50/mo for a one-screen store, plus dev time.

---

## Verification status / stale flags

- Sora 2 API **discontinued 2026-09-24** — the biggest staleness trap in this space.
- Veo `3.0-generate-001` GA 2025-07-29, **retires 2026-06-30** on Google Cloud — migrate to `veo-3.1`.
- LTX-2 open-weights license dated 2026-01-05; FLUX [dev] non-commercial license v2.0 dated 2025-11-25; BFL EU API terms revised 2026-08-04; Kling paid terms release 2026-04-21; Luma licensing updated 2025-05-28; Envato licensing article 2026-01-28 (updated 2026-06-05); EU AI Act FAQ last updated 2026-07-24.
- **[uncertain]** items: Motion Array license (403), Envato exact prices (aggregator only), Flow consumer commercial terms, Remotion's own company license, Three.js MCP maturity.
- Not legal advice. German/EU deployment should be reviewed against the operative terms on each vendor's site at build time.
