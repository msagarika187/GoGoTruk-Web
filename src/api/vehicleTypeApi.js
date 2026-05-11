import axios from "axios";

const PUBLIC_BASE = "http://127.0.0.1:8000/api";
const ADMIN_BASE = "http://127.0.0.1:8000/api/admin";

export const getPublicVehicleTypes = () => axios.get(`${PUBLIC_BASE}/vehicle-types`);

export const getAdminVehicleTypes = () => axios.get(`${ADMIN_BASE}/vehicle-types`);
export const createVehicleType = (data) => axios.post(`${ADMIN_BASE}/vehicle-types`, data);
export const updateVehicleType = (id, data) => axios.put(`${ADMIN_BASE}/vehicle-types/${id}`, data);
export const deactivateVehicleType = (id) => axios.delete(`${ADMIN_BASE}/vehicle-types/${id}`);
