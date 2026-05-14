import adminAxios from "./adminAxios";

const DB = "/dashboard";

export const getMetrics = () => adminAxios.get(`${DB}/metrics`);
export const getKycQueue = () => adminAxios.get(`${DB}/kyc-queue`);
export const getFleetQueue = () => adminAxios.get(`${DB}/fleet-queue`);
export const getBookings = (params) => adminAxios.get(`${DB}/bookings`, { params });
export const getRevenue = () => adminAxios.get(`${DB}/revenue`);
export const exportKycPdf = (params) => adminAxios.get(`${DB}/export/kyc.pdf`, { params, responseType: "blob" });
export const exportBookingsPdf = (params) => adminAxios.get(`${DB}/export/bookings.pdf`, { params, responseType: "blob" });
export const exportBookingsExcel = (params) => adminAxios.get(`${DB}/export/bookings.xlsx`, { params, responseType: "blob" });
export const exportRevenuePdf = (params) => adminAxios.get(`${DB}/export/revenue.pdf`, { params, responseType: "blob" });
export const exportRevenueExcel = (params) => adminAxios.get(`${DB}/export/revenue.xlsx`, { params, responseType: "blob" });
export const getNotifications = (params) => adminAxios.get(`${DB}/notifications`, { params });
