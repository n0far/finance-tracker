import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function formatCurrency(v) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(v);
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  const total = p.total;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold" style={{ color: p.color }}>{p.icon} {name}</p>
      <p className="text-gray-700">{formatCurrency(value)}</p>
      <p className="text-gray-400">{total > 0 ? ((value / total) * 100).toFixed(1) : 0}%</p>
    </div>
  );
};

export default function CategoryDonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const chartData = data.map(d => ({ ...d, name: d.name, value: d.total, total }));

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No expense data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value, entry) => (
            <span style={{ color: '#374151', fontSize: 12 }}>
              {entry.payload.icon} {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
