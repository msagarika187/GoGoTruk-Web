import adminAxios from "./adminAxios";

const BASE = "/analytics";

export const getSummary = (params) => adminAxios.get(`${BASE}/summary`, { params });
export const getTopRoutes = (params) => adminAxios.get(`${BASE}/top-routes`, { params });
export const getTrend = (params) => adminAxios.get(`${BASE}/trend`, { params });
export const getCustomerGrowth = (params) => adminAxios.get(`${BASE}/customer-growth`, { params });
export const generateReport = (params) => adminAxios.post(`${BASE}/generate-report`, null, { params });
export const downloadReportPdf = (params) => adminAxios.get(`${BASE}/download/report.pdf`, { params, responseType: "blob" });
export const downloadReportExcel = (params) => adminAxios.get(`${BASE}/download/report.xlsx`, { params, responseType: "blob" });
