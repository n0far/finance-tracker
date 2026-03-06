import { useState } from 'react';
import { useCategories } from '../context/CategoriesContext';
import { createCategory, updateCategory, deleteCategory } from '../api/categories';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const PRESET_COLORS = [
  '#ef4444','#f97316','#f59e0b','#84cc16','#10b981',
  '#06b6d4','#3b82f6','#6366f1','#8b5cf6','#ec4899','#9ca3af',
];

const PRESET_ICONS = ['📦','💳','🏠','🍽️','🚗','⚡','🏥','🎮','🛍️','📚','✈️','📱','💼','💻','📈','💰','🏦'];

function CategoryForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', color: '#6366f1', icon: '📦', type: 'both' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="e.g. Groceries"
        required
      />

      <div>
        <label className="text-sm font-medium text-gray-700">Icon</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {PRESET_ICONS.map(icon => (
            <button
              key={icon} type="button"
              onClick={() => setForm(f => ({ ...f, icon }))}
              className={`text-xl p-1 rounded transition-all ${form.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-110' : 'hover:bg-gray-100'}`}
            >
              {icon}
            </button>
          ))}
          <input
            type="text" maxLength={2}
            value={PRESET_ICONS.includes(form.icon) ? '' : form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value || '📦' }))}
            placeholder="Or type"
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Color</label>
        <div className="mt-1 flex flex-wrap gap-2 items-center">
          {PRESET_COLORS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setForm(f => ({ ...f, color: c }))}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color" value={form.color}
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
            title="Custom color"
          />
        </div>
      </div>

      <Select
        label="Applies to"
        value={form.type}
        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
        options={[
          { value: 'expense', label: 'Expenses only' },
          { value: 'income', label: 'Income only' },
          { value: 'both', label: 'Both' },
        ]}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving}>Save</Button>
      </div>
    </form>
  );
}

export default function Categories() {
  const { categories, refresh } = useCategories();
  const { addToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteCat, setDeleteCat] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd(form) {
    try {
      await createCategory(form);
      addToast('Category created', 'success');
      refresh();
    } catch { addToast('Failed to create category', 'error'); throw new Error(); }
  }

  async function handleEdit(form) {
    try {
      await updateCategory(editCat.id, form);
      addToast('Category updated', 'success');
      refresh();
    } catch { addToast('Failed to update category', 'error'); throw new Error(); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteCategory(deleteCat.id);
      addToast('Category deleted', 'success');
      setDeleteCat(null);
      refresh();
    } catch { addToast('Cannot delete this category', 'error'); }
    finally { setDeleting(false); }
  }

  const income = categories.filter(c => c.type === 'income');
  const expense = categories.filter(c => c.type === 'expense');
  const both = categories.filter(c => c.type === 'both');

  function Section({ title, cats }) {
    if (!cats.length) return null;
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {cats.map(cat => (
            <div
              key={cat.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl">{cat.icon}</div>
              <div className="text-xs font-medium text-gray-700 text-center">{cat.name}</div>
              <div className="w-4 h-4 rounded-full mt-1" style={{ backgroundColor: cat.color }} />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setEditCat(cat)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                  title={cat.is_default ? 'Default categories can only change color/icon' : 'Edit'}
                >
                  Edit
                </button>
                {!cat.is_default && (
                  <button
                    onClick={() => setDeleteCat(cat)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
                {cat.is_default && (
                  <span className="text-xs text-gray-300" title="Default category">🔒</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>+ Add Category</Button>
      </div>

      <Section title="Income" cats={income} />
      <Section title="Expense" cats={expense} />
      <Section title="Both" cats={both} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Category">
        <CategoryForm onSave={handleAdd} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Edit Category">
        {editCat && (
          <CategoryForm
            initial={{ name: editCat.name, color: editCat.color, icon: editCat.icon, type: editCat.type }}
            onSave={handleEdit}
            onClose={() => setEditCat(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete category"
        message={`Delete "${deleteCat?.name}"? Transactions using this category will be unaffected but may lose their category link.`}
      />
    </div>
  );
}
