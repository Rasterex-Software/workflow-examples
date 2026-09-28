# Design & Review

This example puts drawing comparison inside a review workspace. Reviewers can choose a base drawing and a revised drawing, see the comparison status, then annotate the result when comparison completes.

## Workflow

1. Open the drawing versions from the file controls.
2. Choose the base and revision files and start a comparison.
3. Review the comparison in Canvas. The workspace shows whether comparison is pending, complete, or failed.
4. After a successful comparison, use the annotation control to mark an area for follow-up.

The scenario includes two sample PDF versions and toolbar controls for opening files, comparing them, annotating, and zooming.

## What to look for

- The file controls distinguish the base drawing from the revision being compared.
- The compare panel reports the selected files and the current comparison state.
- Annotation is enabled after the comparison completes, so markup belongs to the reviewed result.

The host UI manages file choice and review state. Canvas displays the drawings, performs the comparison, and provides the markup tools.

## Run locally

This app uses workflow components and Canvas configuration from shared RxView360 demo source. See the [repository README](../README.md) for the source requirement and local setup. From the repository root, once that source is connected:

```bash
npm --prefix design-review install
npm --prefix design-review run dev
```

Run `npm --prefix design-review run build` to create a production build.
