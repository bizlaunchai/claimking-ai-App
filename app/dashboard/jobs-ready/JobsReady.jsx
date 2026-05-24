'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './jobs-ready.css';

/* =========================================================================
   CONSTANTS
   ========================================================================= */
const REVIEW_LINK = 'https://www.roofgutternow.com/review-us';

const DEFAULT_CHECKLIST = [
    { label: 'Called client ahead of arrival', required: true },
    { label: 'Took before photos of work area', required: true },
    { label: 'Verified scope of work matches site', required: true },
    { label: 'Completed the work per scope', required: true },
    { label: 'Cleaned up site & magnet swept for nails', required: true },
    { label: 'Took after photos of completed work', required: true },
];

const JOB_TYPES = [
    'Full Roof Replacement', 'Roof Repair', 'Gutter Replacement',
    'Gutter Repair', 'Siding', 'Inspection', 'Other',
];

let jobSeq = 1;
const uid = (prefix) => prefix + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);

/* =========================================================================
   SEED DATA
   ========================================================================= */
function buildJob(data) {
    const checklist = DEFAULT_CHECKLIST.map((c) => ({
        id: uid('chk'), label: c.label, required: c.required, done: data.status === 'completed',
    }));
    return {
        id: 'JOB-' + String(jobSeq++).padStart(4, '0'),
        address: data.address || '',
        jobType: data.jobType || '',
        scope: data.scope || '',
        notes: data.notes || '',
        jobCost: data.jobCost || 0,
        pay: data.pay || 0,
        materials: data.materials || [],
        salesRepId: data.salesRepId || null,
        status: data.status || 'available',
        visibility: data.visibility || 'hidden',
        ourPhotos: data.ourPhotos || [],
        sitePhotos: data.sitePhotos || { before: [], during: [], after: [] },
        checklist,
        callAhead: {
            done: data.status === 'completed',
            at: data.status === 'completed' ? Date.now() - 3 * 86400000 : null,
        },
        claimedBy: data.claimedBy || null,
        claimedByName: data.claimedByName || null,
        claimedAt: data.claimedBy ? Date.now() : null,
        completedAt: data.completedAt || null,
        lastNotifiedAt: null,
        notifyCount: 0,
        createdAt: Date.now(),
    };
}

const SEED_REPS = [
    { id: 'rep_01', name: 'Tyler Brooks', phone: '(330) 555-0301', email: 'tyler@roofgutternow.com' },
    { id: 'rep_02', name: 'Morgan Lee', phone: '(330) 555-0302', email: 'morgan@roofgutternow.com' },
    { id: 'rep_03', name: 'Jordan Pierce', phone: '(330) 555-0303', email: 'jordan@roofgutternow.com' },
    { id: 'rep_04', name: 'Casey Nguyen', phone: '(234) 555-0304', email: 'casey@roofgutternow.com' },
];

const SEED_SUBS = [
    { id: 'sub_01', name: "Joe's Roofing Crew", contact: 'Joe Dalton', phone: '(330) 555-0142', email: 'joe@joesroofing.com', initials: 'JR', active: true },
    { id: 'sub_02', name: 'Apex Exteriors', contact: 'Maria Lopez', phone: '(330) 555-0188', email: 'maria@apexext.com', initials: 'AE', active: true },
    { id: 'sub_03', name: 'Buckeye Roof Pros', contact: 'Dale Witmer', phone: '(234) 555-0119', email: 'dale@buckeyeroofpros.com', initials: 'BR', active: true },
    { id: 'sub_04', name: 'Summit Gutter Co.', contact: 'Tony Reyes', phone: '(330) 555-0204', email: 'tony@summitgutter.com', initials: 'SG', active: true },
];

function seedJobs() {
    jobSeq = 1;
    const seed = [
        {
            address: '482 Oakwood Dr, Doylestown, OH 44230',
            jobType: 'Full Roof Replacement',
            scope: 'Tear off 1 layer architectural shingles, install synthetic underlayment, ice & water shield on eaves/valleys, 30yr architectural shingles. Replace pipe boots and install ridge vent.',
            notes: 'Gate code 1424. Dog in backyard — keep gate closed. Dumpster placed in driveway.',
            jobCost: 9200, pay: 3800, salesRepId: 'rep_01', status: 'available', visibility: 'published',
            materials: [
                { id: 'm1', label: 'Architectural shingles (28 sq)', cost: 1820 },
                { id: 'm2', label: 'Synthetic underlayment + ice & water', cost: 410 },
                { id: 'm3', label: 'Ridge vent, boots, nails, misc', cost: 285 },
                { id: 'm4', label: 'Dumpster rental', cost: 375 },
            ],
        },
        {
            address: '17 Birchwood Ln, Wadsworth, OH 44281',
            jobType: 'Gutter Replacement',
            scope: 'Remove and replace 180 LF of 5" K-style aluminum gutters and downspouts. Reattach 3 downspout extensions.',
            notes: 'Steep front pitch — bring extra fall protection. Park on street, not driveway.',
            jobCost: 3100, pay: 1450, salesRepId: 'rep_02', status: 'available', visibility: 'hidden',
            materials: [
                { id: 'm1', label: 'Aluminum gutter coil + downspouts', cost: 540 },
                { id: 'm2', label: 'Hangers, sealant, fasteners', cost: 95 },
            ],
        },
        {
            address: '903 Maple Ridge Rd, Medina, OH 44256',
            jobType: 'Roof Repair',
            scope: 'Repair wind damage on north slope — approx 2 squares. Replace damaged decking (est. 2 sheets), match existing shingles.',
            notes: 'Homeowner works from home, knock before starting power tools.',
            jobCost: 2400, pay: 950, salesRepId: 'rep_01', status: 'in_progress', visibility: 'published', claimedBy: 'sub_01', claimedByName: "Joe's Roofing Crew",
        },
        {
            address: '226 Sunset Blvd, Akron, OH 44302',
            jobType: 'Full Roof Replacement',
            scope: 'Tear off, re-deck as needed, install full system with 50yr shingles. Two-story, walkable pitch.',
            notes: 'Materials delivered and staged in garage.',
            jobCost: 12800, pay: 5200, salesRepId: 'rep_03', status: 'completed', visibility: 'published', claimedBy: 'sub_02', claimedByName: 'Apex Exteriors', completedAt: Date.now() - 3 * 86400000,
            materials: [
                { id: 'm1', label: '50yr shingles (34 sq)', cost: 2720 },
                { id: 'm2', label: 'Decking replacement (6 sheets)', cost: 312 },
                { id: 'm3', label: 'Underlayment, flashing, vents', cost: 540 },
                { id: 'm4', label: 'Permit + dumpster', cost: 620 },
            ],
        },
        {
            address: '54 Cherry St, Barberton, OH 44203',
            jobType: 'Roof Repair',
            scope: 'Replace ~30 wind-lifted shingles, reseal flashing around chimney.',
            notes: 'Ladder access on east side only.',
            jobCost: 2900, pay: 1200, salesRepId: 'rep_02', status: 'completed', visibility: 'published', claimedBy: 'sub_01', claimedByName: "Joe's Roofing Crew", completedAt: Date.now() - 8 * 86400000,
        },
    ];
    return seed.map(buildJob);
}

/* =========================================================================
   HELPERS
   ========================================================================= */
const money = (n) => '$' + (n || 0).toLocaleString();
const materialsTotal = (j) => (j.materials || []).reduce((s, m) => s + (Number(m.cost) || 0), 0);
const jobProfit = (j) => (j.jobCost || 0) - (j.pay || 0) - materialsTotal(j);
const statusLabel = (s) => ({ available: 'Available', claimed: 'Claimed', in_progress: 'In Progress', completed: 'Completed' }[s] || s);

function StatusPill({ status }) {
    const map = {
        available: ['pill-available', 'Available'],
        claimed: ['pill-claimed', 'Claimed'],
        in_progress: ['pill-progress', 'In Progress'],
        completed: ['pill-completed', 'Completed'],
    };
    const [cls, label] = map[status] || map.available;
    return <span className={`job-status-pill ${cls}`}>{label}</span>;
}

function notifyMessage(jobList, repName) {
    if (jobList.length === 1) {
        const j = jobList[0];
        const repLine = j.salesRepId && repName(j.salesRepId) !== 'Unassigned'
            ? `\n\nQuestions? Contact ${repName(j.salesRepId)}.` : '';
        return `New job available: ${j.jobType} at ${j.address} — ${money(j.pay)}.${repLine}\n\nFirst to claim gets it. Log in to claim:\nwww.roofgutternow.com/jobs`;
    }
    const intro = `${jobList.length} new jobs are available:\n` + jobList.map((j) => `• ${j.jobType} — ${j.address} (${money(j.pay)})`).join('\n');
    return `${intro}\n\nFirst to claim gets it. Log in to claim:\nwww.roofgutternow.com/jobs`;
}

/* =========================================================================
   MATERIALS EDITOR (shared between create + detail)
   ========================================================================= */
function MaterialsEditor({ materials, jobCost, pay, onChange }) {
    const [newLabel, setNewLabel] = useState('');
    const [newCost, setNewCost] = useState('');
    const mat = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
    const profit = (jobCost || 0) - (pay || 0) - mat;

    const update = (id, field, value) => {
        onChange(materials.map((m) => m.id === id ? { ...m, [field]: field === 'cost' ? (parseFloat(value) || 0) : value } : m));
    };
    const remove = (id) => onChange(materials.filter((m) => m.id !== id));
    const add = () => {
        const label = newLabel.trim();
        const cost = parseFloat(newCost) || 0;
        if (!label && !cost) return;
        onChange([...materials, { id: uid('mat'), label: label || 'Expense', cost }]);
        setNewLabel(''); setNewCost('');
    };

    return (
        <>
            <div className="mat-list">
                {materials.length ? materials.map((m) => (
                    <div className="mat-row" key={m.id}>
                        <input className="mat-label" type="text" value={m.label} placeholder="Material / expense"
                            onChange={(e) => update(m.id, 'label', e.target.value)} />
                        <div className="mat-cost-wrap">
                            <span className="mat-dollar">$</span>
                            <input className="mat-cost" type="number" min="0" step="1" value={Number(m.cost) || 0}
                                onChange={(e) => update(m.id, 'cost', e.target.value)} />
                        </div>
                        <button className="mat-remove" title="Remove" onClick={() => remove(m.id)}>&times;</button>
                    </div>
                )) : <div className="hint" style={{ padding: '0.25rem 0' }}>No material line items yet.</div>}
            </div>
            <div className="mat-add">
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} type="text" placeholder="e.g. Shingles (28 sq)" id="newMatLabel" />
                <div className="mat-cost-wrap">
                    <span className="mat-dollar">$</span>
                    <input value={newCost} onChange={(e) => setNewCost(e.target.value)} type="number" min="0" step="1" placeholder="0" id="newMatCost" />
                </div>
                <button className="btn btn-ghost" onClick={add}>Add</button>
            </div>
            <div className="profit-summary">
                <div className="ps-line"><span>Job cost</span><span>{money(jobCost)}</span></div>
                <div className="ps-line"><span>− Sub payout</span><span>−{money(pay)}</span></div>
                <div className="ps-line"><span>− Materials &amp; expenses</span><span>−{money(mat)}</span></div>
                <div className="ps-line ps-total"><span>Profit</span><span style={{ color: profit < 0 ? '#dc2626' : '#16a34a' }}>{money(profit)}</span></div>
            </div>
        </>
    );
}

/* =========================================================================
   PHOTO UPLOAD ZONE
   ========================================================================= */
function PhotoUploadZone({ photos, onChange }) {
    const inputRef = useRef(null);
    const addFiles = (files) => {
        const arr = Array.from(files);
        let loaded = [];
        let pending = arr.length;
        if (!pending) return;
        arr.forEach((f) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                loaded.push(e.target.result);
                pending--;
                if (pending <= 0) onChange([...photos, ...loaded]);
            };
            reader.readAsDataURL(f);
        });
    };
    return (
        <>
            <div className="upload-zone"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}>
                <div className="uz-title">Click or drop photos here</div>
                <div className="uz-sub">Damage photos, drone shots, measurement diagrams — JPG/PNG</div>
                <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={(e) => addFiles(e.target.files)} />
            </div>
            {photos.length > 0 && (
                <div className="thumb-row">
                    {photos.map((p, i) => (
                        <div className="thumb" key={i} style={{ backgroundImage: `url('${p}')` }}>
                            <button className="x" onClick={() => onChange(photos.filter((_, idx) => idx !== i))}>&times;</button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

/* =========================================================================
   MODAL SHELL
   ========================================================================= */
function Modal({ children, onClose }) {
    return (
        <div className="modal open">
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content">{children}</div>
        </div>
    );
}

/* =========================================================================
   CREATE JOB MODAL
   ========================================================================= */
function CreateJobModal({ reps, subs, onClose, onSave, toast }) {
    const [form, setForm] = useState({
        address: '', jobType: JOB_TYPES[0], jobCost: '', pay: '',
        salesRepId: '', visibility: 'hidden', assignId: '', scope: '', notes: '',
    });
    const [materials, setMaterials] = useState([]);
    const [ourPhotos, setOurPhotos] = useState([]);
    const [customItems, setCustomItems] = useState([]);
    const [customInput, setCustomInput] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const save = () => {
        const jobCost = parseInt(form.jobCost, 10) || 0;
        const pay = parseInt(form.pay, 10) || 0;
        if (!form.address.trim() || !form.scope.trim() || !pay || !jobCost) {
            toast('Address, scope, job cost, and sub payout are required.');
            return;
        }
        onSave({ ...form, jobCost, pay, materials, ourPhotos, customItems });
    };

    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>Add Job to Board</h2><div className="sub">Save as a hidden draft, publish to subs, or assign to a crew (no client info is shared)</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="form-section">
                    <h3>Job Details</h3>
                    <div className="form-grid">
                        <div className="field full">
                            <label>Property Address <span className="req">*</span></label>
                            <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, City, State ZIP" />
                            <span className="hint">Subs see the address only — never the client's name or contact info.</span>
                        </div>
                        <div className="field">
                            <label>Job Type</label>
                            <select value={form.jobType} onChange={(e) => set('jobType', e.target.value)}>
                                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Job Cost ($) <span className="req">*</span></label>
                            <input type="number" value={form.jobCost} onChange={(e) => set('jobCost', e.target.value)} placeholder="0" min="0" step="50" />
                            <span className="hint">What we bill / collect for the job (internal — never shown to subs).</span>
                        </div>
                        <div className="field">
                            <label>Sub Payout ($) <span className="req">*</span></label>
                            <input type="number" value={form.pay} onChange={(e) => set('pay', e.target.value)} placeholder="0" min="0" step="50" />
                        </div>
                        <div className="field">
                            <label>Sales Rep</label>
                            <select value={form.salesRepId} onChange={(e) => set('salesRepId', e.target.value)}>
                                <option value="">Unassigned</option>
                                {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Visibility</label>
                            <select value={form.visibility} onChange={(e) => set('visibility', e.target.value)}>
                                <option value="hidden">Hidden (draft — only our team)</option>
                                <option value="published">Visible to subs</option>
                            </select>
                            <span className="hint">Start hidden and publish when ready, or make it visible now.</span>
                        </div>
                        <div className="field">
                            <label>Assign to Crew</label>
                            <select value={form.assignId} onChange={(e) => set('assignId', e.target.value)}>
                                <option value="">Open to all subs</option>
                                {subs.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <span className="hint">Assigning hands it to one crew and makes it visible to them.</span>
                        </div>
                        <div className="field full">
                            <label>Scope of Work <span className="req">*</span></label>
                            <textarea value={form.scope} onChange={(e) => set('scope', e.target.value)} placeholder="Describe exactly what the sub needs to do..." />
                        </div>
                        <div className="field full">
                            <label>Site Notes</label>
                            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Gate codes, parking, pets, material staging, hazards..." />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Our Photos <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#9ca3af', textTransform: 'none' }}>(from the claim file — shared with sub)</span></h3>
                    <PhotoUploadZone photos={ourPhotos} onChange={setOurPhotos} />
                </div>

                <div className="form-section">
                    <h3>Materials &amp; Expenses <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#9ca3af', textTransform: 'none' }}>(internal — used to calculate profit, never shown to subs)</span></h3>
                    <MaterialsEditor materials={materials} jobCost={parseFloat(form.jobCost) || 0} pay={parseFloat(form.pay) || 0} onChange={setMaterials} />
                </div>

                <div className="form-section">
                    <h3>Checklist</h3>
                    <p className="hint" style={{ marginBottom: '0.6rem' }}>Every job includes the standard required checklist below. Add custom items specific to this job if needed.</p>
                    <div className="checklist">
                        {DEFAULT_CHECKLIST.map((c, i) => (
                            <div className="check-item" key={i}>
                                <div className="check-box"></div>
                                <span className="check-label">{c.label}</span>
                                {c.required && <span className="check-required">Required</span>}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Add a custom checklist item..."
                            style={{ flex: 1, padding: '0.6rem 0.85rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.85rem' }} />
                        <button className="btn btn-ghost" onClick={() => { if (customInput.trim()) { setCustomItems([...customItems, { label: customInput.trim(), required: false }]); setCustomInput(''); } }}>Add</button>
                    </div>
                    <div className="checklist" style={{ marginTop: '0.6rem' }}>
                        {customItems.map((c, i) => (
                            <div className="check-item" key={i}>
                                <div className="check-box"></div>
                                <span className="check-label">{c.label}</span>
                                <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '0.2rem 0.6rem' }} onClick={() => setCustomItems(customItems.filter((_, idx) => idx !== i))}>Remove</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save Job</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   ADMIN JOB DETAIL MODAL
   ========================================================================= */
function AdminJobModal({ job, reps, subs, repName, onClose, onSaveDetails, onUpdate, onDelete, onToggleVisibility, onAssign, onNotify }) {
    const [edit, setEdit] = useState({
        address: job.address, jobType: job.jobType, salesRepId: job.salesRepId || '',
        jobCost: job.jobCost || 0, pay: job.pay || 0, scope: job.scope, notes: job.notes,
    });
    const setE = (k, v) => setEdit((s) => ({ ...s, [k]: v }));
    const rep = reps.find((r) => r.id === job.salesRepId);
    const isDone = job.status === 'completed';

    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>{job.id} — {job.jobType}</h2><div className="sub">{job.address}</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
                    <div className="detail-item"><div className="dl">Status</div><div className="dv"><StatusPill status={job.status} /></div></div>
                    <div className="detail-item"><div className="dl">Visibility</div><div className="dv">{job.visibility === 'published' ? <span style={{ color: '#16a34a' }}>● Visible to subs</span> : <span style={{ color: '#9ca3af' }}>● Hidden (draft)</span>}</div></div>
                    <div className="detail-item"><div className="dl">Job Cost</div><div className="dv">{money(job.jobCost)}</div></div>
                    <div className="detail-item"><div className="dl">Sub Payout</div><div className="dv">{money(job.pay)}</div></div>
                    <div className="detail-item"><div className="dl">Materials</div><div className="dv">{money(materialsTotal(job))}</div></div>
                    <div className="detail-item"><div className="dl">Profit</div><div className="dv" style={{ color: jobProfit(job) < 0 ? '#dc2626' : '#16a34a', fontWeight: 800 }}>{money(jobProfit(job))}</div></div>
                    <div className="detail-item"><div className="dl">Sales Rep</div><div className="dv">{repName(job.salesRepId)}</div></div>
                    <div className="detail-item"><div className="dl">Assigned Crew</div><div className="dv">{job.claimedByName || '—'}</div></div>
                </div>

                {!isDone && (
                    <div className="form-section">
                        <h3>Edit Job Details</h3>
                        <div className="form-grid">
                            <div className="field full"><label>Property Address</label><input type="text" value={edit.address} onChange={(e) => setE('address', e.target.value)} /></div>
                            <div className="field">
                                <label>Job Type</label>
                                <select value={edit.jobType} onChange={(e) => setE('jobType', e.target.value)}>
                                    {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Sales Rep</label>
                                <select value={edit.salesRepId} onChange={(e) => setE('salesRepId', e.target.value)}>
                                    <option value="">Unassigned</option>
                                    {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="field"><label>Job Cost ($)</label><input type="number" min="0" step="50" value={edit.jobCost} onChange={(e) => setE('jobCost', e.target.value)} /></div>
                            <div className="field"><label>Sub Payout ($)</label><input type="number" min="0" step="50" value={edit.pay} onChange={(e) => setE('pay', e.target.value)} /></div>
                            <div className="field full"><label>Scope of Work</label><textarea value={edit.scope} onChange={(e) => setE('scope', e.target.value)} /></div>
                            <div className="field full"><label>Site Notes</label><textarea value={edit.notes} onChange={(e) => setE('notes', e.target.value)} /></div>
                        </div>
                        <button className="btn btn-primary" onClick={() => onSaveDetails(job.id, {
                            address: edit.address.trim(), jobType: edit.jobType, salesRepId: edit.salesRepId || null,
                            jobCost: parseInt(edit.jobCost, 10) || 0, pay: parseInt(edit.pay, 10) || 0,
                            scope: edit.scope.trim(), notes: edit.notes,
                        })}>Save Changes</button>
                    </div>
                )}

                {!isDone && (
                    <div className="form-section">
                        <h3>Visibility &amp; Assignment</h3>
                        <div className="assign-controls">
                            <div className="assign-toggle-row">
                                <div>
                                    <div className="assign-toggle-label">Show to subcontractors</div>
                                    <div className="assign-toggle-hint">{job.visibility === 'published' ? 'Subs can see and claim this job.' : 'Hidden — only your team can see this job.'}</div>
                                </div>
                                <button className={`vis-switch ${job.visibility === 'published' ? 'on' : ''}`} onClick={() => onToggleVisibility(job.id)} aria-label="Toggle visibility">
                                    <span className="vis-knob"></span>
                                </button>
                            </div>
                            <div className="assign-crew-row">
                                <label className="assign-toggle-label">Assign directly to a crew</label>
                                <select value={job.claimedBy || ''} onChange={(e) => onAssign(job.id, e.target.value)}>
                                    <option value="">— Open to all subs —</option>
                                    {subs.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="assign-toggle-hint">Assigning hands the job to one crew and makes it visible to them.</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-section">
                    <h3>Materials &amp; Expenses <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#9ca3af', textTransform: 'none' }}>(internal — never shown to subs)</span></h3>
                    <MaterialsEditor materials={job.materials || []} jobCost={job.jobCost} pay={job.pay} onChange={(mats) => onUpdate(job.id, { materials: mats })} />
                </div>

                {rep && (
                    <div className="form-section"><h3>Sales Rep Contact</h3>
                        <div className="rep-contact">
                            <div className="rep-contact-name">{rep.name}</div>
                            <div className="rep-contact-row">📞 <a href={`tel:${rep.phone}`}>{rep.phone}</a> &nbsp;·&nbsp; ✉️ <a href={`mailto:${rep.email}`}>{rep.email}</a></div>
                        </div>
                    </div>
                )}

                {isDone && (
                    <>
                        <div className="form-section"><h3>Scope of Work</h3><p style={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'pre-wrap' }}>{job.scope}</p></div>
                        {job.notes && <div className="form-section"><h3>Site Notes</h3><p style={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'pre-wrap' }}>{job.notes}</p></div>}
                    </>
                )}

                <div className="form-section"><h3>Our Photos ({job.ourPhotos.length})</h3>
                    {job.ourPhotos.length ? (
                        <div className="photo-gallery">{job.ourPhotos.map((p, i) => <div className="g" key={i} style={{ backgroundImage: `url('${p}')` }}></div>)}</div>
                    ) : <div className="hint">No photos attached</div>}
                </div>

                <div className="form-section"><h3>Call Ahead</h3>
                    <div className={`callahead-row ${job.callAhead.done ? 'done' : ''}`}>
                        <div className="check-box" style={job.callAhead.done ? { background: '#16a34a', borderColor: '#16a34a' } : undefined}>{job.callAhead.done ? '✓' : ''}</div>
                        <span style={{ fontSize: '0.85rem' }}>{job.callAhead.done ? 'Sub logged call-ahead' : 'Not yet logged by sub'}</span>
                    </div>
                </div>

                <div className="form-section"><h3>Checklist Progress</h3>
                    <div className="checklist">
                        {job.checklist.map((c) => (
                            <div className={`check-item ${c.done ? 'done' : ''}`} key={c.id}>
                                <div className="check-box">{c.done ? '✓' : ''}</div>
                                <span className="check-label">{c.label}</span>
                                {c.required && <span className="check-required">Required</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-section"><h3>Sub Site Photos</h3>
                    {['before', 'during', 'after'].map((phase) => {
                        const arr = job.sitePhotos[phase] || [];
                        return (
                            <div style={{ marginBottom: '0.75rem' }} key={phase}>
                                <div className="dl" style={{ marginBottom: '0.3rem' }}>{phase} photos ({arr.length})</div>
                                {arr.length ? <div className="photo-gallery">{arr.map((p, i) => <div className="g" key={i} style={{ backgroundImage: `url('${p}')` }}></div>)}</div> : <div className="hint">None uploaded yet</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="modal-foot">
                {!isDone && <button className="btn btn-ghost" onClick={() => onDelete(job.id)}>Delete Job</button>}
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
                {job.status === 'available' && job.visibility === 'published' && !job.claimedBy && (
                    <button className="btn btn-primary" onClick={() => onNotify(job.id)}>📣 Notify Subs</button>
                )}
            </div>
        </Modal>
    );
}

/* =========================================================================
   NOTIFY (single job) MODAL
   ========================================================================= */
function NotifyJobModal({ job, subs, repName, onClose, onSend }) {
    const msg = notifyMessage([job], repName);
    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>Notify Subs — Job Available</h2><div className="sub">{job.address}</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="form-section">
                    <h3>Recipients ({subs.length})</h3>
                    <p className="hint">This text/notification goes to every active subcontractor at once.</p>
                    <div className="recipient-chips">{subs.map((s) => <span className="recipient-chip" key={s.id}>{s.name}</span>)}</div>
                </div>
                <div className="form-section">
                    <h3>Message Preview</h3>
                    <div className="msg-preview">{msg}</div>
                </div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={() => onSend([job.id])}>Send to {subs.length} Subs</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   NOTIFY ALL MODAL
   ========================================================================= */
function NotifyAllModal({ available, subs, repName, onClose, onSend }) {
    const [selection, setSelection] = useState(new Set(available.map((j) => j.id)));
    const chosen = available.filter((j) => selection.has(j.id));
    const toggle = (id) => {
        const next = new Set(selection);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelection(next);
    };
    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>Notify Subs of Available Jobs</h2><div className="sub">Broadcast to all {subs.length} active subcontractors</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="form-section">
                    <h3>Select Jobs ({available.length})</h3>
                    <div className="notify-job-list">
                        {available.map((j) => (
                            <div className={`notify-job ${selection.has(j.id) ? 'sel' : ''}`} key={j.id} onClick={() => toggle(j.id)}>
                                <div className="nj-check">{selection.has(j.id) ? '✓' : ''}</div>
                                <div><div className="nj-addr">{j.address}</div><div className="nj-meta">{j.jobType}</div></div>
                                <div className="nj-pay">{money(j.pay)}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="form-section">
                    <h3>Recipients ({subs.length})</h3>
                    <div className="recipient-chips">{subs.map((s) => <span className="recipient-chip" key={s.id}>{s.name}</span>)}</div>
                </div>
                <div className="form-section">
                    <h3>Message Preview</h3>
                    <div className="msg-preview">{chosen.length ? notifyMessage(chosen, repName) : '(Select at least one job)'}</div>
                </div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" disabled={!chosen.length} onClick={() => onSend([...selection])}>Send Broadcast</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   SUB DETAIL MODAL
   ========================================================================= */
function SubDetailModal({ sub, jobs, onClose, onMessage }) {
    const subJobs = jobs.filter((j) => j.claimedBy === sub.id);
    const active = subJobs.filter((j) => j.status !== 'completed');
    const done = subJobs.filter((j) => j.status === 'completed');
    const earned = done.reduce((s, j) => s + j.pay, 0);
    const pending = active.reduce((s, j) => s + j.pay, 0);

    const rows = (arr) => arr.length ? arr.map((j) => (
        <div className="notify-job" style={{ cursor: 'default' }} key={j.id}>
            <div><div className="nj-addr">{j.address}</div><div className="nj-meta">{j.jobType} · {statusLabel(j.status)}</div></div>
            <div className="nj-pay">{money(j.pay)}</div>
        </div>
    )) : <div className="hint">None</div>;

    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>{sub.name}</h2><div className="sub">{sub.contact} · {sub.phone} · {sub.email}</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
                    <div className="detail-item"><div className="dl">Active Jobs</div><div className="dv">{active.length}</div></div>
                    <div className="detail-item"><div className="dl">Completed</div><div className="dv">{done.length}</div></div>
                    <div className="detail-item"><div className="dl">Earned (paid)</div><div className="dv" style={{ color: '#16a34a' }}>{money(earned)}</div></div>
                    <div className="detail-item"><div className="dl">Pending Payout</div><div className="dv">{money(pending)}</div></div>
                </div>
                <div className="form-section"><h3>Active Jobs</h3><div className="notify-job-list">{rows(active)}</div></div>
                <div className="form-section"><h3>Completed (Payment History)</h3><div className="notify-job-list">{rows(done)}</div></div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={() => onMessage(sub.id)}>Message {sub.name}</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   ADD SUB MODAL
   ========================================================================= */
function AddSubModal({ onClose, onSave, toast }) {
    const [f, setF] = useState({ name: '', contact: '', phone: '', email: '' });
    const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
    const save = () => {
        if (!f.name.trim() || !f.phone.trim()) { toast('Name and phone are required.'); return; }
        onSave(f);
    };
    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>Add Subcontractor</h2><div className="sub">They'll get a login to claim jobs from the board</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="form-grid">
                    <div className="field full"><label>Company / Crew Name <span className="req">*</span></label><input type="text" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Apex Exteriors" /></div>
                    <div className="field"><label>Contact Name</label><input type="text" value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Full name" /></div>
                    <div className="field"><label>Phone <span className="req">*</span></label><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(330) 555-0100" /></div>
                    <div className="field full"><label>Email</label><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="crew@email.com" /></div>
                </div>
                <div className="hint" style={{ marginTop: '0.75rem' }}>An invite link is sent so they can set a password and access the jobs board.</div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Add &amp; Send Invite</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */
export default function JobsReady() {
    const [jobs, setJobs] = useState(() => seedJobs());
    const [subs, setSubs] = useState(SEED_SUBS);
    const [reps] = useState(SEED_REPS);

    const [view, setView] = useState('board');
    const [adminFilter, setAdminFilter] = useState('all');
    const [repFilter, setRepFilter] = useState('all');
    const [layout, setLayout] = useState('grid');

    const [modal, setModal] = useState(null); // { type, id }
    const [toastMsg, setToastMsg] = useState(null);
    const toastTimer = useRef(null);

    const toast = (msg, ms) => {
        setToastMsg(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(null), ms || 3200);
    };
    useEffect(() => () => clearTimeout(toastTimer.current), []);

    const getRep = (id) => reps.find((r) => r.id === id) || null;
    const repName = (id) => { const r = getRep(id); return r ? r.name : 'Unassigned'; };
    const getJob = (id) => jobs.find((j) => j.id === id);
    const activeSubs = () => subs.filter((s) => s.active);
    const patchJob = (id, patch) => setJobs((js) => js.map((j) => j.id === id ? { ...j, ...patch } : j));

    /* ---- Board derived ---- */
    const filtered = useMemo(() => {
        let list = jobs.slice();
        if (adminFilter !== 'all') list = list.filter((j) => j.status === adminFilter);
        if (repFilter !== 'all') list = list.filter((j) => repFilter === '__none__' ? !j.salesRepId : j.salesRepId === repFilter);
        return list;
    }, [jobs, adminFilter, repFilter]);

    const hasUnassigned = jobs.some((j) => !j.salesRepId);
    const openPayout = jobs.filter((j) => j.status !== 'completed').reduce((s, j) => s + j.pay, 0);

    /* ---- Actions ---- */
    const toggleVisibility = (id) => {
        const j = getJob(id); if (!j) return;
        const nv = j.visibility === 'published' ? 'hidden' : 'published';
        patchJob(id, { visibility: nv });
        toast(nv === 'published' ? 'Job is now visible to subs.' : 'Job hidden from subs.');
    };

    const assignToCrew = (id, subId) => {
        const j = getJob(id); if (!j) return;
        const s = subs.find((x) => x.id === subId);
        if (!subId || !s) {
            patchJob(id, { claimedBy: null, claimedByName: null, claimedAt: null, status: j.status === 'claimed' ? 'available' : j.status });
            toast('Job unassigned — back in the open pool.');
        } else {
            patchJob(id, {
                claimedBy: s.id, claimedByName: s.name, claimedAt: Date.now(),
                status: j.status === 'available' ? 'claimed' : j.status,
                visibility: j.visibility !== 'published' ? 'published' : j.visibility,
            });
            toast(`Assigned to ${s.name}.`);
        }
    };

    const saveJobDetails = (id, patch) => {
        if (!patch.address || !patch.scope) { toast('Address and scope are required.'); return; }
        patchJob(id, patch);
        toast('Job details saved.');
    };

    const deleteJob = (id) => {
        setJobs((js) => js.filter((j) => j.id !== id));
        setModal(null);
        toast('Job removed.');
    };

    const saveNewJob = (data) => {
        const job = buildJob({
            address: data.address.trim(), jobType: data.jobType, scope: data.scope.trim(), notes: data.notes,
            jobCost: data.jobCost, pay: data.pay, salesRepId: data.salesRepId || null,
            materials: data.materials.map((m) => ({ id: m.id, label: m.label, cost: Number(m.cost) || 0 })),
            status: 'available', visibility: data.visibility, ourPhotos: data.ourPhotos.slice(),
        });
        const assignSub = subs.find((s) => s.id === data.assignId) || null;
        if (assignSub) {
            job.claimedBy = assignSub.id; job.claimedByName = assignSub.name;
            job.claimedAt = Date.now(); job.status = 'claimed'; job.visibility = 'published';
        }
        data.customItems.forEach((c) => job.checklist.push({ id: uid('chk'), label: c.label, required: c.required, done: false }));
        setJobs((js) => [job, ...js]);
        setModal(null);
        toast(assignSub ? `Job created and assigned to ${assignSub.name}.`
            : job.visibility === 'published' ? 'Job published — visible to subs.'
                : 'Job saved as hidden draft.');
    };

    const sendNotify = (ids) => {
        const n = activeSubs().length;
        const now = Date.now();
        setJobs((js) => js.map((j) => ids.includes(j.id) ? { ...j, lastNotifiedAt: now, notifyCount: n } : j));
        setModal(null);
        toast(`📣 Sent to ${n} subs — ${ids.length} job(s) broadcast as available.`, 4500);
    };

    const openNotifyJob = (id) => {
        const j = getJob(id); if (!j) return;
        if (j.status !== 'available' || j.claimedBy) { toast('Only unclaimed jobs can be broadcast.'); return; }
        if (j.visibility !== 'published') { toast('Publish this job to subs before broadcasting it.'); return; }
        setModal({ type: 'notifyJob', id });
    };

    const openNotifyAll = () => {
        const available = jobs.filter((j) => j.status === 'available' && j.visibility === 'published' && !j.claimedBy);
        if (!available.length) { toast('No published, unassigned jobs to broadcast right now.'); return; }
        setModal({ type: 'notifyAll' });
    };

    const saveNewSub = (f) => {
        const initials = f.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        setSubs((ss) => [...ss, { id: uid('sub'), name: f.name.trim(), contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim(), initials, active: true }]);
        setModal(null);
        toast(`${f.name.trim()} added and invite sent.`);
    };

    const messageSub = (subId) => {
        const s = subs.find((x) => x.id === subId); if (!s) return;
        toast(`Message sent to ${s.name} (${s.phone}).`);
    };

    /* ---- Subs derived ---- */
    const workingSet = new Set(jobs.filter((j) => j.status === 'in_progress' || j.status === 'claimed').map((j) => j.claimedBy));
    const inProgressCount = jobs.filter((j) => j.status === 'in_progress' || j.status === 'claimed').length;
    const totalPaid = jobs.filter((j) => j.status === 'completed').reduce((s, j) => s + j.pay, 0);

    /* ---- Render board card ---- */
    const renderCard = (j) => {
        const mat = materialsTotal(j);
        const profit = jobProfit(j);
        return (
            <div className={`job-card ${j.visibility === 'hidden' ? 'is-hidden' : ''}`} key={j.id}>
                <div className="job-thumb" style={j.ourPhotos[0] ? { backgroundImage: `url('${j.ourPhotos[0]}')` } : undefined}>
                    <StatusPill status={j.status} />
                    {j.visibility === 'hidden' && <span className="hidden-badge">🔒 Hidden</span>}
                    {j.ourPhotos.length ? <span className="job-photo-count">📷 {j.ourPhotos.length}</span> : <span className="placeholder">No photos attached</span>}
                </div>
                <div className="job-body">
                    <span className="job-id">{j.id}</span>
                    <div className="job-address">{j.address}</div>
                    <span className="job-type-tag">{j.jobType}</span>
                    <div className="job-scope">{j.scope}</div>
                    <div className="cost-row cost-row-4">
                        <div className="cost-cell"><div className="cost-val">{money(j.jobCost)}</div><div className="cost-label">Job cost</div></div>
                        <div className="cost-cell"><div className="cost-val">{money(j.pay)}</div><div className="cost-label">Sub pay</div></div>
                        <div className="cost-cell"><div className="cost-val">{money(mat)}</div><div className="cost-label">Materials</div></div>
                        <div className="cost-cell"><div className={`cost-val ${profit < 0 ? 'red' : 'green'}`}>{money(profit)}</div><div className="cost-label">Profit</div></div>
                    </div>
                    <div className="job-meta-row">
                        <span className="rep-chip">🧑‍💼 {repName(j.salesRepId)}</span>
                        {j.claimedByName ? <span className="job-claimed-by">👷 {j.claimedByName}</span> : <span className="job-claimed-by">Unassigned</span>}
                    </div>
                    {j.status === 'available' && j.lastNotifiedAt && (
                        <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.4rem' }}>✓ Notified {j.notifyCount} sub(s)</div>
                    )}
                </div>
                <div className="job-card-actions">
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal({ type: 'adminJob', id: j.id })}>View / Edit</button>
                    {j.status === 'available' && j.visibility === 'published' && !j.claimedBy ? (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openNotifyJob(j.id)}>📣 Notify Subs</button>
                    ) : (j.status === 'available' && j.visibility === 'hidden' ? (
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => toggleVisibility(j.id)}>Publish</button>
                    ) : null)}
                </div>
            </div>
        );
    };

    const renderRow = (j) => {
        const mat = materialsTotal(j);
        const profit = jobProfit(j);
        return (
            <div className={`job-row ${j.visibility === 'hidden' ? 'row-hidden' : ''}`} key={j.id}>
                <div className="jr-id">{j.id}</div>
                <div className="jr-addr" title={j.address}>{j.address}</div>
                <div><div className="jr-type">{j.jobType}</div><div className="jr-rep">🧑‍💼 {repName(j.salesRepId)}</div></div>
                <div className="jr-money muted"><span className="jr-cell-label">Job cost</span>{money(j.jobCost)}</div>
                <div className="jr-money muted"><span className="jr-cell-label">Sub pay</span>{money(j.pay)}</div>
                <div className="jr-money muted"><span className="jr-cell-label">Materials</span>{money(mat)}</div>
                <div className={`jr-money ${profit < 0 ? 'red' : 'green'}`}><span className="jr-cell-label">Profit</span>{money(profit)}</div>
                <div>
                    <span className="jr-cell-label">Status</span><StatusPill status={j.status} />{' '}
                    {j.visibility === 'published' ? <span className="vis-tag pub">Visible</span> : <span className="vis-tag hid">Hidden</span>}
                    {j.claimedByName && <div className="jr-rep">👷 {j.claimedByName}</div>}
                </div>
                <div className="jr-actions">
                    <button className={`jr-icon-btn ${j.visibility === 'published' ? 'on' : ''}`} title={j.visibility === 'published' ? 'Hide from subs' : 'Show to subs'} onClick={() => toggleVisibility(j.id)}>{j.visibility === 'published' ? '👁' : '🔒'}</button>
                    <button className="jr-icon-btn" title="View / Edit" onClick={() => setModal({ type: 'adminJob', id: j.id })}>✎</button>
                    {j.status === 'available' && j.visibility === 'published' && !j.claimedBy && (
                        <button className="jr-icon-btn notify" title="Notify Subs" onClick={() => openNotifyJob(j.id)}>📣</button>
                    )}
                </div>
            </div>
        );
    };

    const modalJob = modal && modal.id ? getJob(modal.id) : null;
    const modalSub = modal && modal.type === 'subDetail' ? subs.find((s) => s.id === modal.id) : null;
    const availableForBroadcast = jobs.filter((j) => j.status === 'available' && j.visibility === 'published' && !j.claimedBy);

    return (
        <div className="subjobs">
            {/* HEADER */}
            <div className="header-section">
                <div className="header-content">
                    <div className="header-left">
                        <div>
                            <div className="page-title">{view === 'board' ? 'Jobs Ready' : 'Subcontractors'}</div>
                            <div className="page-subtitle">{view === 'board' ? 'Publish and manage subcontractor jobs' : 'Your crews, their jobs and payouts'}</div>
                        </div>
                    </div>
                    <div className="view-switch">
                        <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Jobs Board</button>
                        <button className={view === 'subs' ? 'active' : ''} onClick={() => setView('subs')}>Subcontractors</button>
                    </div>
                </div>
            </div>

            {/* JOBS BOARD VIEW */}
            {view === 'board' && (
                <div className="content view active">
                    <div className="stats-row">
                        <div className="stat-card"><div className="stat-value">{jobs.length}</div><div className="stat-label">Total Jobs</div></div>
                        <div className="stat-card"><div className="stat-value">{jobs.filter((j) => j.status === 'available').length}</div><div className="stat-label">Available</div></div>
                        <div className="stat-card"><div className="stat-value">{jobs.filter((j) => j.status === 'claimed' || j.status === 'in_progress').length}</div><div className="stat-label">Claimed / In Progress</div></div>
                        <div className="stat-card"><div className="stat-value">{jobs.filter((j) => j.status === 'completed').length}</div><div className="stat-label">Completed</div></div>
                        <div className="stat-card"><div className="stat-value green">{money(openPayout)}</div><div className="stat-label">Open Payout</div></div>
                    </div>

                    <div className="toolbar">
                        <div className="section-title">Jobs Board</div>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="filter-tabs">
                                {[['all', 'All'], ['available', 'Available'], ['claimed', 'Claimed'], ['in_progress', 'In Progress'], ['completed', 'Completed']].map(([f, label]) => (
                                    <button key={f} className={`filter-tab ${adminFilter === f ? 'active' : ''}`} onClick={() => setAdminFilter(f)}>{label}</button>
                                ))}
                            </div>
                            <select className="rep-filter" value={repFilter} onChange={(e) => setRepFilter(e.target.value)} aria-label="Filter by sales rep">
                                <option value="all">All Sales Reps</option>
                                {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                {hasUnassigned && <option value="__none__">Unassigned</option>}
                            </select>
                            <div className="layout-toggle" role="group" aria-label="Layout">
                                <button className={`layout-btn ${layout === 'grid' ? 'active' : ''}`} onClick={() => setLayout('grid')} title="Grid view">▦</button>
                                <button className={`layout-btn ${layout === 'list' ? 'active' : ''}`} onClick={() => setLayout('list')} title="List view">☰</button>
                            </div>
                            <button className="btn btn-secondary" onClick={openNotifyAll}>📣 Notify Subs of Available Jobs</button>
                            <button className="btn btn-primary" onClick={() => setModal({ type: 'createJob' })}>+ Add Job</button>
                        </div>
                    </div>

                    {!filtered.length ? (
                        <div className="empty">No jobs match this filter.</div>
                    ) : layout === 'list' ? (
                        <div className="job-list">
                            <div className="job-list-head">
                                <div>Job</div><div>Address</div><div>Type / Rep</div>
                                <div style={{ textAlign: 'right' }}>Job Cost</div><div style={{ textAlign: 'right' }}>Sub Pay</div>
                                <div style={{ textAlign: 'right' }}>Materials</div><div style={{ textAlign: 'right' }}>Profit</div>
                                <div>Status / Crew</div><div style={{ textAlign: 'right' }}>Actions</div>
                            </div>
                            {filtered.map(renderRow)}
                        </div>
                    ) : (
                        <div className="job-grid">{filtered.map(renderCard)}</div>
                    )}
                </div>
            )}

            {/* SUBCONTRACTORS VIEW */}
            {view === 'subs' && (
                <div className="content view active">
                    <div className="stats-row">
                        <div className="stat-card"><div className="stat-value">{subs.filter((s) => s.active).length}</div><div className="stat-label">Active Subs</div></div>
                        <div className="stat-card"><div className="stat-value">{workingSet.size}</div><div className="stat-label">Currently Working</div></div>
                        <div className="stat-card"><div className="stat-value">{inProgressCount}</div><div className="stat-label">Jobs In Progress</div></div>
                        <div className="stat-card"><div className="stat-value green">{money(totalPaid)}</div><div className="stat-label">Total Paid Out</div></div>
                    </div>

                    <div className="toolbar">
                        <div className="section-title">Subcontractors</div>
                        <button className="btn btn-primary" onClick={() => setModal({ type: 'addSub' })}>+ Add Subcontractor</button>
                    </div>

                    {!subs.length ? (
                        <div className="empty">No subcontractors yet. Click "+ Add Subcontractor".</div>
                    ) : (
                        <div className="sub-roster">
                            {subs.map((s) => {
                                const subJobs = jobs.filter((j) => j.claimedBy === s.id);
                                const active = subJobs.filter((j) => j.status !== 'completed');
                                const done = subJobs.filter((j) => j.status === 'completed');
                                const earned = done.reduce((sum, j) => sum + j.pay, 0);
                                const isWorking = workingSet.has(s.id);
                                return (
                                    <div className="sub-card" key={s.id}>
                                        <div className="sub-card-head">
                                            <div className="sub-avatar-lg">{s.initials}</div>
                                            <div style={{ flex: 1 }}>
                                                <div className="sub-name">{s.name}</div>
                                                <div className="sub-contact">{s.contact} &middot; {s.phone}</div>
                                                <div className="sub-contact"><span className={`sub-status-dot ${isWorking ? 'dot-working' : 'dot-idle'}`}></span>{isWorking ? 'Currently working' : 'Idle'}</div>
                                            </div>
                                        </div>
                                        <div className="sub-metrics">
                                            <div className="sub-metric"><div className="m-val">{active.length}</div><div className="m-label">Active</div></div>
                                            <div className="sub-metric"><div className="m-val">{done.length}</div><div className="m-label">Completed</div></div>
                                            <div className="sub-metric"><div className="m-val green">{money(earned)}</div><div className="m-label">Paid</div></div>
                                        </div>
                                        <div className="sub-card-actions">
                                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal({ type: 'subDetail', id: s.id })}>View Jobs</button>
                                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => messageSub(s.id)}>Message</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            {modal?.type === 'createJob' && (
                <CreateJobModal reps={reps} subs={subs} onClose={() => setModal(null)} onSave={saveNewJob} toast={toast} />
            )}
            {modal?.type === 'adminJob' && modalJob && (
                <AdminJobModal job={modalJob} reps={reps} subs={subs} repName={repName}
                    onClose={() => setModal(null)}
                    onSaveDetails={saveJobDetails}
                    onUpdate={patchJob}
                    onDelete={deleteJob}
                    onToggleVisibility={toggleVisibility}
                    onAssign={assignToCrew}
                    onNotify={openNotifyJob} />
            )}
            {modal?.type === 'notifyJob' && modalJob && (
                <NotifyJobModal job={modalJob} subs={activeSubs()} repName={repName} onClose={() => setModal(null)} onSend={sendNotify} />
            )}
            {modal?.type === 'notifyAll' && (
                <NotifyAllModal available={availableForBroadcast} subs={activeSubs()} repName={repName} onClose={() => setModal(null)} onSend={sendNotify} />
            )}
            {modal?.type === 'subDetail' && modalSub && (
                <SubDetailModal sub={modalSub} jobs={jobs} onClose={() => setModal(null)} onMessage={messageSub} />
            )}
            {modal?.type === 'addSub' && (
                <AddSubModal onClose={() => setModal(null)} onSave={saveNewSub} toast={toast} />
            )}

            {/* TOAST */}
            <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
        </div>
    );
}
