import { useState } from 'react';
import { color, font, card, slugify, danger } from '../theme/tokens';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Field from '../components/Field';
import Checkbox from '../components/Checkbox';

/**
 * Category manager (FR 7.10–7.12). Every confirm shows the affected listing count first.
 *   categories [{ id, name, slug, parent, count }]
 *   onCreate({ name, slug, parent })   onUpdate(id, { name, slug })
 *   onDelete(id)  → listings move to fallbackName
 *   onMerge(sourceIds, targetId)
 *   embedded  drop the page header (when used as a tab inside ModerationScreen)
 */
export default function AdminCategoriesScreen({
  categories = [], fallbackName = 'Other', embedded = false,
  onCreate, onUpdate, onDelete, onMerge,
}) {
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [mergeMode, setMergeMode] = useState(false);
  const [sel, setSel] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [delId, setDelId] = useState(null);

  const selected = categories.filter((c) => sel.includes(c.id));
  const target = selected.find((c) => c.id === targetId) || selected[0];
  const moving = selected.filter((c) => c !== target);
  const affected = moving.reduce((a, c) => a + c.count, 0);
  const delCat = categories.find((c) => c.id === delId);
  const total = categories.reduce((a, c) => a + c.count, 0);

  const closeAll = () => { setForm(null); setMergeMode(false); setSel([]); setDelId(null); setEditId(null); };

  return (
    <div style={{ padding: embedded ? '16px 0 0' : '22px 24px 40px' }}>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <div style={{ padding: '3px 8px', borderRadius: 6, background: color.ink, color: color.white, font: `600 10px/1.5 ${font}`, letterSpacing: '.08em' }}>ADMIN</div>
          <div style={{ font: `700 22px/1.2 ${font}`, letterSpacing: '-.01em' }}>Category manager</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, font: `400 13px/1.6 ${font}`, color: color.muted }}>{categories.length} categories · {total} listings</div>
        <Button size="sm" variant="ghost" onClick={() => { const m = !mergeMode; closeAll(); setMergeMode(m); }}>{mergeMode ? 'Cancel merge' : 'Merge'}</Button>
        <Button size="sm" onClick={() => { closeAll(); setForm({ name: '', slug: '', parent: '' }); }}>+ New category</Button>
      </div>

      {form && (
        <div style={{ ...card, marginTop: 14, padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}><Field label="Name" value={form.name} placeholder="e.g. Musical instruments" onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} /></div>
          <div style={{ flex: '1 1 160px' }}><Field label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13 }} /></div>
          <div style={{ flex: '1 1 140px' }}>
            <Field label="Parent" as="select" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!form.name.trim()) return;
              onCreate && onCreate({ name: form.name.trim(), slug: form.slug || slugify(form.name), parent: form.parent || null });
              setForm(null);
            }}>Create</Button>
          </div>
        </div>
      )}

      {mergeMode && (
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: color.pinkTint, border: '1px solid ' + color.pinkLine }}>
          <div style={{ font: `600 13.5px/1.4 ${font}` }}>Merge categories · {selected.length} selected</div>
          {selected.length < 2 ? (
            <div style={{ font: `400 12.5px/1.6 ${font}`, color: color.muted, marginTop: 4 }}>Tick two or more categories below, then choose which one survives.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                <div style={{ font: `500 12.5px/1 ${font}`, color: color.body }}>Merge into</div>
                <select value={target.id} onChange={(e) => setTargetId(isNaN(+e.target.value) ? e.target.value : +e.target.value)} style={{
                  padding: '9px 12px', border: '1px solid ' + color.field, borderRadius: 9, font: `500 13px/1.3 ${font}`, background: color.white,
                }}>
                  {selected.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ font: `500 12.5px/1.6 ${font}`, color: color.body, marginTop: 10, textWrap: 'pretty' }}>
                Merging {moving.map((c) => c.name).join(', ')} into {target.name} reassigns {affected} listing{affected === 1 ? '' : 's'}. Old slugs redirect to /{target.slug}.
              </div>
              <Button size="sm" style={{ marginTop: 10 }} onClick={() => { onMerge && onMerge(moving.map((c) => c.id), target.id); closeAll(); }}>Confirm merge</Button>
            </>
          )}
        </div>
      )}

      {delCat && (
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: danger.bg, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, font: `500 13px/1.6 ${font}`, color: danger.fg }}>
            Delete “{delCat.name}”? {delCat.count} listing{delCat.count === 1 ? '' : 's'} will move to {fallbackName}.
          </div>
          <Button size="sm" variant="ghost" onClick={() => setDelId(null)}>Keep</Button>
          <Button size="sm" style={{ background: danger.fg, boxShadow: 'none' }} onClick={() => { onDelete && onDelete(delCat.id); setDelId(null); }}>Delete category</Button>
        </div>
      )}

      <div style={{ ...card, overflow: 'hidden', marginTop: 14 }}>
        {categories.map((c) => (
          <div key={c.id} style={{ borderBottom: '1px solid ' + color.lineSoft, background: sel.includes(c.id) ? color.pinkTint : color.white }}>
            {editId === c.id ? (
              <div style={{ display: 'flex', gap: 9, padding: '12px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 150px' }}><Field value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={{ padding: '9px 11px' }} /></div>
                <div style={{ flex: '1 1 140px' }}><Field value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} style={{ padding: '9px 11px', fontFamily: 'ui-monospace,monospace', fontSize: 12.5 }} /></div>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                <Button size="sm" onClick={() => {
                  if (!edit.name.trim()) return;
                  onUpdate && onUpdate(c.id, { name: edit.name.trim(), slug: edit.slug || slugify(edit.name) });
                  setEditId(null);
                }}>Save</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
                {mergeMode && <Checkbox checked={sel.includes(c.id)} onChange={() => setSel(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])} />}
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ font: `600 14px/1.3 ${font}` }}>{c.name}</div>
                  <div style={{ font: '500 11.5px/1.4 ui-monospace,monospace', color: color.faint, marginTop: 3 }}>
                    /{c.slug}{c.parent ? ' · parent ' + (categories.find((p) => p.id === c.parent)?.name || c.parent) : ''}
                  </div>
                </div>
                <div style={{ font: `600 13px/1 ${font}`, color: color.body, width: 90 }}>{c.count} listings</div>
                <StatusBadge status={c.count ? 'Active' : 'Empty'} style={{ width: 62, textAlign: 'center' }} />
                <div style={{ display: 'flex', gap: 14 }}>
                  <span onClick={() => { closeAll(); setEditId(c.id); setEdit({ name: c.name, slug: c.slug }); }} style={{ font: `600 12.5px/1 ${font}`, color: color.pink, cursor: 'pointer' }}>Edit</span>
                  {c.name !== fallbackName && (
                    <span onClick={() => { closeAll(); setDelId(c.id); }} style={{ font: `600 12.5px/1 ${font}`, color: color.muted, cursor: 'pointer' }}>Delete</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ font: `400 12px/1.6 ${font}`, color: color.faint, marginTop: 10 }}>
        Create, edit, delete and merge are all written to the audit log. Deleted categories move their listings to {fallbackName}.
      </div>
    </div>
  );
}
