# Discipline Coordination

This example initializes two Rasterex Canvas viewers automatically for manual discipline coordination. Each has a discipline selector, separate file-opening controls, and cloud, rectangle, arrow, text, sketch, and selection tools.

## Coordination findings

Create a markup, then use New finding in that viewer to link a concern to its confirmed annotation ID. Findings include a title, description, assignee, priority, and status. Open a finding to edit it or select its annotation while the matching document is open. Findings live in browser-session memory; Save markups persists Canvas annotations through its configured backend. This example does not perform automatic clash detection.

## Flow

1. Mount both viewers and wait for their individual `ready()` results.
2. Use Open File Viewer 1 and Open File Viewer 2, or their URL controls.
3. Wait for both files to be ready, then click Enable sync & collaboration.
4. Configure sync disabled, capture Viewer 1's snapshot, apply it to Viewer 2, and establish the participant with `setUser()`.
5. Enable view sync and request collaboration through `collaboration.enable()`.
6. Relay accepted changes in both directions, filtering by group, instance, and sequence.
7. Disable both features before replacing a document. Unsubscribe and destroy both viewers on unmount.

Collaboration enable is fire-and-forget; the UI shows requested rather than connected. Canvas resolves the default room for each document. Open the same document for shared annotations; different drawings can share viewport motion but are not assigned an artificial shared annotation room.

The deployed Canvas must support view sync and its collaboration bridge. Failed sync setup leaves the documents available and reports the error.

## Run locally

```bash
npm --prefix live-sync-review install
npm --prefix live-sync-review run dev
```

The SDK uses the hosted Sandbox by default. Set `VITE_CANVAS_URL` to use your own Canvas deployment. URLs must be reachable by that deployment.

## Documentation

- [Initialize the Viewer](https://docs.rasterex.com/docs/getting-started/iframe-init)
- [Files Guide](https://docs.rasterex.com/docs/guides/files)
- [Viewers Sync](https://docs.rasterex.com/docs/components/viewers-sync)
- [Collaboration Sync Control](https://docs.rasterex.com/docs/components/collaboration/control)
