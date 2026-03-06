export function formatCurrency(amount) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
}

export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function currentDate() {
  return new Date().toISOString().slice(0, 10);
}
