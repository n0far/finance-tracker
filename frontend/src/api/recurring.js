import client from './client';

export const listRules = () => client.get('/recurring').then(r => r.data);
export const createRule = (data) => client.post('/recurring', data).then(r => r.data);
export const updateRule = (id, data) => client.put(`/recurring/${id}`, data).then(r => r.data);
export const toggleRule = (id) => client.patch(`/recurring/${id}/toggle`).then(r => r.data);
export const deleteRule = (id) => client.delete(`/recurring/${id}`).then(r => r.data);
