# BIM Collaboration

This example provides a workspace for exploring an IFC coordination model. The host UI combines a model file list, Canvas, 3D controls, and a panel for selected part details.

## Workflow

1. Open the sample IFC model.
2. Select a model part to inspect its available properties.
3. Navigate with walkthrough mode or change the view with explode, transparency, hide-parts, and cross-section controls.
4. Use **Reset** to return the model to its default view.

The cross-section control includes an axis and offset. The workspace also supports markup selection and keeps part information in a separate inspector beside the model.

## What to look for

- The 3D controls become available once the model is loaded.
- Selecting a part fills the inspector with the properties returned by Canvas.
- Explode, transparency, and cross-section controls expose values in the host toolbar while Canvas updates the model view.

Canvas supplies the 3D view and part events. The host workspace organizes the file list, controls, and inspector.

## Run locally

This app uses workflow components and Canvas configuration from shared RxView360 demo source. See the [repository README](../README.md) for the source requirement and local setup. From the repository root, once that source is connected:

```bash
npm --prefix bim-collaboration install
npm --prefix bim-collaboration run dev
```

Run `npm --prefix bim-collaboration run build` to create a production build.
