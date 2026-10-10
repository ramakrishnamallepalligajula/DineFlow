
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  ChefHat,
  Armchair,
  UtensilsCrossed,
  Users,
  ReceiptText,
  Settings,
  RefreshCw,
  LogOut,
  Wallet,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./AdminNavigation.css";

function AdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout, user, restaurant } = useAuth();

  const currentPath = location.pathname;
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  const isActive = (path) => currentPath === path;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const iconProps = {
    size: 19,
    strokeWidth: 1.8,
    "aria-hidden": true,
  };

  const renderIcon = (Icon) => <Icon {...iconProps} />;

  const homePath = isAdmin ? "/admin" : "/kitchen";

  return (
    <aside className="admin-navigation">
      {/* RESTAURANT BRAND */}
      <div
        className="admin-navigation-brand"
        onClick={() => navigate(homePath)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(homePath);
          }
        }}
      >
        <div className="admin-navigation-brand-icon">
          {renderIcon(UtensilsCrossed)}
        </div>

        <div className="admin-navigation-brand-text">
          <h1>{restaurant?.name || "Your Restaurant"}</h1>
          <span>Restaurant OS</span>
        </div>
      </div>

      <div className="admin-navigation-content">
        {/* MAIN */}
        {isAdmin && (
          <div className="admin-navigation-section">
            <div className="admin-navigation-section-title">
              MAIN
            </div>

            <nav className="admin-navigation-menu">
              <button
                data-tour="dashboard"
                className={`admin-navigation-item ${
                  isActive("/admin") ? "active" : ""
                }`}
                onClick={() => navigate("/admin")}
              >
                <span className="admin-navigation-icon">
                  {renderIcon(LayoutDashboard)}
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
              data-tour="kitchen"
              className={`admin-navigation-item ${
                isActive("/kitchen") ? "active" : ""
              }`}
              onClick={() => navigate("/kitchen")}
            >
              <span className="admin-navigation-icon">
                {renderIcon(ChefHat)}
              </span>
              <span className="admin-navigation-label">
                Kitchen
              </span>
            </button>

            {/* STAFF CASH PAYMENTS */}
            {isStaff && (
              <button
                className={`admin-navigation-item ${
                  isActive("/cash-payments") ? "active" : ""
                }`}
                onClick={() => navigate("/cash-payments")}
              >
                <span className="admin-navigation-icon">
                  {renderIcon(Wallet)}
                </span>
                <span className="admin-navigation-label">
                  Cash Payments
                </span>
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  data-tour="tables"
                  className={`admin-navigation-item ${
                    isActive("/tables") ? "active" : ""
                  }`}
                  onClick={() => navigate("/tables")}
                >
                  <span className="admin-navigation-icon">
                    {renderIcon(Armchair)}
                  </span>
                  <span className="admin-navigation-label">
                    Tables
                  </span>
                </button>

                <button
                  data-tour="menu"
                  className={`admin-navigation-item ${
                    isActive("/foods") ? "active" : ""
                  }`}
                  onClick={() => navigate("/foods")}
                >
                  <span className="admin-navigation-icon">
                    {renderIcon(UtensilsCrossed)}
                  </span>
                  <span className="admin-navigation-label">
                    Menu
                  </span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* BUSINESS — ADMIN ONLY */}
        {isAdmin && (
          <div className="admin-navigation-section">
            <div className="admin-navigation-section-title">
              BUSINESS
            </div>

            <nav className="admin-navigation-menu">
              <button
                data-tour="staff"
                className={`admin-navigation-item ${
                  isActive("/staff") ? "active" : ""
                }`}
                onClick={() => navigate("/staff")}
              >
                <span className="admin-navigation-icon">
                  {renderIcon(Users)}
                </span>
                <span className="admin-navigation-label">
                  Staff
                </span>
              </button>

              <button
                data-tour="bill-history"
                className={`admin-navigation-item ${
                  isActive("/bill-history") ? "active" : ""
                }`}
                onClick={() => navigate("/bill-history")}
              >
                <span className="admin-navigation-icon">
                  {renderIcon(ReceiptText)}
                </span>
                <span className="admin-navigation-label">
                  Bill History
                </span>
              </button>

              <button
                data-tour="settings"
                className={`admin-navigation-item ${
                  isActive("/settings") ? "active" : ""
                }`}
                onClick={() => navigate("/settings")}
              >
                <span className="admin-navigation-icon">
                  {renderIcon(Settings)}
                </span>
                <span className="admin-navigation-label">
                  Settings
                </span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* BOTTOM AREA */}
      <div className="admin-navigation-bottom">
        <button
          className="admin-navigation-bottom-item"
          onClick={() => window.location.reload()}
        >
          <span className="admin-navigation-bottom-icon">
            {renderIcon(RefreshCw)}
          </span>
          <span>Refresh</span>
        </button>

        <div className="admin-navigation-user">
          <div className="admin-navigation-user-avatar">
            {user?.name
              ? user.name.charAt(0).toUpperCase()
              : isStaff
                ? "S"
                : "A"}
          </div>

          <div className="admin-navigation-user-info">
            <strong>
              {user?.name ||
                (isStaff ? "Restaurant Staff" : "Restaurant Admin")}
            </strong>
            <span>{isAdmin ? "Administrator" : "Staff Member"}</span>
          </div>
        </div>

        <button
          className="admin-navigation-logout"
          onClick={handleLogout}
        >
          <span>{renderIcon(LogOut)}</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default AdminNavigation;
