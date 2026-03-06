import { useState, useEffect } from 'react';
import { getSummary, getMonthly, getByCategory, getSavingsCurve } from '../api/reports';
import { listTransactions, exportCsvUrl } from '../api/transactions';
import MonthlyBarChart from '../components/charts/MonthlyBarChart';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import SavingsLineChart from '../components/charts/SavingsLineChart';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/format';

const PRESETS = [
  { label: 'This month', getDates: () => {
    const now = new Date();
    return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to: now.toISOString().slice(0,10) };
  }},
  { label: 'Last month', getDates: () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${String(m).padStart(2,'0')}-01`, to: `${y}-${String(m).padStart(2,'0')}-${last}` };
  }},
  { label: 'Last 3 months', getDates: () => {
    const to = new Date();
    const from = new Date(); from.setMonth(from.getMonth() - 3);
    return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) };
  }},
  { label: 'Last 12 months', getDates: () => {
    const to = new Date();
    const from = new Date(); from.setFullYear(from.getFullYear() - 1);
    return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) };
  }},
];

export default function Reports() {
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
  const [to, setTo] = useState(now.toISOString().slice(0,10));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [savingsCurve, setSavingsCurve] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  async function load() {
    setLoading(true);
    try {
      const [sum, mon, cat, curve, txns] = await Promise.all([
        getSummary({ from, to }),
        getMonthly(),
        getByCategory(month),
        getSavingsCurve(),
        listTransactions({ from, to, limit: 200 }),
      ]);
      setSummary(sum);
      setMonthly(mon.monthly);
      setByCategory(cat.categories);
      setSavingsCurve(curve.curve);
      setTransactions(txns.transactions);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [from, to]); // eslint-disable-line

  function applyPreset(preset) {
    const { from: f, to: t } = preset.getDates();
    setFrom(f); setTo(t);
  }

  function handleExport() {
    const token = localStorage.getItem('token');
    const url = exportCsvUrl({ from, to });
    window.fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'report.csv';
        a.click();
      });
  }

  return (
    <div className="space-y-6">
      {/* Date controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date" value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date" value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Income', value: summary.income, color: 'text-green-700' },
            { label: 'Expenses', value: summary.expenses, color: 'text-red-600' },
            { label: 'Net', value: summary.net, color: summary.net >= 0 ? 'text-indigo-700' : 'text-red-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-48 items-center"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
              {monthly.length === 0
                ? <p className="text-center text-gray-400 py-12 text-sm">No data</p>
                : <MonthlyBarChart data={monthly} />
              }
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Expenses by Category</h3>
              <CategoryDonutChart data={byCategory} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cumulative Savings</h3>
            {savingsCurve.length === 0
              ? <p className="text-center text-gray-400 py-12 text-sm">No data</p>
              : <SavingsLineChart data={savingsCurve} />
            }
          </div>

          {/* Transaction table for range */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Transactions ({transactions.length})</h3>
              <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{t.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge color={t.category_color}>{t.category_icon} {t.category_name}</Badge>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <p className="text-center py-10 text-gray-400 text-sm">No transactions in this period</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
