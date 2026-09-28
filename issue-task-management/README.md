# Issue & Task Management

This example ties an issue task to a location on a drawing. Canvas provides the visible marker; the host workspace provides the task list, editor, and status.

## Workflow

1. Open a drawing and choose **Add issue**.
2. Place a marker on the drawing.
3. After Canvas creates the marker, add a title, assignee, priority, due date, and notes.
4. Save the task, select it from the list or drawing, and mark it resolved or reopen it.

The marker's annotation ID links the drawing location to the task. Canceling a new issue clears its unsaved marker.

## What to look for

- The task editor opens after Canvas reports that a marker was created.
- Selecting a task in the list selects its drawing marker, and selecting a marker finds its task.
- Resolving or reopening a task changes its host status while keeping the drawing reference.

Canvas supplies the marker and selection events. The host workspace owns the task fields, list, and status.

## Run locally

This app uses workflow components and Canvas configuration from shared RxView360 demo source. See the [repository README](../README.md) for the source requirement and local setup. From the repository root, once that source is connected:

```bash
npm --prefix issue-task-management install
npm --prefix issue-task-management run dev
```

Run `npm --prefix issue-task-management run build` to create a production build.
