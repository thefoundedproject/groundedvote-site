'use client'

import { useState, useEffect, useCallback } from 'react'

const POLICY_TOPICS = [
  'HEALTHCARE','ECONOMY','IMMIGRATION','ENVIRONMENT','EDUCATION','HOUSING',
  'CRIMINAL_JUSTICE','FOREIGN_POLICY','VOTING_RIGHTS','SOCIAL_SECURITY',
  'DRUG_POLICY','GUN_POLICY','LABOR','TAXES','VETERANS','INFRASTRUCTURE',
  'TECHNOLOGY','OTHER',
]

const SOURCE_TYPES = [
  'VOTING_RECORD','CAMPAIGN_PLATFORM','QUESTIONNAIRE',
  'PUBLIC_STATEMENT','MEDIA_INTERVIEW','THIRD_PARTY_AGGREGATOR',
]

const S = {
  bg: '#0F1B1F',
  gold: '#D8AB69',
  cream: '#F5F0E8',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(216,171,105,0.15)',
  muted: 'rgba(245,240,232,0.45)',
  danger: '#E57373',
  success: '#81C784',
}

function useAdmin() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)

  const login = (t) => {
    setToken(t)
    setAuthed(true)
    sessionStorage.setItem('gv_admin', t)
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('gv_admin')
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  const authHeader = { Authorization: `Bearer ${token}` }
  return { token, authed, login, authHeader }
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ minHeight: '100vh', backgroundColor: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>GroundedVote Admin</p>
        <input
          type="password"
          placeholder="Admin secret"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val && onLogin(val)}
          style={{ width: '100%', padding: '14px 18px', backgroundColor: 'rgba(255,255,255,0.06)', border: `1.5px solid ${S.border}`, borderRadius: 6, fontSize: 15, color: S.cream, outline: 'none', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => val && onLogin(val)}
          style={{ width: '100%', marginTop: 10, backgroundColor: S.gold, color: S.bg, padding: '14px', borderRadius: 6, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
        >
          Enter
        </button>
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const colors = {
    APPROVED: S.success, PENDING: S.muted, GENERATING: S.gold,
    AUDITING: S.gold, FAILED: S.danger, ARCHIVED: S.muted,
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors[status] || S.muted }}>
      {status}
    </span>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, backgroundColor: type === 'error' ? '#B71C1C' : '#1B5E20', color: 'white', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 999, maxWidth: 360 }}>
      {msg}
    </div>
  )
}

// ─── Add Candidate Form ───────────────────────────────────────────────────────
function AddCandidateForm({ raceId, authHeader, onAdded }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', party: '', incumbent: false, website: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/candidate', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId, ...form }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { setForm({ firstName: '', lastName: '', party: '', incumbent: false, website: '', photoUrl: '' }); onAdded(data.candidate) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(216,171,105,0.05)', border: `1px solid ${S.border}`, borderRadius: 8, padding: 20, marginTop: 12 }}>
      <p style={{ color: S.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Add Candidate</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input required placeholder="First name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} style={inputStyle} />
        <input required placeholder="Last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input placeholder="Party (stored, not shown in quiz)" value={form.party} onChange={e => setForm(f => ({ ...f, party: e.target.value }))} style={inputStyle} />
        <input placeholder="Website (optional)" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} style={inputStyle} />
      </div>
      <input placeholder="Photo URL (optional — auto-populated for incumbents with BioguideID)" value={form.photoUrl} onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.muted, fontSize: 13, marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.incumbent} onChange={e => setForm(f => ({ ...f, incumbent: e.target.checked }))} />
        Incumbent
      </label>
      <button type="submit" disabled={loading} style={btnStyle(loading)}>
        {loading ? 'Adding...' : 'Add Candidate'}
      </button>
    </form>
  )
}

// ─── Add Position Form ────────────────────────────────────────────────────────
function AddPositionForm({ candidateId, authHeader, onAdded }) {
  const [form, setForm] = useState({ topic: 'HEALTHCARE', stance: '', sourceType: 'CAMPAIGN_PLATFORM', sourceUrl: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/position', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, ...form }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { setForm({ topic: 'HEALTHCARE', stance: '', sourceType: 'CAMPAIGN_PLATFORM', sourceUrl: '' }); onAdded() }
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px dashed ${S.border}`, borderRadius: 6, padding: 16, marginTop: 8 }}>
      <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Add Position</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} style={selectStyle}>
          {POLICY_TOPICS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={form.sourceType} onChange={e => setForm(f => ({ ...f, sourceType: e.target.value }))} style={selectStyle}>
          {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <textarea
        required
        placeholder="Candidate's stated position — plain language summary (e.g. 'Supports expanding Medicare to cover dental and vision')"
        value={form.stance}
        onChange={e => setForm(f => ({ ...f, stance: e.target.value }))}
        rows={3}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
      />
      <input placeholder="Source URL (optional)" value={form.sourceUrl} onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
      <button type="submit" disabled={loading} style={{ ...btnStyle(loading), fontSize: 12, padding: '8px 16px' }}>
        {loading ? 'Saving...' : 'Save Position'}
      </button>
    </form>
  )
}

// ─── Race Card ────────────────────────────────────────────────────────────────

// ── QUESTION REVIEW ────────────────────────────────────────────────────────
const AUDIT_STATUSES = ['APPROVED', 'PENDING', 'REJECTED']
const TOPIC_OPTS = ['HEALTHCARE','ECONOMY','CLIMATE','EDUCATION','IMMIGRATION','CRIMINAL_JUSTICE','FOREIGN_POLICY','HOUSING','CIVIL_RIGHTS','GUN_POLICY','TAXES','SOCIAL_SECURITY','VETERANS','TECHNOLOGY','INFRASTRUCTURE']

function QuestionReview({ raceId, authHeader, onToast }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // question id being edited
  const [editText, setEditText] = useState('')
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const handleCSVImport = async () => {
    if (!csvText.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/import-questions', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId, csv: csvText }),
      })
      const data = await res.json()
      if (res.ok) {
        onToast(`Imported ${data.created} questions as PENDING`, 'success')
        setCsvText(''); setShowImport(false); load()
      } else {
        onToast(data.error || 'Import failed', 'error')
      }
    } catch { onToast('Import failed', 'error') }
    setImporting(false)
  }

    const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/questions?raceId=${raceId}`, { headers: authHeader })
    const data = await res.json()
    setQuestions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useState(() => { load() }, [])

  const patch = async (id, update) => {
    const res = await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...update }),
    })
    if (res.ok) {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...update } : q))
      onToast('Question updated', 'success')
    } else {
      onToast('Update failed', 'error')
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this question? This cannot be undone.')) return
    const res = await fetch('/api/admin/questions', {
      method: 'DELETE',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setQuestions(prev => prev.filter(q => q.id !== id))
      onToast('Question deleted', 'success')
    }
  }

  const STATUS_COLOR = { APPROVED: '#5ECFA6', PENDING: '#D8AB69', REJECTED: '#E57373' }

  if (loading) return <p style={{ color: S.muted, fontSize: 13, padding: '16px 0' }}>Loading questions…</p>
  if (!questions.length) return <p style={{ color: S.muted, fontSize: 13, padding: '16px 0' }}>No questions yet. Generate questions first.</p>

  const approved = questions.filter(q => q.auditStatus === 'APPROVED').length
  const pending = questions.filter(q => q.auditStatus === 'PENDING').length

  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ color: S.cream, fontSize: 13, fontWeight: 700, margin: 0 }}>
          {questions.length} Questions
          <span style={{ marginLeft: 12, color: '#5ECFA6', fontSize: 12 }}>✓ {approved} approved</span>
          {pending > 0 && <span style={{ marginLeft: 8, color: '#D8AB69', fontSize: 12 }}>⏳ {pending} pending</span>}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowImport(!showImport)}
            style={{ backgroundColor: 'rgba(216,171,105,0.1)', color: S.gold, border: '1px solid rgba(216,171,105,0.3)', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⬆ Import CSV
          </button>
          <button
            onClick={() => questions.filter(q => q.auditStatus === 'PENDING').forEach(q => patch(q.id, { auditStatus: 'APPROVED' }))}
            style={{ backgroundColor: 'rgba(94,207,166,0.15)', color: '#5ECFA6', border: '1px solid rgba(94,207,166,0.3)', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Approve All Pending
          </button>
        </div>
      </div>

      {showImport && (
        <div style={{ backgroundColor: 'rgba(216,171,105,0.05)', border: '1px solid rgba(216,171,105,0.2)', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Paste CSV — format: questionText, TOPIC, weight
          </p>
          <p style={{ color: S.faint, fontSize: 11, margin: '0 0 8px' }}>
            Example: Should the federal minimum wage be raised to $20/hr?,ECONOMY,1.5
          </p>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={6}
            placeholder={"questionText,topic,weight\nShould Congress cap insulin prices?,HEALTHCARE,1.8\nShould the US expand nuclear energy?,CLIMATE,1.2"}
            style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(216,171,105,0.2)', borderRadius: 5, padding: '10px 12px', color: S.cream, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <button
            onClick={handleCSVImport}
            disabled={importing || !csvText.trim()}
            style={{ backgroundColor: importing ? 'rgba(216,171,105,0.3)' : S.gold, color: S.bg, border: 'none', borderRadius: 5, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: importing ? 'default' : 'pointer', fontFamily: 'inherit' }}
          >
            {importing ? 'Importing…' : 'Import Questions'}
          </button>
        </div>
      )}

      {questions.map(q => (
        <div
          key={q.id}
          style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid rgba(216,171,105,0.1)`, borderRadius: 6, padding: '12px 14px', marginBottom: 8 }}
        >
          {editing === q.id ? (
            <div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(216,171,105,0.3)', borderRadius: 5, padding: '8px 12px', color: S.cream, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => { patch(q.id, { questionText: editText }); setEditing(null) }} style={{ backgroundColor: S.gold, color: S.bg, border: 'none', borderRadius: 5, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                <button onClick={() => setEditing(null)} style={{ backgroundColor: 'transparent', color: S.muted, border: `1px solid ${S.border}`, borderRadius: 5, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: S.cream, fontSize: 13, lineHeight: 1.55, margin: '0 0 6px' }}>{q.questionText}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: S.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{q.topic?.replace(/_/g, ' ')}</span>
                  <span style={{ color: S.muted, fontSize: 11 }}>weight: {q.weight}</span>
                  <span style={{ color: S.muted, fontSize: 11 }}>{q._count?.candidateAnswers ?? 0} positions extracted</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                <select
                  value={q.auditStatus}
                  onChange={e => patch(q.id, { auditStatus: e.target.value })}
                  style={{ backgroundColor: `${STATUS_COLOR[q.auditStatus]}22`, color: STATUS_COLOR[q.auditStatus], border: `1px solid ${STATUS_COLOR[q.auditStatus]}66`, borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {AUDIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditing(q.id); setEditText(q.questionText) }} style={{ backgroundColor: 'transparent', color: S.muted, border: `1px solid ${S.border}`, borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                  <button onClick={() => remove(q.id)} style={{ backgroundColor: 'transparent', color: '#E57373', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RaceCard({ race, authHeader, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [candidates, setCandidates] = useState(race.candidates || [])
  const [importing, setImporting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [expandedCandidate, setExpandedCandidate] = useState(null)
  const [showQuestions, setShowQuestions] = useState(false)

  const handleImport = async () => {
    setImporting(true)
    const res = await fetch('/api/admin/import-candidates', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: race.id }),
    })
    const data = await res.json()
    setImporting(false)
    if (res.ok) {
      onToast(`Imported ${data.results?.[0]?.imported ?? 0} candidates from Congress.gov`, 'success')
      // Refresh candidates
      const r2 = await fetch(`/api/admin/race/${race.id}`, { headers: authHeader })
      const d2 = await r2.json()
      if (d2.race) setCandidates(d2.race.candidates)
    } else {
      onToast(data.error || 'Import failed', 'error')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: race.id }),
    })
    const data = await res.json()
    setGenerating(false)
    if (res.ok) {
      onToast(`Generated ${data.questions?.length ?? 0} questions for ${race.label}`, 'success')
    } else {
      onToast(data.error || 'Generation failed', 'error')
    }
  }

  const handleExtract = async () => {
    setExtracting(true)
    const res = await fetch('/api/admin/extract-positions', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: race.id }),
    })
    const data = await res.json()
    setExtracting(false)
    if (res.ok) {
      onToast(`Positions: ${data.created ?? 0} created, ${data.skipped ?? 0} skipped, ${data.failed ?? 0} failed`, 'success')
    } else {
      onToast(data.error || 'Extraction failed', 'error')
    }
  }

  const approvedQs = race._count?.questions ?? 0

  return (
    <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <p style={{ color: S.cream, fontSize: 15, fontWeight: 600, margin: 0 }}>{race.label}</p>
          <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>
            {candidates.length} candidates · {approvedQs} approved questions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {approvedQs > 0 && <Badge status="APPROVED" />}
          <span style={{ color: S.gold, fontSize: 16 }}>{expanded ? '↑' : '↓'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${S.border}` }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '16px 0 12px' }}>
            <button onClick={handleImport} disabled={importing} style={btnStyle(importing)}>
              {importing ? 'Importing...' : '⬇ Import from Congress.gov'}
            </button>
            <button onClick={() => setShowAddCandidate(!showAddCandidate)} style={{ ...btnStyle(false), backgroundColor: 'transparent', border: `1px solid ${S.border}`, color: S.cream }}>
              + Add Manually
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || candidates.length < 2}
              title={candidates.length < 2 ? 'Need at least 2 candidates' : ''}
              style={{ ...btnStyle(generating || candidates.length < 2), backgroundColor: generating ? 'rgba(216,171,105,0.3)' : 'rgba(216,171,105,0.15)', color: S.gold, border: `1px solid rgba(216,171,105,0.3)` }}
            >
              {generating ? '⚙ Generating...' : '⚡ Generate Questions'}
            </button>
            <button
              onClick={handleExtract}
              disabled={extracting || approvedQs === 0}
              title={approvedQs === 0 ? 'Generate questions first' : 'Extract AI positions for all candidates'}
              style={{ ...btnStyle(extracting || approvedQs === 0), backgroundColor: extracting ? 'rgba(94,207,166,0.2)' : 'rgba(94,207,166,0.1)', color: '#5ECFA6', border: '1px solid rgba(94,207,166,0.25)' }}
            >
              {extracting ? '🧠 Extracting...' : '🧠 Extract Positions'}
            </button>
            <button
              onClick={() => setShowQuestions(!showQuestions)}
              style={{ ...btnStyle(false), backgroundColor: 'transparent', border: `1px solid rgba(94,207,166,0.3)`, color: '#5ECFA6' }}
            >
              {showQuestions ? 'Hide Questions' : '📋 Review Questions'}
            </button>
          </div>

          {showAddCandidate && (
            <AddCandidateForm
              raceId={race.id}
              authHeader={authHeader}
              onAdded={(c) => { setCandidates(prev => [...prev, c]); setShowAddCandidate(false) }}
            />
          )}

          {/* Question Review */}
          {showQuestions && (
            <QuestionReview raceId={race.id} authHeader={authHeader} onToast={onToast} />
          )}

          {/* Candidates list */}
          {candidates.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Candidates</p>
              {candidates.map(c => (
                <div key={c.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedCandidate(expandedCandidate === c.id ? null : c.id)}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <span style={{ color: S.cream, fontSize: 14, fontWeight: 600 }}>{c.firstName} {c.lastName}</span>
                      {c.incumbent && <span style={{ color: S.gold, fontSize: 10, fontWeight: 700, marginLeft: 8, letterSpacing: '0.1em' }}>INCUMBENT</span>}
                      <span style={{ color: S.muted, fontSize: 12, marginLeft: 8 }}>{(c.positions || []).length} positions</span>
                    </div>
                    <span style={{ color: S.muted, fontSize: 12 }}>{expandedCandidate === c.id ? '↑' : '+ Add Position'}</span>
                  </div>
                  {expandedCandidate === c.id && (
                    <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${S.border}` }}>
                      {(c.positions || []).map(p => (
                        <div key={p.id} style={{ padding: '8px 0', borderBottom: `1px solid rgba(216,171,105,0.08)` }}>
                          <span style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.topic.replace(/_/g, ' ')}</span>
                          <p style={{ color: S.muted, fontSize: 13, margin: '4px 0 0', lineHeight: 1.5 }}>{p.stance}</p>
                        </div>
                      ))}
                      <AddPositionForm
                        candidateId={c.id}
                        authHeader={authHeader}
                        onAdded={() => {
                          // Refresh this candidate's positions
                          fetch(`/api/admin/race/${race.id}`, { headers: authHeader })
                            .then(r => r.json())
                            .then(d => { if (d.race) setCandidates(d.race.candidates) })
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {candidates.length === 0 && (
            <p style={{ color: S.muted, fontSize: 13, marginTop: 8 }}>No candidates yet. Import from Congress.gov or add manually.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
  padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.06)',
  border: `1px solid rgba(216,171,105,0.2)`, borderRadius: 6,
  fontSize: 13, color: '#F5F0E8', outline: 'none', width: '100%',
}
const selectStyle = {
  ...inputStyle, cursor: 'pointer', backgroundColor: '#0F2025',
}
const btnStyle = (disabled) => ({
  backgroundColor: disabled ? 'rgba(216,171,105,0.3)' : '#D8AB69',
  color: '#0F1B1F', padding: '10px 18px', borderRadius: 6,
  fontWeight: 700, fontSize: 13, border: 'none',
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
})

// ─── Main Admin Page ──────────────────────────────────────────────────────────

// ── ADD RACE FORM ──────────────────────────────────────────────────────────
function AddRaceForm({ authHeader, onToast, onCreated }) {
  const [form, setForm] = useState({
    label: '', state: '', stateFull: '', chamber: 'SENATE', district: '', year: '2026',
  })
  const [saving, setSaving] = useState(false)

  const field = (k, label, placeholder, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={form[k]}
        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid rgba(216,171,105,0.2)`, borderRadius: 6, padding: '10px 14px', color: S.text, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.label || !form.state || !form.year) return onToast('label, state, year required', 'error')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...form, year: Number(form.year), district: form.district || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onToast(`Race "${data.label}" created`, 'success')
      setForm({ label: '', state: '', stateFull: '', chamber: 'SENATE', district: '', year: '2026' })
      onCreated?.()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <p style={{ color: S.muted, fontSize: 13, marginBottom: 20 }}>
        Create a new race. After creating, go to the Races tab to add candidates and generate questions.
      </p>
      <form onSubmit={handleSubmit}>
        {field('label', 'Race Label', 'e.g. Minnesota U.S. Senate 2026')}
        {field('state', 'State Code', 'e.g. MN')}
        {field('stateFull', 'State Full Name', 'e.g. Minnesota')}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Chamber</label>
          <select
            value={form.chamber}
            onChange={e => setForm(p => ({ ...p, chamber: e.target.value }))}
            style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(216,171,105,0.2)', borderRadius: 6, padding: '10px 14px', color: S.text, fontSize: 13, fontFamily: 'inherit' }}
          >
            <option value="SENATE">Senate</option>
            <option value="HOUSE">House</option>
          </select>
        </div>

        {field('district', 'District (House only)', 'e.g. 5', 'text')}
        {field('year', 'Election Year', '2026', 'number')}

        <button
          type="submit"
          disabled={saving}
          style={{ backgroundColor: S.gold, color: S.bg, padding: '12px 24px', borderRadius: 6, fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          {saving ? 'Creating…' : 'Create Race'}
        </button>
      </form>
    </div>
  )
}

export default function AdminPage() {
  const { authed, login, authHeader } = useAdmin()
  const [races, setRaces] = useState([])
  const [stats, setStats] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [activeTab, setActiveTab] = useState('races')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000)
  }

  const loadData = useCallback(async () => {
    if (!authed) return
    setLoading(true)
    const res = await fetch('/api/admin/overview', { headers: authHeader })
    const data = await res.json()
    if (res.ok) { setRaces(data.races); setStats(data.stats); setFunnel(data.funnel) }
    setLoading(false)
  }, [authed, authHeader])

  useEffect(() => { loadData() }, [loadData])

  if (!authed) return <LoginScreen onLogin={login} />

  return (
    <div style={{ minHeight: '100vh', backgroundColor: S.bg, padding: '80px 24px 60px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>GroundedVote Admin</p>
            <h1 style={{ color: S.cream, fontSize: 28, fontWeight: 300, margin: 0 }}>Platform Dashboard</h1>
          </div>
          <button onClick={loadData} style={{ ...btnStyle(loading), fontSize: 12 }}>
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Races', value: stats.races },
              { label: 'Candidates', value: stats.candidates },
              { label: 'Positions', value: stats.positions },
              { label: 'Questions (Approved)', value: stats.approvedQuestions },
              { label: 'Quiz Sessions', value: stats.sessions },
              { label: 'Awareness Leads', value: stats.leads },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: '16px 18px' }}>
                <p style={{ color: S.gold, fontSize: 24, fontWeight: 700, margin: 0 }}>{s.value ?? '—'}</p>
                <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Funnel analytics */}
        {funnel && (
          <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: '18px 20px', marginBottom: 24 }}>
            <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              Quiz Funnel — Last {funnel.days} Days
            </p>
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              {[
                { label: 'Started', value: funnel.started, color: S.gold },
                { label: 'Completed', value: funnel.completed, color: S.gold, sub: `${funnel.completionRate}% completion` },
                { label: 'Emailed', value: funnel.emailed, color: '#5ECFA6', sub: `${funnel.emailRate}% of completed` },
                { label: 'Shared', value: funnel.shared, color: '#5ECFA6' },
              ].map((f, i) => (
                <div key={f.label} style={{ flex: '1 1 120px', padding: '0 20px 0 0', borderLeft: i > 0 ? `1px solid ${S.border}` : 'none', paddingLeft: i > 0 ? 20 : 0, marginLeft: i > 0 ? 0 : 0 }}>
                  <p style={{ color: f.color, fontSize: 28, fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>{f.value}</p>
                  <p style={{ color: S.muted, fontSize: 11, margin: '2px 0 0' }}>{f.label}</p>
                  {f.sub && <p style={{ color: 'rgba(245,240,232,0.3)', fontSize: 10, margin: '2px 0 0' }}>{f.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {['races', 'add-race', 'leads'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: activeTab === tab ? S.gold : 'transparent', color: activeTab === tab ? S.bg : S.muted }}
            >
              {tab === 'add-race' ? 'Add Race' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Races tab */}
        {activeTab === 'races' && (
          <div>
            <p style={{ color: S.muted, fontSize: 13, marginBottom: 16 }}>
              {races.length} competitive races · Click a race to manage candidates and generate questions.
            </p>
            {races.map(race => (
              <RaceCard key={race.id} race={race} authHeader={authHeader} onToast={showToast} />
            ))}
          </div>
        )}

        {/* Add Race tab */}
        {activeTab === 'add-race' && <AddRaceForm authHeader={authHeader} onToast={showToast} onCreated={() => { fetchData(); setActiveTab('races') }} />}

        {/* Leads tab */}
        {activeTab === 'leads' && <LeadsTable authHeader={authHeader} />}

      </div>
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  )
}

// ─── Leads Table ──────────────────────────────────────────────────────────────
function LeadsTable({ authHeader }) {
  const [leads, setLeads] = useState([])
  const [pending, setPending] = useState({})
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(null)  // stateCode being notified
  const [notifyResult, setNotifyResult] = useState(null)

  useEffect(() => {
    fetch('/api/admin/leads', { headers: authHeader })
      .then(r => r.json())
      .then(d => { setLeads(d.leads || []); setLoading(false) })
    fetch('/api/admin/notify-state', { headers: authHeader })
      .then(r => r.json())
      .then(d => setPending(d.pending || {}))
  }, [authHeader])

  const handleNotify = async (stateCode, stateName) => {
    if (!confirm(`Send launch emails to all ${pending[stateCode]} pending leads in ${stateName}?`)) return
    setNotifying(stateCode)
    setNotifyResult(null)
    const res = await fetch('/api/admin/notify-state', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stateCode, stateName }),
    })
    const data = await res.json()
    setNotifying(null)
    setNotifyResult({ stateCode, ...data })
    // Refresh pending counts
    fetch('/api/admin/notify-state', { headers: authHeader })
      .then(r => r.json())
      .then(d => setPending(d.pending || {}))
  }

  if (loading) return <p style={{ color: S.muted, fontSize: 14 }}>Loading leads...</p>

  const pendingStates = Object.entries(pending).sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* State notification panel */}
      {pendingStates.length > 0 && (
        <div style={{ backgroundColor: 'rgba(94,207,166,0.05)', border: '1px solid rgba(94,207,166,0.2)', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
          <p style={{ color: '#5ECFA6', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            📬 Pending State Launch Notifications
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pendingStates.map(([code, count]) => (
              <button
                key={code}
                onClick={() => handleNotify(code, code)}
                disabled={notifying === code}
                style={{
                  padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  backgroundColor: notifying === code ? 'rgba(94,207,166,0.2)' : 'rgba(94,207,166,0.1)',
                  color: '#5ECFA6', border: '1px solid rgba(94,207,166,0.3)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {notifying === code ? 'Sending...' : `${code} — ${count} pending`}
              </button>
            ))}
          </div>
          {notifyResult && (
            <p style={{ color: S.muted, fontSize: 12, marginTop: 10 }}>
              {notifyResult.stateCode}: {notifyResult.sent} sent, {notifyResult.failed ?? 0} failed
            </p>
          )}
        </div>
      )}

      <p style={{ color: S.muted, fontSize: 13, marginBottom: 16 }}>
        {leads.length} awareness quiz leads
      </p>
      {leads.length === 0 ? (
        <p style={{ color: S.muted, fontSize: 14 }}>No leads yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Email', 'Profile', 'State', 'Notified', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${S.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: `1px solid rgba(216,171,105,0.08)` }}>
                  <td style={{ padding: '10px 12px', color: S.cream }}>{lead.email}</td>
                  <td style={{ padding: '10px 12px', color: S.muted }}>{lead.profile}</td>
                  <td style={{ padding: '10px 12px', color: lead.notifyState ? '#5ECFA6' : S.muted }}>{lead.notifyState ?? '—'}</td>
                  <td style={{ padding: '10px 12px', color: lead.notified ? '#5ECFA6' : S.muted }}>{lead.notified ? '✓' : '—'}</td>
                  <td style={{ padding: '10px 12px', color: S.muted }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
