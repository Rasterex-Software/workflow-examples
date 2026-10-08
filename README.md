# Rasterex Workflow Examples

This repository contains seven focused applications that show how an embedded Rasterex Canvas can support everyday work with drawings and 3D models. Each example places the viewer inside a host application UI, with controls and task information arranged around a specific workflow.

## Explore the workflows

| Example | Workflow |
| --- | --- |
| [Design & Review](./design-review/) | Choose two drawing versions, compare them, and annotate the result. |
| [Measurement & Takeoff](./measurement-takeoff/) | Start a takeoff, establish drawing scale, measure quantities, and export the annotation list. |
| [Facility Management](./facility-management/) | Mark a space on a floor plan and link its boundary to room, asset, and maintenance details. |
| [Issue & Task Management](./issue-task-management/) | Place a drawing marker, attach task details, and track the issue through resolution. |
| [BIM Collaboration](./bim-collaboration/) | Open an IFC model, inspect selected parts, and use 3D viewing controls. |
| [Live Review](./live-sync-review/) | Open a file in each viewer, then enable viewport sync and document collaboration. |
| [Revision Review](./revision-review/) | Compare original and revised drawings client-side, align matching points, and inspect the overlay. |

Each folder has a README with the workflow steps and the controls demonstrated by that example.

## How the examples are organized

```text
workflow-examples/
├── design-review/
├── measurement-takeoff/
├── facility-management/
├── issue-task-management/
├── bim-collaboration/
├── live-sync-review/
└── revision-review/
```

Each folder is a React, TypeScript, and Vite app with its own `package.json`, `index.html`, and `src/App.tsx`. The original five examples use shared RxView360 demo modules for workflow UI, sample files, and Canvas communication through an iframe and PostMessage. `live-sync-review` is a standalone `@rasterex/viewer` example with independently opened documents, viewport sync, and collaboration.

## Run an example locally

The apps currently import shared demo modules and styles through `../../../src`. That path is outside this repository and does not resolve in a fresh clone. Connect the shared RxView360 demo source and update those import paths before running an example.

You will also need a reachable Rasterex Canvas instance. The shared demo configuration defaults to `http://localhost:4200`; `VITE_CANVAS_URL` and `VITE_CANVAS_ORIGIN` can override its URL and origin.

Once the shared source is connected, run an example from this repository's root:

```bash
npm --prefix design-review install
npm --prefix design-review run dev
```

Replace `design-review` with any of the original workflow folders above. `live-sync-review` and `revision-review` can be run independently with the same commands, and every app has `build` and `preview` scripts:

```bash
npm --prefix design-review run build
npm --prefix design-review run preview
```

The production build is written to that example's `dist/` directory. This repository has no root npm project; dependencies and scripts belong to the individual example folders.
