import { useState, useEffect } from 'react';
import { listGoals, createGoal, updateGoal, deleteGoal, depositGoal } from '../api/savingsGoals';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { formatCurrency } from '../lib/format';
import { differenceInDays, parseISO } from 'date-fns';

const PRESET_COLORS = ['#10b981','#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899'];
const PRESET_ICONS = ['🎯','🏖️','🏠','🚗','✈️','💍','🎓','📱','💻','🏋️','🎸','🌍'];

function GoalForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', target_amount: '', current_amount: '', target_date: '', color: '#10b981', icon: '🎯'
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount || 0),
        target_date: form.target_date || null,
      });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Goal name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Emergency Fund" required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Target amount (₪)" type="number" step="0.01" min="1" value={form.target_amount} onChange={e => setForm(f => ({...f, target_amount: e.target.value}))} placeholder="10000" required />
        <Input label="Current amount (₪)" type="number" step="0.01" min="0" value={form.current_amount} onChange={e => setForm(f => ({...f, current_amount: e.target.value}))} placeholder="0" />
      </div>
      <Input label="Target date (optional)" type="date" value={form.target_date || ''} onChange={e => setForm(f => ({...f, target_date: e.target.value}))} />
      <div>
        <label className="text-sm font-medium text-gray-700">Icon</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {PRESET_ICONS.map(icon => (
            <button key={icon} type="button" onClick={() => setForm(f => ({...f, icon}))}
              className={`text-xl p-1 rounded ${form.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-110' : 'hover:bg-gray-100'}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Color</label>
        <div className="mt-1 flex gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({...f, color: c}))}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))} className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving}>Save Goal</Button>
      </div>
    </form>
  );
}

function DepositModal({ goal, onClose, onDeposit }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    const v = parseFloat(amount);
    if (!v || v <= 0) return;
    setSaving(true);
    try {
      await onDeposit(v);
      onClose();
    } catch { addToast('Failed to deposit', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={!!goal} onClose={onClose} title={`Deposit to: ${goal?.name}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Amount (₪)" type="number" step="0.01" min="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="100" autoFocus required />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success" loading={saving}>Deposit</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SavingsGoals() {
  const { addToast } = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [depositGoalTarget, setDepositGoalTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try { const d = await listGoals(); setGoals(d.goals); }
    catch { addToast('Failed to load goals', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function handleAdd(form) {
    try { await createGoal(form); addToast('Goal created', 'success'); load(); }
    catch { addToast('Failed to create goal', 'error'); throw new Error(); }
  }

  async function handleEdit(form) {
    try { await updateGoal(editGoal.id, form); addToast('Goal updated', 'success'); load(); }
    catch { addToast('Failed to update goal', 'error'); throw new Error(); }
  }

  async function handleDeposit(amount) {
    await depositGoal(depositGoalTarget.id, amount);
    addToast(`Deposited ${formatCurrency(amount)}`, 'success');
    load();
  }

  async function handleDelete() {
    setDeleting(true);
    try { await deleteGoal(deleteTarget.id); addToast('Goal deleted', 'success'); setDeleteTarget(null); load(); }
    catch { addToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  }

  if (loading) return <div className="flex justify-center h-48 items-center"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>+ New Goal</Button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-500 text-sm mb-4">No savings goals yet. Set a goal to stay motivated!</p>
          <Button size="sm" onClick={() => setShowAdd(true)}>Create your first goal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
            const remaining = g.target_amount - g.current_amount;
            const daysLeft = g.target_date ? differenceInDays(parseISO(g.target_date), new Date()) : null;

            return (
              <div key={g.id} className={`bg-white rounded-xl border shadow-sm p-5 ${g.is_completed ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{g.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{g.name}</p>
                      {g.is_completed && <span className="text-xs text-green-600 font-semibold">✅ Goal achieved!</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditGoal(g)} className="text-gray-400 hover:text-indigo-600 text-xs">Edit</button>
                    <button onClick={() => setDeleteTarget(g)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                  </div>
                </div>

                <ProgressBar value={g.current_amount} max={g.target_amount} color={g.color} className="mb-3" />

                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Saved: <strong className="text-gray-700">{formatCurrency(g.current_amount)}</strong></span>
                  <span>Goal: <strong>{formatCurrency(g.target_amount)}</strong></span>
                </div>
                <p className="text-xs text-gray-500">{Math.round(pct)}% complete · {formatCurrency(remaining > 0 ? remaining : 0)} to go</p>
                {daysLeft !== null && (
                  <p className={`text-xs mt-1 font-medium ${daysLeft < 0 ? 'text-red-500' : daysLeft < 30 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                  </p>
                )}

                {!g.is_completed && (
                  <Button
                    variant="success" size="sm" className="w-full mt-4"
                    onClick={() => setDepositGoalTarget(g)}
                  >
                    + Deposit
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Savings Goal" size="lg">
        <GoalForm onSave={handleAdd} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit Goal" size="lg">
        {editGoal && (
          <GoalForm
            initial={{ name: editGoal.name, target_amount: editGoal.target_amount, current_amount: editGoal.current_amount, target_date: editGoal.target_date || '', color: editGoal.color, icon: editGoal.icon }}
            onSave={handleEdit}
            onClose={() => setEditGoal(null)}
          />
        )}
      </Modal>

      <DepositModal goal={depositGoalTarget} onClose={() => setDepositGoalTarget(null)} onDeposit={handleDeposit} />

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete goal" message={`Delete "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
