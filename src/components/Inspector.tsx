import { Eye, EyeOff, Lock, Unlock, Trash2, Type, Square, Circle, Image as ImageIcon } from 'lucide-react';
import type { Artboard, DesignObject } from '../types';

interface Props { artboard: Artboard; selected: DesignObject | null; onUpdate: (id: string, update: Partial<DesignObject>) => void; onDelete: (id: string) => void; }

export function Inspector({ artboard, selected, onUpdate, onDelete }: Props) {
  if (!selected) return <aside className="inspector"><div className="inspector-heading"><span>Inspector</span><span className="muted">Canvas</span></div><div className="inspector-empty"><div className="empty-symbol">⌖</div><strong>Select an element</strong><p>Choose an object on the canvas or in Layers to adjust its position and style.</p></div><div className="dimensions-box"><span>Artboard</span><strong>{artboard.width} × {artboard.height}</strong></div></aside>;
  const Icon = selected.type === 'text' ? Type : selected.type === 'image' ? ImageIcon : selected.type === 'ellipse' ? Circle : Square;
  return <aside className="inspector">
    <div className="inspector-heading"><span>Inspector</span><span className="muted">{selected.type}</span></div>
    <div className="selected-object"><span className="object-icon"><Icon size={15}/></span><input aria-label="Layer name" value={selected.name} onChange={(e) => onUpdate(selected.id, { name: e.target.value })}/><button className="icon-btn" aria-label={selected.visible === false ? 'Show layer' : 'Hide layer'} onClick={() => onUpdate(selected.id, { visible: selected.visible === false })}>{selected.visible === false ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div>
    {selected.fontMissing && <div className="font-notice"><strong>Typeface unavailable</strong><span>The original look is retained. Choose an available typeface to edit this text.</span></div>}
    <section className="inspector-section"><h3>Position</h3><div className="field-grid">
      <label><span>X</span><input type="number" value={Math.round(selected.x)} onChange={(e) => onUpdate(selected.id, { x: Number(e.target.value) })}/></label>
      <label><span>Y</span><input type="number" value={Math.round(selected.y)} onChange={(e) => onUpdate(selected.id, { y: Number(e.target.value) })}/></label>
      <label><span>Width</span><input type="number" min="1" value={Math.round(selected.width)} onChange={(e) => onUpdate(selected.id, { width: Number(e.target.value) })}/></label>
      <label><span>Height</span><input type="number" min="1" value={Math.round(selected.height)} onChange={(e) => onUpdate(selected.id, { height: Number(e.target.value) })}/></label>
    </div></section>
    {selected.type === 'text' && <section className="inspector-section"><h3>Text</h3><textarea disabled={selected.fontMissing} value={selected.text ?? ''} onChange={(e) => onUpdate(selected.id, { text: e.target.value })} rows={3}/><label className="field-row"><span>Typeface</span><select value={selected.fontFamily?.split(',')[0] ?? 'Inter'} onChange={(e) => onUpdate(selected.id, { fontFamily: e.target.value, fontMissing: false })}><option>Inter</option><option>Arial</option><option>Georgia</option><option>Helvetica</option><option>Times New Roman</option></select></label><label className="field-row"><span>Size</span><input type="number" min="8" value={selected.fontSize ?? 32} onChange={(e) => onUpdate(selected.id, { fontSize: Number(e.target.value) })}/></label></section>}
    {selected.type !== 'image' && selected.type !== 'line' && <section className="inspector-section"><h3>Appearance</h3><label className="field-row"><span>Fill</span><span className="color-input"><input type="color" value={selected.fill.startsWith('#') ? selected.fill : '#353535'} onChange={(e) => onUpdate(selected.id, { fill: e.target.value })}/><code>{selected.fill}</code></span></label><label className="field-row"><span>Opacity</span><input type="range" min="0.1" max="1" step="0.05" value={selected.opacity ?? 1} onChange={(e) => onUpdate(selected.id, { opacity: Number(e.target.value) })}/></label></section>}
    <div className="inspector-actions"><button onClick={() => onUpdate(selected.id, { locked: !selected.locked })}>{selected.locked ? <Unlock size={14}/> : <Lock size={14}/>} {selected.locked ? 'Unlock layer' : 'Lock layer'}</button><button className="delete-action" onClick={() => onDelete(selected.id)}><Trash2 size={14}/> Delete</button></div>
  </aside>;
}
