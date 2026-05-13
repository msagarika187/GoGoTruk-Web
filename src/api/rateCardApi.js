import axios from "axios";

const BASE = "http://127.0.0.1:8000/api";

export const getPublicRateCards = () => axios.get(`${BASE}/rate-cards`);
export const getAdminRateCards = () => axios.get(`${BASE}/admin/rate-cards`);
export const createRateCard = (data) => axios.post(`${BASE}/admin/rate-cards`, data);
export const updateRateCard = (id, data) => axios.put(`${BASE}/admin/rate-cards/${id}`, data);
