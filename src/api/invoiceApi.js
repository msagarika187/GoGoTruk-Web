import axios from "axios";

const BASE = "http://127.0.0.1:8000/api/invoices";

export const previewInvoice = (data) => axios.post(`${BASE}/preview`, data);
export const generateInvoice = (data) => axios.post(`${BASE}/generate`, data);
export const getInvoice = (invoiceId) => axios.get(`${BASE}/${invoiceId}`);
export const getBookingInvoice = (bookingId) => axios.get(`${BASE}/booking/${bookingId}`);
