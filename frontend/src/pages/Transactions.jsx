import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listTransactions, deleteTransaction, exportCsvUrl } from '../api/transactions';
import { useCategories } from '../context/CategoriesContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../lib/format';

export default function Transactions() {
  const { categories } = useCategories();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ transactions: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const type = searchParams.get('type') || '';
  const category_id = searchParams.get('category_id') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (type) params.type = type;
      if (category_id) params.category_id = category_id;
      if (from) params.from = from;
      if (to) params.to = to;
      const result = await listTransactions(params);
      setData(result);
    } catch { addToast('Failed to load transactions', 'error'); }
    finally { setLoading(false); }
  }, [page, type, category_id, from, to]); // eslint-disable-line

  useEffect(() => { loadData(); }, [loadData]);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTransaction(deleteId);
      addToast('Transaction deleted', 'success');
      setDeleteId(null);
      loadData();
    } catch { addToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  }

  function handleExport() {
    const params = {};
    if (type) params.type = type;
    if (category_id) params.category_id = category_id;
    if (from) params.from = from;
    if (to) params.to = to;
    const token = localStorage.getItem('token');
    const url = exportCsvUrl(params);
    window.fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'transactions.csv';
        a.click();
      });
  }

  const totalPages = Math.ceil(data.total / 20);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Type filter */}
          <select
            value={type}
            onChange={e => setFilter('type', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Category filter */}
          <select
            value={category_id}
            onChange={e => setFilter('category_id', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {/* Date range */}
          <input
            type="date" value={from}
            onChange={e => setFilter('from', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date" value={to}
            onChange={e => setFilter('to', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {(type || category_id || from || to) && (
            <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
          <Link to="/transactions/new">
            <Button size="sm">+ Add Transaction</Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48"><Spinner /></div>
        ) : data.transactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-3">No transactions found</p>
            <Link to="/transactions/new">
              <Button size="sm">Add Transaction</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs truncate">
                      {t.notes || '—'}
                      {t.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {t.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={t.category_color}>
                        {t.category_icon} {t.category_name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      t.type === 'income' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/transactions/${t.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>{data.total} total</span>
            <div className="flex gap-2">
              <Button
                variant="secondary" size="sm"
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                ← Prev
              </Button>
              <span className="px-3 py-1.5">{page} / {totalPages}</span>
              <Button
                variant="secondary" size="sm"
                disabled={page >= totalPages}
                onClick={() => setFilter('page', String(page + 1))}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete transaction"
        message="Are you sure you want to delete this transaction? This cannot be undone."
      />
    </div>
  );
}
