# Herald — Frontend

## This pass
- **Redesigned admin login** — dark branded screen instead of a bare form
- **Cloudinary upload on Add Article** — tap to upload a real image file
  (with preview) instead of only pasting a URL; URL paste still works as
  a fallback
- **Live ingest status** — "Trigger Fetch Now" shows a real-time spinner +
  elapsed timer + result summary inline, instead of a blocking `alert()`
- **Article page upgrade** — thin reading-progress bar under the header,
  estimated read time, nicer source-badge byline

## Setup
`npm install` (adds nothing new this pass), copy `.env.example` to
`.env.local`, `npm run dev`.
