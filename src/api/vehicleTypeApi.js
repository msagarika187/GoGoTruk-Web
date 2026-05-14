import axios from "axios";
import adminAxios from "./adminAxios";

export const getPublicVehicleTypes = () => axios.get("http://127.0.0.1:8000/api/vehicle-types");

export const getAdminVehicleTypes = () => adminAxios.get("/vehicle-types");
export const createVehicleType = (data) => adminAxios.post("/vehicle-types", data);
export const updateVehicleType = (id, data) => adminAxios.put(`/vehicle-types/${id}`, data);
export const deactivateVehicleType = (id) => adminAxios.delete(`/vehicle-types/${id}`);
