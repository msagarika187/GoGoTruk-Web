import axios from "axios";

const BASE = "http://127.0.0.1:8000/api/availability";

export const setAvailability = (data) => axios.post(BASE, data);
export const getFleetAvailability = (fleetId, status) =>
  axios.get(`${BASE}/fleet/${fleetId}`, { params: status ? { status } : {} });
export const searchAvailability = (params) => axios.get(`${BASE}/search`, { params });
export const searchTrucks = (params) => axios.get("http://127.0.0.1:8000/api/search/trucks", { params });
export const bookSlot = (availabilityId, body) => axios.post(`${BASE}/${availabilityId}/book`, body);
export const releaseSlot = (availabilityId) => axios.post(`${BASE}/${availabilityId}/release`);
export const updateAvailability = (id, data) => axios.put(`${BASE}/${id}`, data);
export const deleteAvailability = (id) => axios.delete(`${BASE}/${id}`);
