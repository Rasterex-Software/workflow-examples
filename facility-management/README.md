# Facility Management

This example connects spaces on a floor plan to facility information. A polygon drawn in Canvas identifies a room; the host workspace keeps the room details alongside the drawing.

## Workflow

1. Open the floor plan.
2. Choose **Hatch space** and trace a room boundary.
3. When the boundary is created, enter the room's information in the host dialog.
4. Save the space, then select it from the list or drawing to review and edit its details.

The room form includes a tag, department, area, floor, capacity, cleaning and inspection details, assets, issues, and notes. The example links each saved record to its Canvas annotation ID.

## What to look for

- The room form opens after Canvas reports a newly drawn boundary.
- Selecting a saved space highlights its drawing boundary; selecting a boundary finds the linked space.
- Editing room details updates the host record associated with that boundary.

Canvas supplies the spatial marker. The host workspace supplies the space list and facility fields.

## Run locally

This app uses workflow components and Canvas configuration from shared RxView360 demo source. See the [repository README](../README.md) for the source requirement and local setup. From the repository root, once that source is connected:

```bash
npm --prefix facility-management install
npm --prefix facility-management run dev
```

Run `npm --prefix facility-management run build` to create a production build.
