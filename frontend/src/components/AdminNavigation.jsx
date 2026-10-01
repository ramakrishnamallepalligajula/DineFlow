import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./AdminNavigation.css";

function AdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    logout,
    user,
    restaurant,
  } = useAuth();
  const isStaff = user?.role === "staff";

  const currentPath =
    location.pathname;
  
    const isAdmin = user?.role === "admin";

  const isActive = (path) => {
    return currentPath === path;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="admin-navigation">

      {/* =========================
          RESTAURANT BRAND
      ========================= */}

      <div
        className="admin-navigation-brand"
        onClick={() =>
          navigate("/admin")
        }
      >

        <div className="admin-navigation-brand-icon">
          🍽️
        </div>

        <div className="admin-navigation-brand-text">

          <h1>
            {restaurant?.name ||
              "Your Restaurant"}
          </h1>

          <span>
            Restaurant OS
          </span>

        </div>

      </div>

      {/* =========================
          MAIN NAVIGATION
      ========================= */}

      <div className="admin-navigation-content">

        {/* MAIN */}

        {isAdmin && (
  <div className="admin-navigation-section">

    <div className="admin-navigation-section-title">
      MAIN
    </div>

    <nav className="admin-navigation-menu">

      <button
        className={`admin-navigation-item ${
          isActive("/admin")
            ? "active"
            : ""
        }`}
        onClick={() =>
          navigate("/admin")
        }
      >
        <span className="admin-navigation-icon">
          📊
        </span>

        <span className="admin-navigation-label">
          Dashboard
        </span>
      </button>

    </nav>

  </div>
)}

        {/* OPERATIONS */}

        <div className="admin-navigation-section">

          <div className="admin-navigation-section-title">
            OPERATIONS
          </div>

          <nav className="admin-navigation-menu">

            <button
              className={`admin-navigation-item ${
                isActive("/kitchen")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/kitchen")
              }
            >
              <span className="admin-navigation-icon">
                👨‍🍳
              </span>

              <span className="admin-navigation-label">
                Kitchen
              </span>
            </button>
          {isAdmin && (
            <button
              className={`admin-navigation-item ${
                isActive("/tables")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/tables")
              }
            >
              <span className="admin-navigation-icon">
                🪑
              </span>

              <span className="admin-navigation-label">
                Tables
              </span>
            </button>
          )}

          {isAdmin && (
            <button
              className={`admin-navigation-item ${
                isActive("/foods")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/foods")
              }
            >
              <span className="admin-navigation-icon">
                🍔
              </span>

              <span className="admin-navigation-label">
                Menu
              </span>
            </button>
          )}

          </nav>

        </div>

        {/* BUSINESS */}

      {isAdmin && (
        <div className="admin-navigation-section">

          <div className="admin-navigation-section-title">
            BUSINESS
          </div>

          <nav className="admin-navigation-menu">
            <button
              className={`admin-navigation-item ${
              isActive("/staff")
              ? "active"
              : ""
              }`}
              onClick={() =>
              navigate("/staff")
              }>
              <span className="admin-navigation-icon">
              👥
              </span>

              <span className="admin-navigation-label">
              Staff
              </span>
            </button>

          {!isStaff && (
            <button
              className="admin-navigation-item"
              onClick={() =>
                navigate("/admin")
              }
            >
              <span className="admin-navigation-icon">
                📈
              </span>

              <span className="admin-navigation-label">
                Reports
              </span>
            </button>

            )}

            <button
              className={`admin-navigation-item ${
                isActive("/settings")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/settings")
              }
            >
              <span className="admin-navigation-icon">
                ⚙️
              </span>

              <span className="admin-navigation-label">
                Settings
              </span>
            </button>

          </nav>

        </div>

      )}

      </div>

      {/* =========================
          BOTTOM AREA
      ========================= */}

      <div className="admin-navigation-bottom">

        {/* REFRESH */}

        <button
          className="admin-navigation-bottom-item"
          onClick={() =>
            window.location.reload()
          }
        >
          <span className="admin-navigation-bottom-icon">
            ↻
          </span>

          <span>
            Refresh
          </span>
        </button>

        {/* USER */}

        <div className="admin-navigation-user">

          <div className="admin-navigation-user-avatar">
            {user?.name
              ? user.name
                  .charAt(0)
                  .toUpperCase()
              : "A"}
          </div>

          <div className="admin-navigation-user-info">

            <strong>
              {user?.name ||
                "Restaurant Admin"}
            </strong>

            <span>
              Administrator
            </span>

          </div>

        </div>

        {/* LOGOUT */}

        <button
          className="admin-navigation-logout"
          onClick={handleLogout}
        >
          <span>
            ↪
          </span>

          Logout
        </button>

      </div>
    </aside>
  );
}

export default AdminNavigation;