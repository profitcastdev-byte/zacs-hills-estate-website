# Zacs Hills Estate · Website redesign

Redesign of the Zacs Hills Estate page (previously at `zacs-valley-resort.preview.emergentagent.com`)
in the Zacs Valley brand system from `lp.zacsvalley.com/kodaikanal-resorts.html`.

A static site: plain HTML, CSS and JavaScript. No build step and no dependencies. Upload the folder
to any web host.

```
index.html                 the page
assets/css/styles.css      all styling (brand tokens at the top)
assets/js/main.js          menu, plot picker, plan viewer, capital planner, WhatsApp enquiry, FAQ
assets/fonts/              Span display face (300 / 400 / 600), self hosted
assets/img/                Zacs Valley lockups (positive + reversed), favicons, contours.svg
assets/img/photos/         the seven page photographs (WebP) and the full-size master plan
assets/video/              hero film (1080p + 720p) and its poster frame
.claude/                   local preview server and video tools (not needed on the live site)
```

## Deploy

Live URL: **https://lp.zacsvalley.com/zacs-hills-estate.html**

`deploy/zacs-hills-estate-website.zip` holds only what the live site needs: the page, `assets/`,
and the three SEO root files (`robots.txt`, `sitemap.xml`, `llms.txt`). The dev tools in
`.claude/`, this README and the `deploy/` folder itself are left out.

The page ships as **`zacs-hills-estate.html`**, not `index.html`. The `lp` subdomain already
serves the eight resort landing pages and their review index at `/index.html`; uploading an
`index.html` there would overwrite it. `robots.txt` and `sitemap.xml` govern that whole
subdomain too - read the comments inside them before replacing anything already live.

- **cPanel / Hostinger / GoDaddy:** upload the zip to `public_html` (or the domain's folder) and
  extract it there.
- **Netlify:** extract the zip and drag the folder onto app.netlify.com/drop.

After any change, rebuild the zip with:

```bash
powershell -ExecutionPolicy Bypass -File .claude/tools/make-deploy-zip.ps1
```

## Preview locally

```bash
node .claude/serve.js . 5173
```

Then open http://localhost:5173. Opening `index.html` straight from disk mostly works, but some
browsers block the self-hosted fonts over `file://`.

## Leads

The enquiry form does two things with one submit: it opens a pre-filled WhatsApp message (the
conversion the team actually works) and it posts a row to the Google Sheet **Profitcast X Zacs
Valley - Hills Estate**, so a visitor who never finishes the WhatsApp handoff is still captured.

The receiver is `google-apps-script/lead-endpoint.gs` — deploy steps are in the file header. Paste
the resulting `/exec` URL into `data-endpoint` on the form in `index.html`. **While
`data-endpoint` is empty the form still works and still opens WhatsApp; it just records no row.**

Each row carries `gclid` and the four `utm_*` values, read from the landing URL on arrival and
kept in `sessionStorage`. That is what makes Google Ads offline conversion import possible later:
a plot sale closes weeks after the click, and the gclid is the only thing tying the two together.

The post is fire-and-forget via `sendBeacon`, because the same click is opening WhatsApp in a new
tab. Nothing is allowed to delay that handoff. The form also carries an off-screen honeypot field
named `company`; the script answers a filled one with 200 and writes nothing.

## Content

All copy, figures, plot data, FAQ answers, links and WhatsApp messages are carried over word for word
from the current site. Two deliberate changes to arrangement, not wording:

- The FAQ now sits above the site-visit form, so its line "through the site-visit form below" is
  true, and the page ends on the enquiry.
- The header pairs the Zacs Valley lockup with the "Zacs Hills · Kodaikanal estate" name.

The footer bottom carries the same copyright and agency credit as the reference landing page:
"© 2026 Zacs Valley Resort and Wellness Retreat. All rights reserved." and "Designed & managed by
Profitcast Growth Marketing", with Profitcast linking to profitcast.com in a new tab. This replaced
the old site's "© 2025 Zacs Hills Estate" notice; the disclaimer that followed it (images for
representation, indicative rental projections) is unchanged, on the row above.

## Hero video

The hero plays the supplied "Zacs Hero Video.mp4" as a muted, looping background film.

| File | Size | Used for |
| --- | --- | --- |
| `assets/video/zacs-hero-1080.mp4` | 6.9 MB, 1920 × 1080, 3 Mbps | Screens 1280px and wider |
| `assets/video/zacs-hero-720.mp4` | 3.7 MB, 1280 × 720, 1.6 Mbps | Phones, tablets, slow or data-saver connections |
| `assets/video/zacs-hero-poster.jpg` | 82 KB | First paint, and the still when the film doesn't play |

How the files were prepared from the 14 MB original:

- **Trimmed to 0.1 s – 19.3 s (19.2 s).** This drops the one-frame "KODAIKANAL" title card at the
  start and the logo end card, which uses an older Zacs Valley mark, so no burned-in text competes
  with the headline. The loop now runs from fog clearing to fog closing, so the seam barely shows.
- **Audio removed.** A muted hero never plays it.
- **Re-encoded as H.264,** which plays in every browser, with the index at the front so playback
  starts before the file has finished downloading.

This follows the reference landing page, which uses the same footage trimmed to 1280 × 720 with no
audio. Behaviour matches the reference too:

- The poster paints first, and the film loads only after the page has finished loading.
- It autoplays muted on every screen size, and pauses while scrolled out of view.
- A pause/play button sits in the hero. If a phone refuses autoplay (e.g. iOS Low Power Mode), it
  shows a play button instead.
- When the visitor has reduced motion turned on, nothing downloads until they press play.

The green tint and dark gradient over the film were tuned against its brightest frames (fog, white
bedding). White text holds about 7:1 contrast and the moss "hill sanctuary." about 3:1.

**To replace the film:** export an H.264 MP4, then make the two sizes and fix the file order with the
tools in `.claude/tools/`. They use Windows' built-in encoder, so nothing needs installing:

```bash
powershell -ExecutionPolicy Bypass -File .claude/tools/transcode.ps1 -In new.mp4 -OutDir assets/video -Name tmp-1080.mp4 -Width 1920 -Height 1080 -Bitrate 3000000
node .claude/tools/faststart.js assets/video/tmp-1080.mp4 assets/video/zacs-hero-1080.mp4
```

Repeat with `-Width 1280 -Height 720 -Bitrate 1600000` for the 720p file, delete the `tmp-` files,
and save a new first frame as the poster.

Most web hosts serve video with byte-range support by default. Safari needs it to play video at all.

## Photography

The supplied "Website Images" (Image 2 – Image 8) fill the page's seven image slots in their
numbered order. Each was resized to what its frame needs on a high-density screen and saved as WebP.
All seven come to 0.95 MB.

| Supplied | File in `assets/img/photos/` | Where it appears |
| --- | --- | --- |
| Image 2 | `resort-cottage.webp` (1200 × 1481) | The resort address, large. A brochure border strip along the bottom was cropped off |
| Image 3 | `villa-dusk.webp` (800 × 800) | The resort address, inset, with the "Kodaikanal · Silver Falls · Palani" caption |
| Image 4 | `master-plan.webp` (1600 × 2000) | The master plan section and the zoom viewer, shown whole and never cropped |
| Image 4 | `master-plan-full.jpg` (original) | Target of "Open full plan", loaded only when tapped |
| Image 5 | `villa-valley-view.webp` (1200 × 1200) | Your hill home: "A home shaped by nature" |
| Image 6 | `living-room-view.webp` (1400 × 1400) | See the possibility: "Resort life" |
| Image 7 | `bathroom-view.webp` (1500 × 1000) | See the possibility: "Villa possibilities" |
| Pool photo | `pool-deck-dusk.webp` (800 × 640) | Inside the resort: the "Natural stream deck" card. Supplied later, already web-sized, so it is used as it came. A 1600px version would look sharper on high-density screens. It replaced Image 8 (a bedroom), which is no longer used |

Images below the first screen load only as the visitor scrolls toward them. Alt text describes what
each photo shows. The bedroom behind the "Natural stream deck" card is marked decorative, because
the card's own text carries the meaning.

**To replace a photo,** keep the file name, or point the `<img src>` in `index.html` at the new one.
Frames crop to fit, so exact sizes aren't critical. Save as WebP or JPG at about 80% quality and
under roughly 400 KB, and update the image's `width`/`height` attributes and alt text to match. The
master plan appears twice (the section and the zoom viewer) plus the "Open full plan" link.

## Brand system

Taken from the reference landing page (`assets/css/base.css` there):

| Token | Value | Use |
| --- | --- | --- |
| Deep Forest | `#2b5748` | Primary, buttons, dark sections |
| Valley Sage | `#618764` | Accent only: headline emphasis, icons |
| Morning Moss | `#9cb080` | Accent only: emphasis on dark grounds |
| Night | `#000000` | Text, footer, info band |
| White / Mist | `#ffffff` / `#f4f6f1` | Light grounds |

- **Display:** Span, weights 300 / 400 / 600, self hosted.
- **Text:** Avenir Next where installed (Apple devices), Jost from Google Fonts everywhere else,
  the same stack as the reference.
- Square buttons, hairline rules, tracked uppercase labels, no underlines. Span has no italic, so
  headline emphasis uses colour instead, as on the reference.

### Font notes before launch

- **Span licence.** The reference page's own stylesheet says these Span files came from a
  free-download distributor whose licence covers personal and non-profit use only, and that a
  commercial web licence (jamieclarketype.com, or the Adobe Fonts embed) is needed before the
  pages carry paid traffic. The same applies here.
- **Missing glyphs.** These Span files have no rupee sign (₹) or prime (′), so browsers draw the ₹
  in Georgia. That's close enough to pass, but a licensed full build of Span would fix it.

## Behaviour

- **WhatsApp.** Every call to action opens `wa.me/917358790580` with the same pre-filled message the
  current site uses.
- **Site-visit form.** Builds the same WhatsApp message (name, phone, date or "Flexible", interest).
  There's no backend, same as before.
- **Capital planner.** Same formulas as before: plot = cents × ₹2,50,000; villa = sq ft × ₹4,000;
  rental = occupancy ÷ 55 × ₹6,50,000 × (sq ft ÷ 1,800).
- **Plot picker, master-plan viewer (zoom 1–2×), mobile menu, one-open FAQ.**
- Scroll reveals stop moving when the visitor has reduced motion turned on. If the script fails to
  load, all content still shows after 2.5 seconds.
- No analytics or ad pixels are installed.
