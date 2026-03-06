import { useState, useEffect } from 'react';
import { listBudgets, createBudget, deleteBudget } from '../api/budgets';
import { useCategories } from '../context/CategoriesContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import { formatCurrency, currentMonth } from '../lib/format';
import { format, addMonths, parseISO } from 'date-fns';

function monthStr(d) { return format(d, 'yyyy-MM'); }
function monthLabel(m) { return format(parseISO(m + '-01'), 'MMMM yyyy'); }

export default function Budgets() {
  const { categories } = useCategories();
  const { addToast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ category_id: '', limit_amount: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listBudgets(month);
      setBudgets(data.budgets);
    } catch { addToast('Failed to load budgets', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [month]); // eslint-disable-line

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.category_id || !form.limit_amount) return;
    setSaving(true);
    try {
      await createBudget({
        category_id: parseInt(form.category_id),
        month,
        limit_amount: parseFloat(form.limit_amount),
      });
      addToast('Budget set', 'success');
      setShowAdd(false);
      setForm({ category_id: '', limit_amount: '' });
      load();
    } catch { addToast('Failed to set budget', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBudget(deleteTarget.id);
      addToast('Budget removed', 'success');
      setDeleteTarget(null);
      load();
    } catch { addToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  }

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');
  const budgetCategoryIds = new Set(budgets.map(b => b.category_id));
  const availableCategories = expenseCategories.filter(c => !budgetCategoryIds.has(c.id));

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMonth(monthStr(addMonths(parseISO(month + '-01'), -1)))}>
            ← Prev
          </Button>
          <span className="font-semibold text-gray-800 text-lg">{monthLabel(month)}</span>
          <Button variant="ghost" size="sm" onClick={() => setMonth(monthStr(addMonths(parseISO(month + '-01'), 1)))}>
            Next →
          </Button>
        </div>
        <Button onClick={() => setShowAdd(true)} disabled={availableCategories.length === 0}>
          + Set Budget
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center"><Spinner /></div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm mb-3">No budgets set for {monthLabel(month)}</p>
          <Button size="sm" onClick={() => setShowAdd(true)}>Set your first budget</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const pct = b.limit_amount > 0 ? Math.min((b.spent / b.limit_amount) * 100, 100) : 0;
            const isOver = b.spent > b.limit_amount;
            const remaining = b.limit_amount - b.spent;

            return (
              <div key={b.id} className={`bg-white rounded-xl border shadow-sm p-5 ${isOver ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{b.category_icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{b.category_name}</p>
                      {isOver && <span className="text-xs font-semibold text-red-600">Over budget!</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>

                <ProgressBar value={b.spent} max={b.limit_amount} color={b.category_color} className="mb-3" />

                <div className="flex justify-between text-xs text-gray-500">
                  <span>Spent: <strong className={isOver ? 'text-red-600' : 'text-gray-700'}>{formatCurrency(b.spent)}</strong></span>
                  <span>Limit: <strong>{formatCurrency(b.limit_amount)}</strong></span>
                </div>
                <p className={`text-xs mt-1 font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                  {isOver
                    ? `${formatCurrency(Math.abs(remaining))} over limit`
                    : `${formatCurrency(remaining)} remaining`
                  }
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{Math.round(pct)}% used</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add budget modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Set Budget for ${monthLabel(month)}`}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select category…</option>
              {availableCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Monthly limit ($)</label>
            <input
              type="number" step="0.01" min="1"
              value={form.limit_amount}
              onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))}
              placeholder="e.g. 500"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Set Budget</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove budget"
        message={`Remove the budget for "${deleteTarget?.category_name}" in ${monthLabel(month)}?`}
      />
    </div>
  );
}
