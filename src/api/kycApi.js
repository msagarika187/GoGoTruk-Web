import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api/kyc";

export const sendOTP = async (mobile) => {
  const res = await axios.post(`${BASE_URL}/send-otp`, { mobile });
  return res.data;
};

export const verifyOTP = async (mobile, otp) => {
  const res = await axios.post(`${BASE_URL}/verify-otp`, { mobile, otp });
  return res.data;
};

export const registerKYC = async (data) => {
  const res = await axios.post(`${BASE_URL}/register`, data);
  return res.data;
};

export const getKYCStatus = async (id) => {
  const res = await axios.get(`${BASE_URL}/status/${id}`);
  return res.data;
};