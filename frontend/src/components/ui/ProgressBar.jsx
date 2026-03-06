export default function ProgressBar({ value, max, color = '#6366f1', className = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;

  return (
    <div className={`h-2.5 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: isOver ? '#ef4444' : color }}
      />
    </div>
  );
}
