import { useEffect, useState } from "react";
import AdminNavigation from "../components/AdminNavigation";
import { useAuth } from "../context/AuthContext";

function RestaurantSettings() {
  const { token } = useAuth();

  const [restaurant, setRestaurant] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  // ==========================================
  // LOAD RESTAURANT
  // ==========================================

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/restaurants/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load restaurant"
          );
        }

        setRestaurant(data.restaurant);

        setFormData({
          name: data.restaurant.name || "",
          email: data.restaurant.email || "",
          phone: data.restaurant.phone || "",
          address: data.restaurant.address || "",
        });
      } catch (error) {
        console.error(
          "❌ Failed to load restaurant:",
          error
        );

        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadRestaurant();
    }
  }, [API_URL, token]);

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  // ==========================================
  // SAVE RESTAURANT
  // ==========================================

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/restaurants/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update restaurant"
        );
      }

      setRestaurant(data.restaurant);

      setFormData({
        name: data.restaurant.name || "",
        email: data.restaurant.email || "",
        phone: data.restaurant.phone || "",
        address: data.restaurant.address || "",
      });

      setSuccess(
        "Restaurant details updated successfully."
      );
    } catch (error) {
      console.error(
        "❌ Failed to update restaurant:",
        error
      );

      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <>
        <AdminNavigation />

        <div style={styles.container}>
          <div style={styles.card}>
            <h2>Loading restaurant...</h2>
          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <>
      <AdminNavigation />

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Restaurant Settings
            </h1>

            <p style={styles.subtitle}>
              Manage your restaurant information
            </p>
          </div>
        </div>

        <div style={styles.card}>

          {/* =========================
              RESTAURANT INFORMATION
          ========================= */}

          <h2 style={styles.sectionTitle}>
            Restaurant Information
          </h2>

          <form onSubmit={handleSave}>

            {/* RESTAURANT NAME */}

            <div style={styles.field}>
              <label style={styles.label}>
                Restaurant Name
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter restaurant name"
                style={styles.input}
                required
              />
            </div>

            {/* EMAIL */}

            <div style={styles.field}>
              <label style={styles.label}>
                Restaurant Email
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                style={{
                  ...styles.input,
                  ...styles.disabledInput,
                }}
                disabled
              />

              <p style={styles.helpText}>
                Email cannot be changed from this page.
              </p>
            </div>

            {/* PHONE */}

            <div style={styles.field}>
              <label style={styles.label}>
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                style={styles.input}
              />
            </div>

            {/* ADDRESS */}

            <div style={styles.field}>
              <label style={styles.label}>
                Address
              </label>

              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter restaurant address"
                rows="4"
                style={styles.textarea}
              />
            </div>

            {/* ERROR */}

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div style={styles.success}>
                {success}
              </div>
            )}

            {/* SAVE */}

            <button
              type="submit"
              disabled={saving}
              style={styles.button}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </form>
        </div>

        {/* =========================
            SUBSCRIPTION
        ========================= */}

        {restaurant && (
          <div style={styles.card}>

            <h2 style={styles.sectionTitle}>
              Subscription
            </h2>

            <div style={styles.subscriptionGrid}>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>
                  Current Plan
                </span>

                <strong style={styles.infoValue}>
                  {restaurant.plan || "Free"}
                </strong>
              </div>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>
                  Subscription Status
                </span>

                <strong style={styles.infoValue}>
                  {restaurant.subscriptionStatus ||
                    "Active"}
                </strong>
              </div>

            </div>

            <p style={styles.subscriptionNote}>
              Subscription management will be available
              here after billing is connected.
            </p>

          </div>
        )}

      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 80px)",
    padding: "32px",
    background: "#f5f7fb",
  },

  header: {
    maxWidth: "1000px",
    margin: "0 auto 24px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    marginTop: "8px",
    color: "#666",
  },

  card: {
    maxWidth: "1000px",
    margin: "0 auto 24px",
    background: "#ffffff",
    padding: "28px",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "24px",
    fontSize: "21px",
  },

  field: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #d6d9df",
    borderRadius: "8px",
    fontSize: "15px",
    outline: "none",
  },

  disabledInput: {
    background: "#f1f3f5",
    color: "#777",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #d6d9df",
    borderRadius: "8px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
  },

  helpText: {
    marginTop: "6px",
    marginBottom: 0,
    fontSize: "13px",
    color: "#777",
  },

  error: {
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "8px",
    background: "#ffe5e5",
    color: "#c62828",
  },

  success: {
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "8px",
    background: "#e7f7ed",
    color: "#218838",
  },

  button: {
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  subscriptionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },

  infoBox: {
    padding: "18px",
    border: "1px solid #e1e4e8",
    borderRadius: "10px",
    background: "#fafafa",
  },

  infoLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#666",
    fontSize: "14px",
  },

  infoValue: {
    fontSize: "18px",
    textTransform: "capitalize",
  },

  subscriptionNote: {
    marginTop: "18px",
    color: "#777",
    fontSize: "14px",
  },
};

export default RestaurantSettings;