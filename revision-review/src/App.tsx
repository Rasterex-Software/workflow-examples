import { useEffect, useRef, useState } from 'react'
import { createViewer, type RasterexViewer } from '@rasterex/viewer'

type Source = { name: string; url?: string; fileName?: string }
const samples = [
  { name: 'Sample drawing · Version 1', url: 'https://res.cloudinary.com/dvgeew3bj/image/upload/v1779169696/Version_3_changes_-2bc5b8-5785a235.pdf_1_v2uimm.pdf' },
  { name: 'Sample drawing · Version 2', url: 'https://res.cloudinary.com/dvgeew3bj/image/upload/v1779169700/Main_version_1.pdf_1_ifrgjq.pdf' },
]
type Finding = { id: string; title: string; owner: string; status: 'Open' | 'Resolved' }
type Review = { findings: Finding[]; reviewer: string; notes: string; inspected: boolean; decision: string }
const emptyReview: Review = { findings: [], reviewer: '', notes: '', inspected: false, decision: '' }
function readReviews(): Record<string, Review> {
  try { const value = JSON.parse(localStorage.getItem('revision-reviews-v1') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { return {} }
}
export default function App() {
  const container = useRef<HTMLDivElement>(null)
  const viewer = useRef<RasterexViewer | null>(null)
  const lock = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState('Initializing Canvas…')
  const [message, setMessage] = useState('Preparing your review workspace.')
  const [sources, setSources] = useState<(Source | null)[]>([null, null])
  const [urls, setUrls] = useState(['', ''])
  const [active, setActive] = useState(false)
  const [aligning, setAligning] = useState(false)
  const [aligned, setAligned] = useState(false)
  const [opacity, setOpacity] = useState(50)
  const [common, setCommon] = useState(5)
  const [error, setError] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [connectionAttempt, setConnectionAttempt] = useState(0)
  const [reviews, setReviews] = useState<Record<string, Review>>(readReviews)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [findingTitle, setFindingTitle] = useState('')
  const [findingOwner, setFindingOwner] = useState('')
  const [storageError, setStorageError] = useState(false)
  // Scope host-side review metadata to this pair, not the currently active
  // Canvas tab. URL selections are not proof that either document has loaded.
  const pairKey = sources.every(Boolean) ? JSON.stringify(sources.map(s => s?.url || s?.fileName)) : ''
  const review = reviews[pairKey] || emptyReview
  function updateReview(patch: Partial<Review>) {
    if (!pairKey) return
    setReviews(old => ({ ...old, [pairKey]: { ...(old[pairKey] || emptyReview), ...patch } }))
  }
  useEffect(() => {
    try { localStorage.setItem('revision-reviews-v1', JSON.stringify(reviews)); setStorageError(false) } catch { setStorageError(true) }
  }, [reviews])
  useEffect(() => {
    if (!container.current) return
    let disposed = false
    const controller = new AbortController()
    setReady(false); setInitializing(true); setBusy('Loading Canvas…'); setError(false)
    const instance = createViewer({ container: container.current, viewerUrl: import.meta.env.VITE_CANVAS_URL || undefined, readyTimeoutMs: 30000, commandTimeoutMs: 60000 })
    viewer.current = instance
    // Mount's connection timeout only reports slowness; do not leave an
    // opaque overlay covering a slow iframe or an evaluation prompt forever.
    const slowTimer = window.setTimeout(() => {
      if (!disposed) { setBusy(''); setMessage('Canvas is taking longer to connect. Check the viewer below, or reconnect.'); }
    }, 15000)
    const unsub = [
      // startAlign resolves at alignStarted; only alignComplete confirms that
      // the operator finished selecting matching points in both documents.
      instance.clientCompare.on('alignComplete', () => { if (!disposed) { setAligning(false); setAligned(true); setMessage('Alignment complete. Inspect the revision overlay.'); } }),
      instance.clientCompare.on('failed', result => { if (!disposed) { setAligning(false); setError(true); setMessage(result.error || 'Comparison command failed. Try again.'); } }),
      instance.clientCompare.on('closed', () => { if (!disposed) { setActive(false); setAligning(false); setAligned(false); } }),
    ]
    void (async () => {
      try {
        await instance.mount()
        if (disposed) return
        window.clearTimeout(slowTimer)
        setBusy('')
        setMessage('Canvas loaded. Waiting for SDK readiness; complete any Canvas prompt below.')
        await instance.ready({ signal: controller.signal })
        if (!disposed) { setReady(true); setMessage('Canvas ready. Load the original and revised drawings.'); }
      }
      catch (e) { if (!disposed) { setError(true); setMessage(String(e)); } }
      finally { if (!disposed) { window.clearTimeout(slowTimer); setBusy(''); setInitializing(false) } }
    })()
    return () => { disposed = true; window.clearTimeout(slowTimer); controller.abort(); unsub.forEach(fn => fn()); viewer.current = null; instance.destroy() }
  }, [connectionAttempt])

  async function run(label: string, action: (v: RasterexViewer) => Promise<void>) {
    // React state updates are asynchronous, so use a synchronous lock to
    // prevent rapid clicks from sending overlapping SDK commands.
    if (lock.current || !ready || !viewer.current) return
    lock.current = true; setBusy(label); setError(false)
    try { await action(viewer.current) }
    catch (e) { setError(true); setMessage(e instanceof Error ? e.message : String(e)) }
    finally { lock.current = false; setBusy('') }
  }
  function load(index: number, file?: File) {
    void run('Opening drawing…', async v => {
      const url = urls[index].trim()
      if (!file && !/^https?:\/\//i.test(url)) throw new Error('Enter a valid HTTP or HTTPS drawing URL.')
      if (active) await v.clientCompare.close()
      if (!file) {
        const parsed = new URL(url)
        setSources(old => old.map((s, i) => i === index ? { name: decodeURIComponent(parsed.pathname.split('/').pop() || 'Drawing'), url } : s))
        setAligned(false)
        setMessage('Drawing URL selected. Compare revisions will load both sources directly in Canvas.')
        return
      }
      // Clear a replaced source so a failed load cannot be compared as the new revision.
      setSources(old => old.map((s, i) => i === index ? null : s))
      const result = file ? await v.documents.openFile(file) : await v.documents.open({ url })
      const resolvedName = result.fileReady.fileName
      if (file && !resolvedName) throw new Error('Canvas opened the file but did not return its resolved filename. Use a drawing URL for comparison.')
      setSources(old => old.map((s, i) => i === index ? { name: file?.name || resolvedName || url.split('/').pop() || 'Drawing', ...(file ? { fileName: resolvedName } : { url }) } : s))
      setAligned(false); setMessage('Drawing loaded. Compare when both revisions are ready.')
    })
  }
  function compare() {
    void run('Creating revision overlay…', async v => {
      if (!sources[0] || !sources[1]) return
      await createComparison(v, sources as Source[])
    })
  }
  async function createComparison(v: RasterexViewer, pair: Source[]) {
    // The clientCompare command loads URL sources itself. Pre-opening them
    // would add an unrelated fileReady dependency before comparison can start.
    // Keep the overlay pending until the SDK's correlated ready result arrives.
    if (active) await v.clientCompare.close()
    await v.clientCompare.create({ backgroundUrl: pair[0].url, backgroundFileName: pair[0].fileName, overlayUrl: pair[1].url, overlayFileName: pair[1].fileName, backgroundColor: '#E86767', overlayColor: '#0E3BD8' })
    setActive(true); setAligned(false)
    await v.clientCompare.setOpacity(opacity)
    await v.clientCompare.setCommonLevel(common)
    setMessage('Overlay ready. Align matching points if the drawings are offset.')
  }
  function loadSamples() {
    void run('Loading and comparing sample revisions…', async v => {
      // Preserve the selected pair on failure so Compare revisions can retry.
      setSources(samples); setUrls(samples.map(s => s.url))
      await createComparison(v, samples)
    })
  }
  function exportReview() {
    const blob = new Blob([JSON.stringify({ sources, ...review, alignmentConfirmed: aligned, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'revision-review.json'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const disabled = !ready || !!busy || aligning
  const openFindings = review.findings.filter(f => f.status === 'Open').length
  const canComplete = active && !disabled && review.inspected && !!review.reviewer.trim()
  return <main>
    <header><div className="brand">R<span>Revision Review</span></div><span className="tag">DRAWING CONTROL</span><span className="connection">{ready ? '● Canvas ready' : initializing ? '○ Connecting' : '○ Not connected'}</span>{!ready && !busy && <button onClick={() => { setSources([null, null]); setActive(false); setAligning(false); setAligned(false); setConnectionAttempt(n => n + 1) }}>Reconnect Canvas</button>}</header>
    <section className="titlebar"><div><p className="eyebrow">COMPARE & ALIGN</p><h1>See what changed.</h1><p>Review an issued drawing against its latest revision.</p></div><button className="primary" disabled={disabled || !sources.every(Boolean)} onClick={compare}>{active ? 'Rebuild comparison' : 'Compare revisions'} →</button></section>
    <nav className="workflow-steps" aria-label="Review progress">{['Prepare revisions', 'Compare & align', 'Inspect & record', 'Review decision'].map((label, i) => <span key={label} className={(i === 0 ? sources.every(Boolean) : i === 1 ? active : i === 2 ? review.inspected : !!review.decision) ? 'done' : ''}><b>{i + 1}</b>{label}</span>)}<button onClick={() => setRegisterOpen(o => !o)}>{registerOpen ? 'Hide' : 'Show'} review register · {review.findings.length}</button></nav>
    <div className="workspace"><aside>
      <div className="section-label">01 / DRAWING SET</div>
      <section className="sample-card"><h2>Try a sample revision set</h2><p>Two PDF drawing versions from the existing Design & Review demo.</p><button disabled={disabled} onClick={loadSamples}>Load sample revisions</button></section>
      {['Original drawing', 'Revised drawing'].map((label, i) => <section className="source" key={label}><h2><span className={'swatch s' + i}/>{label}</h2><div className="filename">{sources[i]?.name || 'No drawing selected'}</div><details className="file-options"><summary>Choose file or URL</summary><label className={'file-button ' + (disabled ? 'disabled' : '')}>Open {i ? 'revision' : 'original'}<input aria-label={'Open ' + label} type="file" disabled={disabled} onChange={e => { const file = e.target.files?.[0]; if (file) load(i, file); e.target.value = '' }} /></label><input aria-label={label + ' URL'} placeholder="https://…/drawing.pdf" value={urls[i]} disabled={disabled} onChange={e => setUrls(old => old.map((u, j) => j === i ? e.target.value : u))}/><button disabled={disabled || !urls[i].trim()} onClick={() => load(i)}>Use URL</button></details></section>)}
      <div className="section-label">02 / ALIGN & INSPECT</div>
      <section className="controls"><h2>Match the drawings</h2><p>Pick the same reference point in each drawing, directly in Canvas.</p><button disabled={disabled || !active} onClick={() => { setAligning(true); setAligned(false); setMessage('Select one matching point in each drawing. Waiting for Canvas to finish alignment.'); void run('Starting alignment…', async v => { try { await v.clientCompare.startAlign() } catch (e) { setAligning(false); throw e } }) }}>{aligning ? 'Select matching points…' : aligned ? 'Realign drawings' : 'Align matching points'}</button>{aligned && <span className="aligned">✓ Alignment complete</span>}
      <label className="slider-label">Revision balance <span>{opacity}%</span><input type="range" min="0" max="100" value={opacity} disabled={disabled || !active} onChange={e => setOpacity(Number(e.target.value))} onPointerUp={() => void run('Updating overlay…', async v => { await v.clientCompare.setOpacity(opacity) })} onKeyUp={() => void run('Updating overlay…', async v => { await v.clientCompare.setOpacity(opacity) })}/></label><div className="range-caption"><span>Revised only</span><span>Original only</span></div>
      <label className="slider-label">Common geometry <span>{common}/10</span><input type="range" min="1" max="10" value={common} disabled={disabled || !active} onChange={e => setCommon(Number(e.target.value))} onPointerUp={() => void run('Updating contrast…', async v => { await v.clientCompare.setCommonLevel(common) })} onKeyUp={() => void run('Updating contrast…', async v => { await v.clientCompare.setCommonLevel(common) })}/></label><div className="range-caption"><span>Near white</span><span>Black</span></div></section>
      <details className="review-help"><summary>Review & handoff guidance</summary><p>Inspect changed areas and record findings in the review register above. Alignment is optional when drawings already match.</p><p>{review.decision ? `Decision: ${review.decision}` : 'Review not completed'}</p></details>
    </aside><section className="drawing"><div className="drawing-toolbar"><span>{active ? 'Revision overlay' : 'Drawing workspace'}</span><div className="legend"><span><i className="s0"/>Original</span><span><i className="s1"/>Revised</span></div><button disabled={!active || !!busy} onClick={() => void run('Closing comparison…', async v => { await v.clientCompare.close(); setMessage('Comparison closed. Source drawings remain open.'); })}>{aligning ? 'Cancel & close comparison' : 'Close comparison'}</button></div><div className="stage"><div className="canvas" ref={container}/>{busy && <div className="loading" role="status"><span className="spinner"/>{busy}</div>}{aligning && !busy && <div className="instruction" role="status">Select the same reference point in both drawings. <strong>Alignment in progress</strong></div>}</div><footer className={error ? 'error' : ''} role="status">{message}</footer></section></div>
    {registerOpen && <section className="review-register" aria-label="Review register"><div className="register-header"><h2>Revision review register <span>{openFindings} open findings</span></h2><span>{storageError ? 'Browser storage unavailable — export to keep your work' : 'Saved in this browser · selected revision pair'}</span><button disabled={!pairKey} onClick={exportReview}>Export review</button></div>{!pairKey ? <p>Load both revisions to start a review.</p> : <div className="register-body"><div className="findings"><form onSubmit={e => { e.preventDefault(); if (!findingTitle.trim()) return; updateReview({ findings: [...review.findings, { id: crypto.randomUUID(), title: findingTitle.trim(), owner: findingOwner.trim(), status: 'Open' }], decision: '' }); setFindingTitle(''); setFindingOwner('') }}><input aria-label="Finding description" placeholder="Describe a drawing change or concern…" value={findingTitle} onChange={e => setFindingTitle(e.target.value)} required/><input aria-label="Finding owner" placeholder="Owner / discipline" value={findingOwner} onChange={e => setFindingOwner(e.target.value)}/><button disabled={!active || disabled}>Add finding</button></form><div className="finding-list">{review.findings.length ? review.findings.map((finding, index) => <div className="finding-row" key={finding.id}><span className="finding-id">{String(index + 1).padStart(2, '0')}</span><span>{finding.title}</span><input aria-label={'Owner for ' + finding.title} value={finding.owner} onChange={e => updateReview({ findings: review.findings.map(f => f.id === finding.id ? { ...f, owner: e.target.value } : f), decision: '' })}/><select aria-label={'Status for ' + finding.title} value={finding.status} onChange={e => updateReview({ findings: review.findings.map(f => f.id === finding.id ? { ...f, status: e.target.value as Finding['status'] } : f), decision: '' })}><option>Open</option><option>Resolved</option></select></div>) : <p>No findings yet. Inspect the overlay and record any changes requiring follow-up.</p>}</div></div><div className="review-decision"><input aria-label="Reviewer name" placeholder="Reviewer name" value={review.reviewer} onChange={e => updateReview({ reviewer: e.target.value, decision: '' })}/><textarea aria-label="Review notes" placeholder="Review scope, checked areas, and handoff notes…" value={review.notes} onChange={e => updateReview({ notes: e.target.value, decision: '' })}/><label><input type="checkbox" disabled={!active || disabled} checked={review.inspected} onChange={e => updateReview({ inspected: e.target.checked, decision: '' })}/> I inspected the revision overlay.</label><div className="decision-actions"><button disabled={!canComplete || openFindings > 0} onClick={() => updateReview({ decision: 'Reviewed — no open findings' })}>Complete review</button><button disabled={!canComplete || !openFindings} onClick={() => updateReview({ decision: 'Follow-up required' })}>Request follow-up</button></div><small>{review.decision || 'Complete requires a reviewer, inspection confirmation, and no open findings.'}</small></div></div>}<p className="register-disclaimer">Manual review findings, not automatically detected changes or Canvas annotations. Local uploads are identified by their Canvas filename; use unique revision filenames.</p></section>}
  </main>
}
