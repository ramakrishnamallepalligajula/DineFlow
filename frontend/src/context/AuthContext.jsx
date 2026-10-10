
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

function readStoredObject(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(
    () => readStoredObject("user")
  );

  const [restaurant, setRestaurant] = useState(
    () => readStoredObject("restaurant")
  );

  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem("token"))
  );

  // Prevent older requests from overwriting a newer login/session.
  const requestIdRef = useRef(0);

  const login = useCallback(
    (newToken, newUser, newRestaurant = null) => {
      // Invalidate all refresh requests already in progress.
      requestIdRef.current += 1;

      if (!newToken || !newUser?.role) {
        throw new Error("Invalid login response.");
      }

      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      if (newRestaurant) {
        localStorage.setItem(
          "restaurant",
          JSON.stringify(newRestaurant)
        );
      } else {
        localStorage.removeItem("restaurant");
      }

      setToken(newToken);
      setUser(newUser);
      setRestaurant(newRestaurant);
      setLoading(false);
    },
    []
  );

  const logout = useCallback(() => {
    // Prevent any in-flight request from restoring the old session.
    requestIdRef.current += 1;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");

    setToken(null);
    setUser(null);
    setRestaurant(null);
    setLoading(false);
  }, []);

  const updateSession = useCallback(
    (sessionUser, sessionRestaurant) => {
      if (sessionUser) {
        localStorage.setItem(
          "user",
          JSON.stringify(sessionUser)
        );
        setUser(sessionUser);
      }

      if (sessionRestaurant !== undefined) {
        if (sessionRestaurant) {
          localStorage.setItem(
            "restaurant",
            JSON.stringify(sessionRestaurant)
          );
        } else {
          localStorage.removeItem("restaurant");
        }

        setRestaurant(sessionRestaurant);
      }
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem("token");

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

      // Ignore this response if a newer session has started.
      if (
        requestId !== requestIdRef.current ||
        localStorage.getItem("token") !== savedToken
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

      if (!data?.user || !data.user.role) {
        throw new Error(
          "The server returned an invalid user session."
        );
      }

      // Check again before writing to storage.
      if (
        requestId !== requestIdRef.current ||
        localStorage.getItem("token") !== savedToken
      ) {
        return null;
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.restaurant) {
        localStorage.setItem(
          "restaurant",
          JSON.stringify(data.restaurant)
        );
      } else {
        localStorage.removeItem("restaurant");
      }

      setToken(savedToken);
      setUser(data.user);
      setRestaurant(data.restaurant ?? null);

      return data;
    } catch (error) {
      console.error("Failed to refresh user:", error);

      // Keep the existing session on temporary network/server errors.
      // Do not treat a network failure as proof that the token is invalid.
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [logout]);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  // Keep token state synchronized with other tabs logging in/out.
  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key !== "token" &&
        event.key !== "user" &&
        event.key !== "restaurant"
      ) {
        return;
      }

      requestIdRef.current += 1;

      const storedToken = localStorage.getItem("token");
      setToken(storedToken);
      setUser(readStoredObject("user"));
      setRestaurant(readStoredObject("restaurant"));

      if (storedToken) {
        setLoading(true);
        refreshUser();
      } else {
        setLoading(false);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshUser]);

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
