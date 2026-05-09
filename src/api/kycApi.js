import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api/kyc";
const COMPANY_BASE_URL = "http://127.0.0.1:8000/api/company-kyc";

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

export const registerCompanyKYC = async (data) => {
  const res = await axios.post(`${COMPANY_BASE_URL}/register`, data);
  return res.data;
};

export const uploadCompanyDocs = async (companyKycId, formData) => {
  const res = await axios.post(`${COMPANY_BASE_URL}/upload-docs/${companyKycId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getCompanyKYCStatus = async (companyKycId) => {
  const res = await axios.get(`${COMPANY_BASE_URL}/status/${companyKycId}`);
  return res.data;
};
