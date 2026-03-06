import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { to: '/transactions',  icon: '💳', label: 'Transactions' },
  { to: '/budgets',       icon: '🎯', label: 'Budgets' },
  { to: '/savings-goals', icon: '🏦', label: 'Savings Goals' },
  { to: '/categories',    icon: '🏷️', label: 'Categories' },
  { to: '/reports',       icon: '📈', label: 'Reports' },
];

export default function Sidebar({ onClose }) {
  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="font-bold text-gray-900 text-lg">FinanceTracker</span>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="text-lg">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
        Finance Tracker v1.0
      </div>
    </div>
  );
}
