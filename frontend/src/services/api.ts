const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const loginUser = async (walletAddress: string, role: string) => {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, role }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const getUserRole = async (walletAddress: string) => {
  try {
    const res = await fetch(`${API_URL}/api/auth/role/${walletAddress}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const getProducts = async () => {
  try {
    const res = await fetch(`${API_URL}/api/products`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export const createOrder = async (orderData: Record<string, unknown>) => {
  try {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};
