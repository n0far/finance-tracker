import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { createTransaction, getTransaction, updateTransaction } from '../api/transactions';
import { createRule } from '../api/recurring';
import { useCategories } from '../context/CategoriesContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { currentDate } from '../lib/format';

function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState('');

  function add() {
    const tag = input.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput('');
  }

  function remove(tag) {
    onChange(value.filter(t => t !== tag));
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">Tags</label>
      <div className="mt-1 flex flex-wrap gap-1.5 min-h-[38px] border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
            #{tag}
            <button type="button" onClick={() => remove(tag)} className="text-indigo-400 hover:text-indigo-700">✕</button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[80px] outline-none text-sm text-gray-700 bg-transparent"
          placeholder="Add tag + Enter"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
        />
      </div>
    </div>
  );
}

export default function TransactionForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { addToast } = useToast();
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [makeRecurring, setMakeRecurring] = useState(false);

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      type: 'expense',
      amount: '',
      date: currentDate(),
      category_id: '',
      notes: '',
      tags: [],
      frequency: 'monthly',
    }
  });

  const txType = watch('type');

  useEffect(() => {
    if (!isEdit) return;
    getTransaction(id).then(d => {
      reset({
        type: d.transaction.type,
        amount: d.transaction.amount,
        date: d.transaction.date,
        category_id: String(d.transaction.category_id),
        notes: d.transaction.notes,
        tags: d.transaction.tags,
        frequency: 'monthly',
      });
      setLoadingExisting(false);
    }).catch(() => { addToast('Transaction not found', 'error'); navigate('/transactions'); });
  }, [id]); // eslint-disable-line

  const filteredCategories = categories.filter(c => c.type === txType || c.type === 'both');

  async function onSubmit(data) {
    const payload = {
      type: data.type,
      amount: parseFloat(data.amount),
      date: data.date,
      category_id: parseInt(data.category_id),
      notes: data.notes || '',
      tags: data.tags || [],
    };

    try {
      if (isEdit) {
        await updateTransaction(id, payload);
        addToast('Transaction updated', 'success');
      } else {
        const result = await createTransaction(payload);
        if (makeRecurring) {
          await createRule({
            type: payload.type,
            amount: payload.amount,
            category_id: payload.category_id,
            notes: payload.notes,
            tags: payload.tags,
            frequency: data.frequency,
            start_date: data.date,
          });
          addToast('Transaction + recurring rule created', 'success');
        } else {
          addToast('Transaction added', 'success');
        }
      }
      navigate('/transactions');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save transaction', 'error');
    }
  }

  if (loadingExisting) {
    return <div className="flex justify-center h-48 items-center"><Spinner /></div>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {isEdit ? 'Edit Transaction' : 'Add Transaction'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Type toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <div className="mt-1 flex rounded-lg border border-gray-300 overflow-hidden">
              {['expense', 'income'].map(t => (
                <label
                  key={t}
                  className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                    txType === t
                      ? t === 'expense' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input type="radio" value={t} {...register('type')} className="sr-only" />
                  {t === 'expense' ? '📤 Expense' : '📥 Income'}
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Must be positive' } })}
          />

          {/* Date */}
          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date', { required: 'Date is required' })}
          />

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              {...register('category_id', { required: 'Category is required' })}
              className={`border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.category_id ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select category…</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-xs text-red-600">{errors.category_id.message}</p>}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional description…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Tags */}
          <Controller
            name="tags"
            control={control}
            render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
          />

          {/* Recurring (only on create) */}
          {!isEdit && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeRecurring}
                  onChange={e => setMakeRecurring(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Make this a recurring transaction</span>
              </label>
              {makeRecurring && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-600">Frequency</label>
                  <select
                    {...register('frequency')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
