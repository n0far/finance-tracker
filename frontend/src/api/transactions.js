import client from './client';

export const listTransactions = (params) => client.get('/transactions', { params }).then(r => r.data);
export const getTransaction = (id) => client.get(`/transactions/${id}`).then(r => r.data);
export const createTransaction = (data) => client.post('/transactions', data).then(r => r.data);
export const updateTransaction = (id, data) => client.put(`/transactions/${id}`, data).then(r => r.data);
export const deleteTransaction = (id) => client.delete(`/transactions/${id}`).then(r => r.data);
export const exportCsvUrl = (params) => {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  const q = new URLSearchParams(params).toString();
  return `${base}/transactions/export/csv${q ? '?' + q : ''}`;
};
