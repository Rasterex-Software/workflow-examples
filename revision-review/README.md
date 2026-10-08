# Revision Review

Standalone React workflow for Rasterex client-side comparison and point alignment. Canvas initializes when the page loads. Load an original and a revised drawing, create the colored overlay, align matching points, and inspect changes using revision balance and common-geometry contrast.

```sh
npm install
npm run dev
```

Set `VITE_CANVAS_URL` in `.env.local` to your compatible Rasterex Canvas URL if needed. Files must be accessible to that Canvas deployment. Local uploads use the Canvas-resolved filename returned by `fileReady`, not the browser filename. If Canvas does not return that identity, use URLs instead.

In this workspace, `node_modules` is temporarily linked to the installed dependencies in `live-sync-review` because network installation was unavailable. For an independent checkout, run `npm install` normally.

The SDK `clientCompare` API is distinct from server-side `compare`. Subscriptions are registered before commands. `startAlign()` acknowledges the start; the UI stays in alignment mode until `alignComplete` or failure. Cancel closes the comparison, leaving source documents open. Balance 0 fades the original; 100 fades the revision. Common level ranges from 1 (near white) to 10 (black).

Use **Load sample revisions** to compare the two sample PDFs from the existing Design & Review demo directly through `clientCompare.create`. URL selection prepares a source; it does not pre-open the document. Canvas loads both URLs as part of comparison, and the UI waits for the correlated comparison-ready result. This avoids an unnecessary dependency on separate document-open events. Local uploads still require `documents.openFile` and its confirmed Canvas filename. A failed comparison preserves the selected pair for retry.

The guided workflow is Prepare revisions → Compare & align → Inspect & record → Review decision. Open the review register to record changes, assign owners, resolve findings, and add reviewer/handoff notes. Completing the review requires an inspection confirmation, reviewer name, and no open findings. With outstanding findings, use **Request follow-up** instead. These are review decisions, not formal engineering approval.

The register saves in browser local storage, scoped to the source URL/Canvas-filename pair, and exports a JSON review record. It does not save to a shared backend. Local files need distinct Canvas filenames for distinct revisions. If browser storage is unavailable, use Export review before leaving. Findings are entered manually and are not linked Canvas annotations or automatically detected differences. No Live Sync or collaboration is enabled.

Documentation: https://docs.rasterex.com/docs/components/revision/client-side-compare
