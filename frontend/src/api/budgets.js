import client from './client';

export const listBudgets = (month) => client.get('/budgets', { params: { month } }).then(r => r.data);
export const createBudget = (data) => client.post('/budgets', data).then(r => r.data);
export const updateBudget = (id, data) => client.put(`/budgets/${id}`, data).then(r => r.data);
export const deleteBudget = (id) => client.delete(`/budgets/${id}`).then(r => r.data);
