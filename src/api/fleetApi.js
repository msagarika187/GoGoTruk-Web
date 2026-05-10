import axios from "axios";

const FLEET_BASE = "http://127.0.0.1:8000/api/fleet";

export const registerVehicle = (data) => axios.post(`${FLEET_BASE}/register`, data);

export const uploadFleetDocs = (fleetId, formData) =>
  axios.post(`${FLEET_BASE}/upload-docs/${fleetId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getOwnerVehicles = (ownerKycId) =>
  axios.get(`${FLEET_BASE}/owner/${ownerKycId}`);

export const getVehicleDetail = (fleetId) =>
  axios.get(`${FLEET_BASE}/${fleetId}`);

export const updateExpiryDates = (fleetId, data) =>
  axios.put(`${FLEET_BASE}/${fleetId}/expiry-dates`, data);
