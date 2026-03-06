import client from './client';

export const getSummary = (params) => client.get('/reports/summary', { params }).then(r => r.data);
export const getMonthly = () => client.get('/reports/monthly').then(r => r.data);
export const getByCategory = (month) => client.get('/reports/by-category', { params: { month } }).then(r => r.data);
export const getSavingsCurve = () => client.get('/reports/savings-curve').then(r => r.data);
export const getHealthScore = () => client.get('/reports/health-score').then(r => r.data);
