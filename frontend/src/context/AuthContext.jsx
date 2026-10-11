
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const AuthContext = createContext(null);

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// App authentication is isolated per browser tab.
const sessionStore = sessionStorage;

function readStoredObject(key) {
  try {
    const value = sessionStore.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    sessionStore.removeItem(key);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => sessionStore.getItem("token")
  );

  const [user, setUser] = useState(
    () => readStoredObject("user")
  );

  const [restaurant, setRestaurant] = useState(
    () => readStoredObject("restaurant")
  );

  const [loading, setLoading] = useState(
    () => Boolean(sessionStore.getItem("token"))
  );

  const requestIdRef = useRef(0);

  const login = useCallback(
    (newToken, newUser, newRestaurant = null) => {
      requestIdRef.current += 1;

      if (!newToken || !newUser?.role) {
        throw new Error("Invalid login response.");
      }

      sessionStore.setItem("token", newToken);
      sessionStore.setItem("user", JSON.stringify(newUser));

      if (newRestaurant) {
        sessionStore.setItem(
          "restaurant",
          JSON.stringify(newRestaurant)
        );
      } else {
        sessionStore.removeItem("restaurant");
      }

      setToken(newToken);
      setUser(newUser);
      setRestaurant(newRestaurant);
      setLoading(false);
    },
    []
  );

  const logout = useCallback(() => {
    requestIdRef.current += 1;

    sessionStore.removeItem("token");
    sessionStore.removeItem("user");
    sessionStore.removeItem("restaurant");

    setToken(null);
    setUser(null);
    setRestaurant(null);
    setLoading(false);
  }, []);

  const updateSession = useCallback(
    (sessionUser, sessionRestaurant) => {
      if (sessionUser) {
        sessionStore.setItem(
          "user",
          JSON.stringify(sessionUser)
        );
        setUser(sessionUser);
      }

      if (sessionRestaurant !== undefined) {
        if (sessionRestaurant) {
          sessionStore.setItem(
            "restaurant",
            JSON.stringify(sessionRestaurant)
          );
        } else {
          sessionStore.removeItem("restaurant");
        }

        setRestaurant(sessionRestaurant);
      }
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const savedToken = sessionStore.getItem("token");

    if (!savedToken) {
      requestIdRef.current += 1;
      setToken(null);
      setUser(null);
      setRestaurant(null);
      setLoading(false);
      return null;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (
        requestId !== requestIdRef.current ||
        sessionStore.getItem("token") !== savedToken
      ) {
        return null;
      }

      if (response.status === 401) {
        logout();
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Unable to validate session (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      if (!data?.user?.role) {
        throw new Error(
          "The server returned an invalid user session."
        );
      }

      if (
        requestId !== requestIdRef.current ||
        sessionStore.getItem("token") !== savedToken
      ) {
        return null;
      }

      sessionStore.setItem("user", JSON.stringify(data.user));

      if (data.restaurant) {
        sessionStore.setItem(
          "restaurant",
          JSON.stringify(data.restaurant)
        );
      } else {
        sessionStore.removeItem("restaurant");
      }

      setToken(savedToken);
      setUser(data.user);
      setRestaurant(data.restaurant ?? null);

      return data;
    } catch (error) {
      console.error("Failed to refresh user:", error);
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [logout]);

  useEffect(() => {
    if (sessionStore.getItem("token")) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  // Intentionally no cross-tab storage listener.

  const subscription = restaurant?.subscription || null;
  const subscriptionStatus = subscription?.status || null;

  const hasSubscription = Boolean(subscription);
  const isTrialing = subscriptionStatus === "TRIALING";
  const isActive = subscriptionStatus === "ACTIVE";
  const isExpired = subscriptionStatus === "EXPIRED";
  const isCancelled = subscriptionStatus === "CANCELLED";
  const hasActiveAccess = isTrialing || isActive;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        restaurant,
        login,
        logout,
        updateSession,
        refreshUser,
        loading,
        isAuthenticated: Boolean(token),
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
  return useContext(AuthContext);
}
