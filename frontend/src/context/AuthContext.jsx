import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

export function AuthProvider({ children }) {
  // ==========================================
  // TOKEN
  // ==========================================

  const [token, setToken] = useState(
    () =>
      localStorage.getItem("token")
  );

  // ==========================================
  // USER
  // ==========================================

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  // ==========================================
  // RESTAURANT
  // ==========================================

  const [restaurant, setRestaurant] =
    useState(() => {
      const savedRestaurant =
        localStorage.getItem(
          "restaurant"
        );

      return savedRestaurant
        ? JSON.parse(savedRestaurant)
        : null;
    });

  // ==========================================
  // AUTH LOADING
  // ==========================================

  const [loading, setLoading] =
    useState(true);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = (
    newToken,
    newUser,
    newRestaurant = null
  ) => {
    localStorage.setItem(
      "token",
      newToken
    );

    localStorage.setItem(
      "user",
      JSON.stringify(newUser)
    );

    if (newRestaurant) {
      localStorage.setItem(
        "restaurant",
        JSON.stringify(newRestaurant)
      );
    } else {
      localStorage.removeItem(
        "restaurant"
      );
    }

    setToken(newToken);
    setUser(newUser);
    setRestaurant(
      newRestaurant
    );
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "restaurant"
    );

    setToken(null);
    setUser(null);
    setRestaurant(null);
  };

  // ==========================================
  // REFRESH CURRENT USER
  // ==========================================

  const refreshUser = async () => {
    const savedToken =
      localStorage.getItem("token");

    if (!savedToken) {
      setLoading(false);
      return null;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/auth/me`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${savedToken}`,
          },
        }
      );

      // ==========================================
      // TOKEN INVALID / EXPIRED
      // ==========================================

      if (
        response.status === 401
      ) {
        logout();
        return null;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to load user"
        );
      }

      const data =
        await response.json();

      // ==========================================
      // SAVE USER
      // ==========================================

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        setUser(data.user);
      }

      // ==========================================
      // SAVE RESTAURANT
      // ==========================================

      if (data.restaurant) {
        localStorage.setItem(
          "restaurant",
          JSON.stringify(
            data.restaurant
          )
        );

        setRestaurant(
          data.restaurant
        );
      }

      return data;
    } catch (error) {
      console.error(
        "❌ Failed to refresh user:",
        error
      );

      return null;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD USER ON APP START
  // ==========================================

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // SUBSCRIPTION HELPERS
  // ==========================================

  const subscription =
    restaurant?.subscription || null;

  const subscriptionStatus =
    subscription?.status || null;

  const hasSubscription =
    Boolean(subscription);

  const isTrialing =
    subscriptionStatus ===
    "TRIALING";

  const isActive =
    subscriptionStatus ===
    "ACTIVE";

  const isExpired =
    subscriptionStatus ===
    "EXPIRED";

  const isCancelled =
    subscriptionStatus ===
    "CANCELLED";

  const hasActiveAccess =
    isTrialing ||
    isActive;

  // ==========================================
  // CONTEXT
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        restaurant,

        login,
        logout,

        refreshUser,

        loading,

        isAuthenticated:
          Boolean(token),

        // Subscription
        subscription,
        subscriptionStatus,

        hasSubscription,
        hasActiveAccess,

        isTrialing,
        isActive,
        isExpired,
        isCancelled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(
    AuthContext
  );
}