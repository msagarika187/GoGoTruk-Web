import adminAxios from "./adminAxios";

const AUTH = "/auth";

export const setupAdmin = (data) => adminAxios.post(`${AUTH}/setup`, data);
export const loginAdmin = (data) => adminAxios.post(`${AUTH}/login`, data);
export const getMe = () => adminAxios.get(`${AUTH}/me`);
export const createAdmin = (data) => adminAxios.post(`${AUTH}/admins`, data);
export const listAdmins = () => adminAxios.get(`${AUTH}/admins`);
export const deactivateAdmin = (id) => adminAxios.delete(`${AUTH}/admins/${id}`);
