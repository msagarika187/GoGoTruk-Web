import axios from "axios";

const BASE = "http://127.0.0.1:8000/api/bookings";

export const createBooking = (data) => axios.post(BASE, data);
export const getBooking = (bookingId) => axios.get(`${BASE}/${bookingId}`);
export const getCustomerBookings = (customerKycId) => axios.get(`${BASE}/customer/${customerKycId}`);
export const getOwnerBookings = (ownerKycId) => axios.get(`${BASE}/owner/${ownerKycId}`);
export const reviewBooking = (bookingId, data) => axios.post(`${BASE}/${bookingId}/review`, data);
export const getCancellationPreview = (bookingId) => axios.get(`${BASE}/${bookingId}/cancellation-preview`);
export const cancelBooking = (bookingId, data) => axios.post(`${BASE}/${bookingId}/cancel`, data);
export const getCancellation = (bookingId) => axios.get(`${BASE}/${bookingId}/cancellation`);
