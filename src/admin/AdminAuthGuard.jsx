import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../api/adminAuthApi";

export default function AdminAuthGuard({ children }) {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    getMe()
      .then(() => setVerified(true))
      .catch(() => {
        localStorage.removeItem("adminToken");
        navigate("/admin/login", { replace: true });
      });
  }, []);

  if (!verified) return null;
  return children;
}
