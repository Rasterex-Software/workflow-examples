# Measurement & Takeoff

This example shows a drawing-based takeoff in an estimating workspace. The drawing scale and measurement annotations are kept visible alongside the Canvas so quantities can be reviewed as work progresses.

## Workflow

1. Start a takeoff to open the sample drawing.
2. Set or calibrate the drawing scale before measuring.
3. Use the measurement toolbar for length, area, path, rectangular area, arc, angle, or count.
4. Review annotations in the side panel. Select, hide, or delete an annotation as needed.
5. Export the annotation list as JSON or XLSX.

The workspace also exposes a scale update control and a snap toggle. Measurement actions become available during the active takeoff session.

## What to look for

- The scale dialog appears after the drawing loads and supports setting or calibrating a scale.
- The annotation panel shows the active scale and lets users act on individual measurements.
- JSON and XLSX export use the measurements collected in the current takeoff session.

Canvas provides drawing interaction and measurement annotations. The host UI organizes the takeoff session, scale controls, annotation list, and exports.

## Run locally

This app uses workflow components and Canvas configuration from shared RxView360 demo source. See the [repository README](../README.md) for the source requirement and local setup. From the repository root, once that source is connected:

```bash
npm --prefix measurement-takeoff install
npm --prefix measurement-takeoff run dev
```

Run `npm --prefix measurement-takeoff run build` to create a production build.
