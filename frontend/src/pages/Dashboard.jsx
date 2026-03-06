import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSummary, getMonthly, getByCategory, getSavingsCurve, getHealthScore } from '../api/reports';
import { listBudgets } from '../api/budgets';
import { listTransactions } from '../api/transactions';
import MonthlyBarChart from '../components/charts/MonthlyBarChart';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import SavingsLineChart from '../components/charts/SavingsLineChart';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { formatCurrency, formatDate, currentMonth } from '../lib/format';

function SummaryCard({ icon, label, value, sub, valueColor = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function ScoreRing({ score }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="53" textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>{score}</text>
      </svg>
      <div className="text-sm text-gray-500 space-y-1">
        <p>Financial health score</p>
        <p className="font-semibold" style={{ color }}>{score >= 70 ? 'Great' : score >= 40 ? 'Fair' : 'Needs work'}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [savingsCurve, setSavingsCurve] = useState([]);
  const [health, setHealth] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    Promise.all([
      getSummary(),
      getMonthly(),
      getByCategory(currentMonth()),
      getSavingsCurve(),
      getHealthScore(),
      listBudgets(currentMonth()),
      listTransactions({ limit: 5 }),
    ]).then(([sum, mon, cat, curve, hlth, bgt, txns]) => {
      setSummary(sum);
      setMonthly(mon.monthly);
      setByCategory(cat.categories);
      setSavingsCurve(curve.curve);
      setHealth(hlth);
      setBudgets(bgt.budgets);
      setRecent(txns.transactions);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const overBudget = budgets.filter(b => b.spent > b.limit_amount);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon="📥" label="Income" sub="This month"
          value={formatCurrency(summary?.income || 0)}
          valueColor="text-green-700"
        />
        <SummaryCard
          icon="📤" label="Expenses" sub="This month"
          value={formatCurrency(summary?.expenses || 0)}
          valueColor="text-red-600"
        />
        <SummaryCard
          icon="💰" label="Net Savings" sub="This month"
          value={formatCurrency(summary?.net || 0)}
          valueColor={summary?.net >= 0 ? 'text-indigo-700' : 'text-red-600'}
        />
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center">
          <ScoreRing score={health?.score || 0} />
        </div>
      </div>

      {/* Budget alerts */}
      {overBudget.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-semibold text-red-700 text-sm mb-2">
            ⚠️ Over budget in {overBudget.length} {overBudget.length === 1 ? 'category' : 'categories'}
          </p>
          <div className="flex flex-wrap gap-2">
            {overBudget.map(b => (
              <Badge key={b.id} color="#ef4444">
                {b.category_icon} {b.category_name}: {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
          {monthly.length === 0
            ? <p className="text-gray-400 text-sm py-8 text-center">No data yet. Add some transactions!</p>
            : <MonthlyBarChart data={monthly} />
          }
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <CategoryDonutChart data={byCategory} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Cumulative Savings Over Time</h3>
        {savingsCurve.length === 0
          ? <p className="text-gray-400 text-sm py-8 text-center">No data yet. Start tracking!</p>
          : <SavingsLineChart data={savingsCurve} />
        }
      </div>

      {/* Budgets overview */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Budget Status</h3>
            <Link to="/budgets" className="text-indigo-600 text-sm hover:text-indigo-700">View all</Link>
          </div>
          <div className="space-y-4">
            {budgets.slice(0, 4).map(b => {
              const pct = b.limit_amount > 0 ? Math.min((b.spent / b.limit_amount) * 100, 100) : 0;
              const isOver = b.spent > b.limit_amount;
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      {b.category_icon} {b.category_name}
                    </span>
                    <span className={`text-xs font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
                      {isOver && ' — OVER'}
                    </span>
                  </div>
                  <ProgressBar value={b.spent} max={b.limit_amount} color={b.category_color} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
          <Link to="/transactions" className="text-indigo-600 text-sm hover:text-indigo-700">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-3">No transactions yet</p>
            <Link
              to="/transactions/new"
              className="inline-flex items-center gap-2 text-indigo-600 text-sm font-medium hover:text-indigo-700"
            >
              + Add your first transaction
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.category_icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {t.notes || t.category_name}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.category_name}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
