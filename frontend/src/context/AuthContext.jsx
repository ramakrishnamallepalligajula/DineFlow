/*import {
  createContext,
  useContext,
  useState,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [restaurant, setRestaurant] =
    useState(() => {
      const savedRestaurant =
        localStorage.getItem("restaurant");

      return savedRestaurant
        ? JSON.parse(savedRestaurant)
        : null;
    });

  const login = (
    token,
    user,
    restaurant = null
  ) => {
    localStorage.setItem(
      "token",
      token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    if (restaurant) {
      localStorage.setItem(
        "restaurant",
        JSON.stringify(restaurant)
      );
    } else {
      localStorage.removeItem(
        "restaurant"
      );
    }

    setToken(token);
    setUser(user);
    setRestaurant(restaurant);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");

    setToken(null);
    setUser(null);
    setRestaurant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        restaurant,
        login,
        logout,
        isAuthenticated:
          Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}*/

import {
  createContext,
  useContext,
  useState,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [restaurant, setRestaurant] = useState(() => {
    const savedRestaurant =
      localStorage.getItem("restaurant");

    return savedRestaurant
      ? JSON.parse(savedRestaurant)
      : null;
  });

  const login = (
    token,
    user,
    restaurant = null
  ) => {
    localStorage.setItem("token", token);

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    if (restaurant) {
      localStorage.setItem(
        "restaurant",
        JSON.stringify(restaurant)
      );
    } else {
      localStorage.removeItem("restaurant");
    }

    setToken(token);
    setUser(user);
    setRestaurant(restaurant);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");

    setToken(null);
    setUser(null);
    setRestaurant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        restaurant,
        login,
        logout,
        isAuthenticated: Boolean(token),
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