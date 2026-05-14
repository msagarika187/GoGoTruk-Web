import axios from "axios";
import adminAxios from "./adminAxios";

export const getPublicRateCards = () => axios.get("http://127.0.0.1:8000/api/rate-cards");
export const getAdminRateCards = () => adminAxios.get("/rate-cards");
export const createRateCard = (data) => adminAxios.post("/rate-cards", data);
export const updateRateCard = (id, data) => adminAxios.put(`/rate-cards/${id}`, data);
