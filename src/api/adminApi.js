import axios from "axios";

const ADMIN_BASE = "http://127.0.0.1:8000/api/admin";

export const getPendingKYC = () => axios.get(`${ADMIN_BASE}/kyc/pending`);

export const getCustomerKYCDetail = (id) => axios.get(`${ADMIN_BASE}/kyc/customer/${id}`);
export const getCompanyKYCDetail = (id) => axios.get(`${ADMIN_BASE}/kyc/company/${id}`);
export const getOwnerKYCDetail = (id) => axios.get(`${ADMIN_BASE}/kyc/owner/${id}`);

export const reviewCustomerKYC = (id, data) => axios.post(`${ADMIN_BASE}/kyc/customer/${id}/review`, data);
export const reviewCompanyKYC = (id, data) => axios.post(`${ADMIN_BASE}/kyc/company/${id}/review`, data);
export const reviewOwnerKYC = (id, data) => axios.post(`${ADMIN_BASE}/kyc/owner/${id}/review`, data);
