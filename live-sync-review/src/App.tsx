import { useEffect, useRef, useState } from 'react'
import { createViewer, type RasterexViewer, type ViewSyncChange, type ToolAction } from '@rasterex/viewer'

type Finding = { id: string; title: string; description: string; assignee: string; priority: string; status: string; pane: number; document: string; guid?: string }
const annotationTools: Array<{ label: string; icon: string; action: ToolAction }> = [
  { label: 'Cloud', icon: '☁', action: 'SHAPE_CLOUD' },
  { label: 'Rectangle', icon: '▱', action: 'SHAPE_RECTANGLE' },
  { label: 'Arrow', icon: '↗', action: 'ARROW_SINGLE_END' },
  { label: 'Text', icon: 'T', action: 'TEXT' },
  { label: 'Sketch', icon: '〰', action: 'PAINT_FREEHAND' },
]

type PaneState = { ready: boolean; loading: boolean; opened: boolean; name: string; message: string }
const initialPane: PaneState = { ready: false, loading: true, opened: false, name: '', message: 'Initializing Canvas…' }
const sampleUrl = 'https://res.cloudinary.com/dvgeew3bj/image/upload/v1779169700/Main_version_1.pdf_1_ifrgjq.pdf'
const describe = (error: unknown) => error instanceof Error ? error.message : String(error)

function App() {
  const containers = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const pickers = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const session = useRef<{ viewers: RasterexViewer[]; group: string; relay: boolean; configured: boolean; sequences: number[] } | null>(null)
  const lock = useRef(false)
  const [panes, setPanes] = useState<PaneState[]>([{ ...initialPane }, { ...initialPane }])
  const [urls, setUrls] = useState(['', ''])
  const [username, setUsername] = useState('reviewer')
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('Open a file in each viewer, then enable sync and collaboration.')
  const [collaboration, setCollaboration] = useState('Off')
  const [disciplines, setDisciplines] = useState(['Architecture', 'Mechanical'])
  const [activeTools, setActiveTools] = useState<Array<ToolAction | null>>([null, null])
  const [findings, setFindings] = useState<Finding[]>([])
  const [draft, setDraft] = useState<Finding | null>(null)
  const [filter, setFilter] = useState('All')
  const [fileDialog, setFileDialog] = useState<number | null>(null)
  const [selectedGuid, setSelectedGuid] = useState<Array<string | undefined>>([undefined, undefined])
  const [registerOpen, setRegisterOpen] = useState(false)
  const documentNames = useRef(['', ''])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) { setDraft(null); setFileDialog(null) }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [busy])

  function updatePane(index: number, patch: Partial<PaneState>) {
    setPanes((current) => current.map((pane, i) => i === index ? { ...pane, ...patch } : pane))
  }

  useEffect(() => {
    if (!containers[0].current || !containers[1].current) return
    let disposed = false
    const viewers = containers.map((container) => createViewer({
      container: container.current!,
      viewerUrl: import.meta.env.VITE_CANVAS_URL || undefined,
      commandTimeoutMs: 60000,
    }))
    const runtime = { viewers, group: viewers[0].getInfo().sdkInstanceId, relay: false, configured: false, sequences: [-1, -1] }
    session.current = runtime
    const cleanups: Array<() => void> = []

    const stopOnFailure = (reason: string) => {
      runtime.relay = false
      setEnabled(false)
      setCollaboration('Off')
      setMessage(`Sync stopped: ${reason}. Your files remain open. Retry Enable sync & collaboration.`)
      viewers.forEach((viewer) => viewer.collaboration.disable())
      void Promise.allSettled(viewers.map((viewer) => viewer.viewSync.configure({
        groupId: runtime.group, instanceId: viewer.getInfo().sdkInstanceId, mode: 'panAndZoom', enabled: false,
      })))
    }

    viewers.forEach((viewer, index) => {
      const relay = (change: ViewSyncChange) => {
        // Relay only fresh, locally originated changes from this group. This
        // prevents cross-group traffic and stale updates from feeding back.
        if (disposed || !runtime.relay || change.groupId !== runtime.group ||
            change.sourceInstanceId !== viewer.getInfo().sdkInstanceId || change.sequence <= runtime.sequences[index]) return
        runtime.sequences[index] = change.sequence
        try { viewers[1 - index].viewSync.apply(change, { pan: change.state.pan !== undefined, zoom: change.state.zoom !== undefined }) }
        catch (error) { stopOnFailure(describe(error)) }
      }
      cleanups.push(
        viewer.viewSync.on('changed', relay),
        viewer.viewSync.on('failed', (event) => { if (!disposed && runtime.relay) stopOnFailure(event.reason) }),
        viewer.documents.on('fileReady', (event) => {
          if (!disposed) {
            documentNames.current[index] = event.fileName || documentNames.current[index] || 'Document'
            updatePane(index, { loading: false, opened: true, name: documentNames.current[index], message: 'File ready' })
          }
        }),
        viewer.documents.on('fileLoadFailed', (event) => {
          if (!disposed) updatePane(index, { loading: false, opened: false, message: `File load failed: ${event.reason}` })
        }),
        viewer.annotations.on('created', (event) => {
          if (disposed) return
          setSelectedGuid((current) => current.map((guid, i) => i === index ? event.guid : guid))
          viewer.tools.clear()
          setActiveTools((current) => current.map((tool, i) => i === index ? null : tool))
          setMessage('Markup created. Select New finding to attach a coordination concern to it.')
        }),
        viewer.annotations.on('selected', (event) => {
          if (!disposed) setSelectedGuid((current) => current.map((guid, i) => i === index ? event.guid : guid))
        }),
        viewer.annotations.on('deleted', (event) => {
          if (disposed) return
          setFindings((current) => current.map((finding) => finding.guid === event.guid && finding.pane === index ? { ...finding, guid: undefined } : finding))
          setSelectedGuid((current) => current.map((guid, i) => i === index && guid === event.guid ? undefined : guid))
        }),
      )
      void (async () => {
        try {
          await viewer.mount()
          if (disposed) return
          await viewer.ready()
          if (!disposed) updatePane(index, { ready: true, loading: false, message: 'Canvas ready. Open a file.' })
        } catch (error) {
          if (!disposed) updatePane(index, { loading: false, message: describe(error) })
        }
      })()
    })
    return () => {
      disposed = true
      runtime.relay = false
      cleanups.forEach((unsubscribe) => unsubscribe())
      viewers.forEach((viewer) => viewer.destroy())
      if (session.current === runtime) session.current = null
    }
  }, [])

  async function disable(runtime: NonNullable<typeof session.current>) {
    runtime.relay = false
    setEnabled(false)
    setCollaboration('Off')
    // A first file open must not send commands to another viewer still initializing.
    if (runtime.configured) runtime.viewers.forEach((viewer) => viewer.collaboration.disable())
    if (runtime.configured) {
      await Promise.all(runtime.viewers.map((viewer) => viewer.viewSync.configure({
        groupId: runtime.group, instanceId: viewer.getInfo().sdkInstanceId, mode: 'panAndZoom', enabled: false,
      })))
    }
    runtime.sequences = [-1, -1]
  }

  async function open(index: number, file?: File) {
    const runtime = session.current
    if (!runtime || lock.current || !panes[index].ready) return
    let source = ''
    if (!file) {
      try {
        const parsed = new URL(urls[index].trim())
        if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error()
        source = parsed.toString()
      } catch { updatePane(index, { message: 'Enter a valid HTTP or HTTPS file URL.' }); return }
    }
    lock.current = true
    setBusy(true)
    try {
      if (runtime.configured) await disable(runtime)
      else {
        runtime.relay = false
        setEnabled(false)
      }
      setFileDialog(null)
      updatePane(index, { loading: true, opened: false, message: 'Opening file…' })
      setSelectedGuid((current) => current.map((guid, i) => i === index ? undefined : guid))
      setActiveTools((current) => current.map((tool, i) => i === index ? null : tool))
      const viewer = runtime.viewers[index]
      documentNames.current[index] = file?.name || decodeURIComponent(new URL(source).pathname.split('/').pop() || 'document.pdf')
      if (file) await viewer.documents.openFile(file)
      else await viewer.documents.open({ url: source, displayName: decodeURIComponent(new URL(source).pathname.split('/').pop() || 'document.pdf') })
      setFileDialog(null)
      setMessage('Files open independently. Enable sync and collaboration when both are ready.')
    } catch (error) {
      updatePane(index, { loading: false, message: describe(error) })
      setMessage(describe(error))
    } finally { lock.current = false; setBusy(false) }
  }

  async function toggleSync() {
    const runtime = session.current
    if (!runtime || lock.current || !panes.every((pane) => pane.opened)) return
    lock.current = true
    setBusy(true)
    try {
      if (enabled) {
        await disable(runtime)
        setMessage('Sync and collaboration are disabled. Both files remain open.')
        return
      }
      runtime.relay = false
      setMessage('Configuring viewers, aligning their views, and identifying the participant…')
      runtime.configured = true
      await disable(runtime)
      const snapshot = await runtime.viewers[0].viewSync.getSnapshot({ groupId: runtime.group })
      await runtime.viewers[1].viewSync.applySnapshot(snapshot)
      const identities = await Promise.all(runtime.viewers.map((viewer) => viewer.collaboration.setUser({
        username: username.trim(), displayName: username.trim(),
      })))
      if (identities.some((result) => !result.success)) throw new Error(identities.find((result) => !result.success)?.reason || 'Participant identity was rejected.')
      await Promise.all(runtime.viewers.map((viewer) => viewer.viewSync.configure({
        groupId: runtime.group, instanceId: viewer.getInfo().sdkInstanceId, mode: 'panAndZoom', enabled: true,
      })))
      // Default rooms remain document-specific; discipline drawings must not
      // share annotation traffic. enable() does not confirm a live connection.
      runtime.viewers.forEach((viewer) => viewer.collaboration.enable())
      runtime.relay = true
      setEnabled(true)
      setCollaboration('Requested for each document')
      setMessage('Viewport sync is enabled in both directions. Collaboration has been requested for each document’s default room.')
    } catch (error) {
      await disable(runtime).catch(() => undefined)
      setMessage(`Could not enable sync and collaboration: ${describe(error)}. Both files remain available.`)
    } finally { lock.current = false; setBusy(false) }
  }

  async function activateTool(index: number, action: ToolAction | null) {
    const viewer = session.current?.viewers[index]
    if (!viewer || !panes[index].opened) return
    setBusy(true)
    try {
      if (!action) viewer.tools.clear()
      else {
        const result = await viewer.tools.set({ group: 'annotation', action, enabled: true, style: { strokeColor: '#e35f3b', strokeWidth: 2 } })
        if (!result.success) throw new Error(result.error || 'Tool activation failed')
      }
      setActiveTools((current) => current.map((tool, i) => i === index ? action : tool))
    } catch (error) { setMessage(describe(error)) }
    finally { setBusy(false) }
  }

  function newFinding(index: number) {
    setRegisterOpen(true)
    setDraft({ id: crypto.randomUUID(), title: '', description: '', assignee: '', priority: 'Medium', status: 'Open', pane: index, document: panes[index].name, guid: selectedGuid[index] })
  }

  async function saveMarkups(index: number) {
    setBusy(true)
    try {
      const result = await session.current?.viewers[index].annotations.save()
      if (!result?.success) throw new Error(result?.error || 'Annotations could not be saved.')
      setMessage('Annotations saved.')
    } catch (error) { setMessage(describe(error)) }
    finally { setBusy(false) }
  }

  return (
    <main className={registerOpen ? 'app-shell register-open' : 'app-shell'}>
      <header className="topbar"><div className="brand-symbol">V<span>•</span></div><div><p className="eyebrow">Workspace / Design coordination</p><h1>Discipline coordination</h1><p className="subtitle">Inspect discipline drawings. Mark concerns. Coordinate the next action.</p></div><span className="workspace-badge">COORDINATION WORKSPACE</span></header>
      <div className="sync-toolbar">
        <label>Participant name<input value={username} disabled={busy || enabled} onChange={(event) => setUsername(event.target.value)} /></label>
        <button className="primary-button" type="button" disabled={busy || !username.trim() || !panes.every((pane) => pane.opened)} onClick={() => void toggleSync()}>{busy ? 'Working…' : enabled ? 'Disable sync & collaboration' : 'Enable sync & collaboration'}</button>
        <span>Viewport sync: {enabled ? 'Enabled' : 'Off'}<br />Collaboration: {collaboration}</span>
      </div>
      <p className="review-message" role="status">{message}</p>
      <div className="workspace-controls"><span>DRAWINGS <b>2-up review</b></span><button aria-expanded={registerOpen} onClick={() => setRegisterOpen((value) => !value)}>{registerOpen ? 'Hide' : 'Show'} Review Register · {findings.length}</button></div>
      <div className="coordination-layout"><div><div className="workflow-caption">01 · Open discipline drawings <span>→</span> 02 · Link views <span>→</span> 03 · Record coordination findings</div><div className="dual-viewers">
        {panes.map((pane, index) => (
          <section key={index} className="viewer-panel" aria-label={`Viewer ${index + 1}`}>
            <header className="viewer-heading"><h2>Viewer {index + 1}{pane.name ? ` · ${pane.name}` : ''}</h2><span>{pane.opened ? 'File ready' : pane.ready ? 'Canvas ready' : 'Initializing'}</span></header>
            <div className="discipline-row"><select aria-label={'Discipline for Viewer ' + (index + 1)} value={disciplines[index]} onChange={(event) => setDisciplines((current) => current.map((discipline, i) => i === index ? event.target.value : discipline))}>{['Architecture', 'Structural', 'Mechanical', 'Electrical', 'Plumbing'].map((discipline) => <option key={discipline}>{discipline}</option>)}</select><button className="open-drawing-button" disabled={busy || !pane.ready} onClick={() => setFileDialog(index)}>Open File Viewer {index + 1}</button></div>
            <div className="annotation-toolbar" role="toolbar" aria-label={'Viewer ' + (index + 1) + ' annotation tools'}><button aria-label="Select / navigate" title="Select / navigate" className={!activeTools[index] ? 'active' : ''} disabled={!pane.opened || busy} onClick={() => void activateTool(index, null)}>↖</button>{annotationTools.map((tool) => <button key={tool.action} title={tool.label} aria-label={tool.label} aria-pressed={activeTools[index] === tool.action} className={activeTools[index] === tool.action ? 'active' : ''} disabled={!pane.opened || busy} onClick={() => void activateTool(index, tool.action)}>{tool.icon}</button>)}<button className="save-markups" disabled={!pane.opened || busy} onClick={() => void saveMarkups(index)}>Save markups</button></div>
            <div className="pane-file-controls" hidden>
              <input ref={pickers[index]} type="file" hidden aria-label={`File for Viewer ${index + 1}`} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void open(index, file) }} />
              <button className="primary-button" disabled={busy || !pane.ready} onClick={() => pickers[index].current?.click()}>Open File Viewer {index + 1}</button>
              <input type="url" aria-label={`URL for Viewer ${index + 1}`} placeholder="Or enter a file URL" value={urls[index]} disabled={busy} onChange={(event) => setUrls((current) => current.map((url, i) => i === index ? event.target.value : url))} />
              <button className="retry-button" disabled={busy || !pane.ready || !urls[index].trim()} onClick={() => void open(index)}>Open URL</button>
              <button className="sample-button" disabled={busy} onClick={() => setUrls((current) => current.map((url, i) => i === index ? sampleUrl : url))}>Sample PDF</button>
            </div>
            <p className="pane-message" role="status">{pane.message}</p>
            <div className="viewer-stage" aria-busy={pane.loading}><div ref={containers[index]} className="canvas-container" />{pane.loading && <div className="loading-overlay" role="status"><span className="loading-spinner" aria-hidden="true" /><strong>{pane.ready ? 'Opening file…' : 'Initializing Canvas…'}</strong></div>}</div>
            <footer className="drawing-footer"><span>{pane.opened ? 'Drawing ready' : 'No drawing loaded'}</span><button disabled={!pane.opened} onClick={() => newFinding(index)}>＋ New finding</button></footer>
          </section>
        ))}
      </div></div><aside className="findings-panel"><header><h2>Review Register <span>{findings.length}</span></h2><div className="register-actions">{['All', 'Open', 'Resolved'].map((value) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value}</button>)}<button onClick={() => setRegisterOpen(false)} aria-label="Collapse Review Register">⌄</button></div></header><div className="register-table-wrap"><table className="register-table"><thead><tr><th>Finding</th><th>Drawing</th><th>Priority</th><th>Assignee</th><th>Status</th><th /></tr></thead><tbody>{findings.filter((f) => filter === 'All' || f.status === filter).map((finding) => <tr key={finding.id}><td><button onClick={() => { setDraft({ ...finding }); if (finding.guid && panes[finding.pane].name === finding.document) session.current?.viewers[finding.pane].annotations.select({ guid: finding.guid }) }}>{finding.title}</button></td><td title={finding.document}>{finding.document}</td><td><span className={'priority-tag ' + finding.priority.toLowerCase()}>{finding.priority}</span></td><td>{finding.assignee || 'Unassigned'}</td><td>{finding.status}</td><td><button onClick={() => setDraft({ ...finding })}>Edit</button></td></tr>)}</tbody></table>{findings.filter((f) => filter === 'All' || f.status === filter).length === 0 && <div className="register-empty"><strong>No coordination findings yet</strong><span>Draw a markup, then click New finding below its viewer to add it here.</span></div>}</div><p className="register-note">Session findings · Save markups to persist Canvas annotations.</p></aside></div>
      <p className="collaboration-note">For shared annotations, open the same document in both viewers. Different drawings can share viewport movement; collaboration follows each document’s room.</p>
      {fileDialog !== null && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="file-heading"><header><h2 id="file-heading">Open drawing · Viewer {fileDialog + 1}</h2><button disabled={busy} aria-label="Close" onClick={() => setFileDialog(null)}>×</button></header><label>Local file<input type="file" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void open(fileDialog, file) }} /></label><div className="separator">or use a file URL</div><label>Drawing URL<input type="url" value={urls[fileDialog]} onChange={(event) => setUrls((current) => current.map((url, i) => i === fileDialog ? event.target.value : url))} placeholder="https://files.example.com/drawing.pdf" /></label><button className="sample-button" onClick={() => setUrls((current) => current.map((url, i) => i === fileDialog ? sampleUrl : url))}>Use sample PDF</button><p className="dialog-message">{panes[fileDialog].message}</p><button className="primary-button" disabled={busy || !urls[fileDialog].trim()} onClick={() => void open(fileDialog)}>{busy ? 'Opening…' : 'Open URL'}</button></section></div>}
      {draft && <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-labelledby="finding-heading" onSubmit={(event) => { event.preventDefault(); if (!draft.title.trim()) return; setFindings((current) => current.some((f) => f.id === draft.id) ? current.map((f) => f.id === draft.id ? draft : f) : [...current, draft]); setDraft(null) }}><header><h2 id="finding-heading">Coordination finding</h2><button type="button" aria-label="Close" onClick={() => setDraft(null)}>×</button></header><p className="finding-location">{disciplines[draft.pane]} · {draft.document}<br />{draft.guid ? 'Linked to selected annotation' : 'Drawing-level finding'}</p><label>Concern title<input required autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Duct route intersects structural beam" /></label><label>Description<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Location, disciplines involved, proposed action" /></label><label>Assignee<input value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })} placeholder="Responsible person or team" /></label><div className="form-columns"><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>{['Low', 'Medium', 'High'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{['Open', 'In review', 'Resolved'].map((value) => <option key={value}>{value}</option>)}</select></label></div><button className="primary-button" type="submit">Save finding</button></form></div>}
    </main>
  )
}

export default App
