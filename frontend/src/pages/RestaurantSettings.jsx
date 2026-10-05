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
    gstEnabled: false,
    gstRate: 5,
    gstin: "",
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

          gstEnabled:
            data.restaurant.taxSettings?.gstEnabled ===
            true,

          gstRate:
            data.restaurant.taxSettings?.gstRate ??
            5,

          gstin:
            data.restaurant.taxSettings?.gstin || "",
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
  // HANDLE GST TOGGLE
  // ==========================================

  const handleGstToggle = () => {
    setFormData((currentData) => ({
      ...currentData,
      gstEnabled: !currentData.gstEnabled,
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

            taxSettings: {
              gstEnabled: formData.gstEnabled,
              gstRate: Number(formData.gstRate),
              gstin: formData.gstin.trim().toUpperCase(),
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update restaurant"
        );
      }

      setRestaurant(data.restaurant);

      setFormData({
        name: data.restaurant.name || "",
        email: data.restaurant.email || "",
        phone: data.restaurant.phone || "",
        address: data.restaurant.address || "",

        gstEnabled:
          data.restaurant.taxSettings?.gstEnabled ===
          true,

        gstRate:
          data.restaurant.taxSettings?.gstRate ??
          5,

        gstin:
          data.restaurant.taxSettings?.gstin || "",
      });

      setSuccess(
        "Restaurant settings updated successfully."
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
              Manage your restaurant information,
              tax and billing settings
            </p>
          </div>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleSave}>

            {/* =========================
                RESTAURANT INFORMATION
            ========================= */}

            <h2 style={styles.sectionTitle}>
              Restaurant Information
            </h2>

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

            {/* =========================
                GST SETTINGS
            ========================= */}

            <div style={styles.divider} />

            <h2 style={styles.sectionTitle}>
              GST & Billing Settings
            </h2>

            <p style={styles.sectionDescription}>
              Configure GST details used for customer
              bills and printed receipts.
            </p>

            {/* GST ENABLE */}

            <div style={styles.gstToggleBox}>
              <div>
                <div style={styles.gstTitle}>
                  Enable GST
                </div>

                <div style={styles.gstDescription}>
                  Include GST in customer bills and
                  receipts.
                </div>
              </div>

              <button
                type="button"
                onClick={handleGstToggle}
                style={{
                  ...styles.toggle,
                  ...(formData.gstEnabled
                    ? styles.toggleOn
                    : styles.toggleOff),
                }}
                aria-label="Toggle GST"
              >
                <span
                  style={{
                    ...styles.toggleCircle,
                    ...(formData.gstEnabled
                      ? styles.toggleCircleOn
                      : styles.toggleCircleOff),
                  }}
                />
              </button>
            </div>

            {/* GST RATE */}

            <div style={styles.field}>
              <label style={styles.label}>
                GST Rate (%)
              </label>

              <input
                type="number"
                name="gstRate"
                value={formData.gstRate}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="5"
                style={{
                  ...styles.input,
                  ...(formData.gstEnabled
                    ? {}
                    : styles.disabledInput),
                }}
                disabled={!formData.gstEnabled}
              />

              <p style={styles.helpText}>
                Example: 5 for 5% GST.
              </p>
            </div>

            {/* GSTIN */}

            <div style={styles.field}>
              <label style={styles.label}>
                GSTIN
              </label>

              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="Enter GSTIN"
                maxLength="15"
                style={{
                  ...styles.input,
                  textTransform: "uppercase",
                  ...(formData.gstEnabled
                    ? {}
                    : styles.disabledInput),
                }}
                disabled={!formData.gstEnabled}
              />

              <p style={styles.helpText}>
                Your 15-character GST Identification
                Number. It will appear on printed bills.
              </p>
            </div>

            {/* GST PREVIEW */}

            {formData.gstEnabled && (
              <div style={styles.gstPreview}>
                <strong>
                  Billing Example
                </strong>

                <p>
                  If the customer pays ₹220 including{" "}
                  {formData.gstRate || 0}% GST:
                </p>

                <div style={styles.previewRow}>
                  <span>Subtotal</span>
                  <span>
                    ₹
                    {(
                      220 /
                      (1 +
                        Number(formData.gstRate || 0) /
                          100)
                    ).toFixed(2)}
                  </span>
                </div>

                <div style={styles.previewRow}>
                  <span>
                    CGST{" "}
                    {Number(
                      formData.gstRate || 0
                    ) / 2}
                    %
                  </span>

                  <span>
                    ₹
                    {(
                      (220 /
                        (1 +
                          Number(
                            formData.gstRate || 0
                          ) /
                            100)) *
                      (Number(
                        formData.gstRate || 0
                      ) /
                        2 /
                        100)
                    ).toFixed(2)}
                  </span>
                </div>

                <div style={styles.previewRow}>
                  <span>
                    SGST{" "}
                    {Number(
                      formData.gstRate || 0
                    ) / 2}
                    %
                  </span>

                  <span>
                    ₹
                    {(
                      (220 /
                        (1 +
                          Number(
                            formData.gstRate || 0
                          ) /
                            100)) *
                      (Number(
                        formData.gstRate || 0
                      ) /
                        2 /
                        100)
                    ).toFixed(2)}
                  </span>
                </div>

                <div
                  style={{
                    ...styles.previewRow,
                    ...styles.previewTotal,
                  }}
                >
                  <strong>Total</strong>
                  <strong>₹220.00</strong>
                </div>
              </div>
            )}

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
    marginBottom: "12px",
    fontSize: "21px",
  },

  sectionDescription: {
    marginTop: 0,
    marginBottom: "24px",
    color: "#666",
    fontSize: "14px",
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
    cursor: "not-allowed",
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

  divider: {
    height: "1px",
    background: "#e5e7eb",
    margin: "32px 0",
  },

  gstToggleBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px",
    marginBottom: "24px",
    border: "1px solid #e1e4e8",
    borderRadius: "10px",
    background: "#fafafa",
  },

  gstTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "4px",
  },

  gstDescription: {
    fontSize: "13px",
    color: "#777",
  },

  toggle: {
    position: "relative",
    width: "52px",
    height: "30px",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    padding: 0,
    transition: "background 0.2s ease",
  },

  toggleOn: {
    background: "#16a34a",
  },

  toggleOff: {
    background: "#cbd5e1",
  },

  toggleCircle: {
    position: "absolute",
    top: "4px",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "#ffffff",
    transition: "left 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },

  toggleCircleOn: {
    left: "26px",
  },

  toggleCircleOff: {
    left: "4px",
  },

  gstPreview: {
    marginBottom: "24px",
    padding: "18px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  previewRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "7px 0",
    fontSize: "14px",
  },

  previewTotal: {
    marginTop: "8px",
    paddingTop: "12px",
    borderTop: "1px solid #d1d5db",
    fontSize: "15px",
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