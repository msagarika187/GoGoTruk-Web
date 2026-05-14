import adminAxios from "./adminAxios";

export const getPendingKYC = () => adminAxios.get("/kyc/pending");

export const getCustomerKYCDetail = (id) => adminAxios.get(`/kyc/customer/${id}`);
export const getCompanyKYCDetail = (id) => adminAxios.get(`/kyc/company/${id}`);
export const getOwnerKYCDetail = (id) => adminAxios.get(`/kyc/owner/${id}`);

export const reviewCustomerKYC = (id, data) => adminAxios.post(`/kyc/customer/${id}/review`, data);
export const reviewCompanyKYC = (id, data) => adminAxios.post(`/kyc/company/${id}/review`, data);
export const reviewOwnerKYC = (id, data) => adminAxios.post(`/kyc/owner/${id}/review`, data);
