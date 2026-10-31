
import { useEffect, useMemo, useRef, useState } from "react";
import AdminNavigation from "../components/AdminNavigation";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function RestaurantSettings() {
  const { token } = useAuth();
  const fileInputRef = useRef(null);

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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Illustrative GST calculation using GST added to subtotal.
  const preview = useMemo(() => {
    const subtotal = 220;
    const rate = formData.gstEnabled
      ? Number(formData.gstRate) || 0
      : 0;

    const tax = subtotal * (rate / 100);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [formData.gstEnabled, formData.gstRate]);

  // ==========================================
  // LOAD RESTAURANT
  // ==========================================

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load restaurant settings."
          );
        }

        const currentRestaurant = data.restaurant;

        setRestaurant(currentRestaurant);

        setFormData({
          name: currentRestaurant.name || "",
          email: currentRestaurant.email || "",
          phone: currentRestaurant.phone || "",
          address: currentRestaurant.address || "",

          gstEnabled:
            currentRestaurant.taxSettings?.gstEnabled === true,

          gstRate:
            currentRestaurant.taxSettings?.gstRate ?? 5,

          gstin:
            currentRestaurant.taxSettings?.gstin || "",
        });
      } catch (err) {
        console.error("Failed to load restaurant:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [token]);

  // ==========================================
  // INPUT HANDLING
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleGstToggle = () => {
    setFormData((current) => ({
      ...current,
      gstEnabled: !current.gstEnabled,
    }));
  };

  // ==========================================
  // SAVE RESTAURANT SETTINGS
  // ==========================================

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    if (
      formData.gstEnabled &&
      (!Number.isFinite(Number(formData.gstRate)) ||
        Number(formData.gstRate) < 0 ||
        Number(formData.gstRate) > 100)
    ) {
      setError("Please enter a valid GST rate between 0 and 100.");
      return;
    }

    if (
      formData.gstEnabled &&
      formData.gstin.trim() &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        formData.gstin.trim().toUpperCase()
      )
    ) {
      setError("Please enter a valid 15-character GSTIN.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/restaurants/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),

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
          data.message || "Failed to update restaurant settings."
        );
      }

      setRestaurant((current) => ({
        ...current,
        ...data.restaurant,
      }));

      setSuccess("Restaurant settings saved successfully.");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // RESTAURANT LOGO UPLOAD
  // ==========================================

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, WEBP or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Logo image must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingLogo(true);

      const uploadData = new FormData();
      uploadData.append("logo", file);

      const response = await fetch(
        `${API_URL}/api/uploads/restaurant-logo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to upload restaurant logo."
        );
      }

      const updatedLogo = data.logo;

      setRestaurant((current) => ({
        ...current,
        logo: updatedLogo,
      }));

      setSuccess("Restaurant logo uploaded successfully.");
    } catch (err) {
      console.error("Logo upload failed:", err);
      setError(err.message);
    } finally {
      setUploadingLogo(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <>
        <AdminNavigation />

        <main className="rs-page">
          <div className="rs-loading">
            <div className="rs-spinner" />
            <p>Loading restaurant settings...</p>
          </div>
        </main>

        <style>{pageStyles}</style>
      </>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <>
      <AdminNavigation />

      <main className="rs-page">
        <div className="rs-content">

          {/* PAGE HEADER */}

          <header className="rs-header">
            <div>
              <div className="rs-eyebrow">
                RESTAURANT MANAGEMENT
              </div>

              <h1>Restaurant Settings</h1>

              <p>
                Manage your restaurant profile, branding and billing
                preferences.
              </p>
            </div>

            <div className="rs-header-icon">
              <span>⚙</span>
            </div>
          </header>

          {/* ALERTS */}

          {error && (
            <div className="rs-alert rs-alert-error">
              <span>!</span>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="rs-alert rs-alert-success">
              <span>✓</span>
              <p>{success}</p>
              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Dismiss success"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSave}>

            {/* RESTAURANT BRANDING */}

            <section className="rs-card">
              <div className="rs-card-heading">
                <div className="rs-heading-icon rs-blue">
                  <span>▣</span>
                </div>

                <div>
                  <h2>Restaurant Branding</h2>
                  <p>
                    Add your restaurant logo for printed customer bills.
                  </p>
                </div>
              </div>

              <div className="rs-logo-area">
                <div className="rs-logo-preview">
                  {restaurant?.logo?.url ? (
                    <img
                      src={restaurant.logo.url}
                      alt="Restaurant logo"
                    />
                  ) : (
                    <div className="rs-logo-placeholder">
                      <span>▧</span>
                      <small>Your logo</small>
                    </div>
                  )}
                </div>

                <div className="rs-logo-details">
                  <h3>Restaurant Logo</h3>

                  <p>
                    Upload a clear logo. It will appear at the top
                    of your printed customer bills.
                  </p>

                  <div className="rs-logo-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleLogoUpload}
                      hidden
                    />

                    <button
                      type="button"
                      className="rs-secondary-button"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingLogo
                        ? "Uploading..."
                        : restaurant?.logo?.url
                          ? "Replace Logo"
                          : "Upload Logo"}
                    </button>

                    <span className="rs-file-hint">
                      PNG, JPG, WEBP or GIF · Max 10 MB
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* RESTAURANT INFORMATION */}

            <section className="rs-card">
              <div className="rs-card-heading">
                <div className="rs-heading-icon rs-purple">
                  <span>⌂</span>
                </div>

                <div>
                  <h2>Restaurant Information</h2>
                  <p>
                    Keep your restaurant contact details up to date.
                  </p>
                </div>
              </div>

              <div className="rs-form-grid">
                <div className="rs-field">
                  <label htmlFor="restaurant-name">
                    Restaurant Name <span>*</span>
                  </label>

                  <input
                    id="restaurant-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter restaurant name"
                    required
                  />
                </div>

                <div className="rs-field">
                  <label htmlFor="restaurant-email">
                    Restaurant Email
                  </label>

                  <input
                    id="restaurant-email"
                    type="email"
                    value={formData.email}
                    disabled
                  />

                  <small>
                    Contact support if you need to change this email.
                  </small>
                </div>

                <div className="rs-field">
                  <label htmlFor="restaurant-phone">
                    Phone Number
                  </label>

                  <input
                    id="restaurant-phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="rs-field rs-full-width">
                  <label htmlFor="restaurant-address">
                    Restaurant Address
                  </label>

                  <textarea
                    id="restaurant-address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter complete restaurant address"
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* GST SETTINGS */}

            <section className="rs-card">
              <div className="rs-card-heading">
                <div className="rs-heading-icon rs-green">
                  <span>₹</span>
                </div>

                <div>
                  <h2>GST & Billing Settings</h2>
                  <p>
                    Configure the tax details used for customer bills.
                  </p>
                </div>
              </div>

              <div className="rs-gst-toggle">
                <div>
                  <h3>Enable GST</h3>
                  <p>
                    Add GST to customer bills when enabled.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.gstEnabled}
                  aria-label="Enable GST"
                  className={`rs-switch ${
                    formData.gstEnabled ? "rs-switch-on" : ""
                  }`}
                  onClick={handleGstToggle}
                >
                  <span />
                </button>
              </div>

              {formData.gstEnabled ? (
                <div className="rs-form-grid rs-gst-fields">
                  <div className="rs-field">
                    <label htmlFor="gst-rate">
                      GST Rate (%)
                    </label>

                    <div className="rs-input-suffix">
                      <input
                        id="gst-rate"
                        type="number"
                        name="gstRate"
                        value={formData.gstRate}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span>%</span>
                    </div>

                    <small>
                      Enter the applicable GST rate for your restaurant.
                    </small>
                  </div>

                  <div className="rs-field">
                    <label htmlFor="gstin">
                      GST Identification Number (GSTIN)
                    </label>

                    <input
                      id="gstin"
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="Enter your 15-character GSTIN"
                      maxLength={15}
                      style={{ textTransform: "uppercase" }}
                    />

                    <small>
                      Your registered 15-character GSTIN.
                    </small>
                  </div>
                </div>
              ) : (
                <div className="rs-gst-disabled">
                  GST is currently disabled. Customer bills will not
                  include GST.
                </div>
              )}

              {/* GST PREVIEW */}

              {formData.gstEnabled && (
                <div className="rs-preview">
                  <div className="rs-preview-heading">
                    <div>
                      <h3>Bill Preview</h3>
                      <p>Illustrative calculation</p>
                    </div>

                    <span className="rs-preview-tag">
                      GST Added
                    </span>
                  </div>

                  <div className="rs-preview-body">
                    <div className="rs-preview-row">
                      <span>Subtotal</span>
                      <strong>
                        ₹{preview.subtotal.toFixed(2)}
                      </strong>
                    </div>

                    <div className="rs-preview-row">
                      <span>
                        GST ({Number(formData.gstRate || 0)}%)
                      </span>
                      <strong>
                        ₹{preview.tax.toFixed(2)}
                      </strong>
                    </div>

                    <div className="rs-preview-total">
                      <span>Total Amount</span>
                      <strong>
                        ₹{preview.total.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <p className="rs-preview-note">
                    This is an example using a ₹220 subtotal.
                    Actual tax treatment and applicable GST rate must
                    be verified for your restaurant. The final bill
                    will determine the applicable tax type from the
                    restaurant and customer jurisdiction where supported.
                  </p>
                </div>
              )}
            </section>

            {/* SAVE ACTIONS */}

            <div className="rs-footer">
              <p>
                <span>✓</span> Your changes are saved to your restaurant
                profile.
              </p>

              <button
                type="submit"
                className="rs-save-button"
                disabled={saving || uploadingLogo}
              >
                {saving ? (
                  "Saving Changes..."
                ) : (
                  <>
                    <span>✓</span> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <style>{pageStyles}</style>
    </>
  );
}

const pageStyles = `
  .rs-page {
    min-height: calc(100vh - 70px);
    padding: 38px 28px 60px;
    background: #f5f7fb;
    color: #182230;
    box-sizing: border-box;
  }

  .rs-content {
    max-width: 1050px;
    margin: 0 auto;
  }

  .rs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
  }

  .rs-eyebrow {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .rs-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
    letter-spacing: -0.8px;
  }

  .rs-header p {
    margin: 9px 0 0;
    color: #788496;
    font-size: 14px;
  }

  .rs-header-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    background: #eaf1ff;
    border-radius: 15px;
    color: #3767d6;
    font-size: 24px;
  }

  .rs-card {
    padding: 27px 30px;
    margin-bottom: 20px;
    background: #fff;
    border: 1px solid #e9edf3;
    border-radius: 15px;
    box-shadow: 0 3px 12px rgba(22, 34, 51, 0.035);
  }

  .rs-card-heading {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 22px;
    margin-bottom: 23px;
    border-bottom: 1px solid #edf0f4;
  }

  .rs-heading-icon {
    flex: 0 0 43px;
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 700;
  }

  .rs-blue {
    background: #edf3ff;
    color: #4775dc;
  }

  .rs-purple {
    background: #f2edff;
    color: #8661d5;
  }

  .rs-green {
    background: #e9f8ef;
    color: #269b59;
  }

  .rs-card-heading h2 {
    margin: 0;
    color: #1d2939;
    font-size: 17px;
    font-weight: 750;
  }

  .rs-card-heading p {
    margin: 5px 0 0;
    color: #8792a2;
    font-size: 13px;
  }

  .rs-logo-area {
    display: flex;
    align-items: center;
    gap: 23px;
  }

  .rs-logo-preview {
    flex: 0 0 125px;
    width: 125px;
    height: 105px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
  }

  .rs-logo-preview img {
    width: 100%;
    height: 100%;
    padding: 8px;
    object-fit: contain;
    box-sizing: border-box;
  }

  .rs-logo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    color: #a1adbd;
  }

  .rs-logo-placeholder span {
    font-size: 30px;
  }

  .rs-logo-placeholder small {
    font-size: 11px;
  }

  .rs-logo-details h3,
  .rs-gst-toggle h3 {
    margin: 0;
    color: #263346;
    font-size: 14px;
    font-weight: 700;
  }

  .rs-logo-details p,
  .rs-gst-toggle p {
    margin: 7px 0 12px;
    color: #8993a2;
    font-size: 13px;
    line-height: 1.6;
  }

  .rs-logo-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .rs-secondary-button {
    padding: 10px 16px;
    color: #3768d6;
    background: #fff;
    border: 1px solid #b9cdfa;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .rs-secondary-button:hover {
    background: #f2f6ff;
  }

  .rs-secondary-button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .rs-file-hint {
    color: #929baa;
    font-size: 11px;
  }

  .rs-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 24px;
  }

  .rs-field {
    min-width: 0;
  }

  .rs-full-width {
    grid-column: 1 / -1;
  }

  .rs-field label {
    display: block;
    margin-bottom: 9px;
    color: #344054;
    font-size: 13px;
    font-weight: 700;
  }

  .rs-field label span {
    color: #e05252;
  }

  .rs-field input,
  .rs-field textarea {
    width: 100%;
    min-height: 43px;
    padding: 11px 13px;
    box-sizing: border-box;
    color: #253247;
    background: #fff;
    border: 1px solid #dce2eb;
    border-radius: 8px;
    outline: none;
    font-family: inherit;
    font-size: 13px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .rs-field textarea {
    min-height: 85px;
    resize: vertical;
    line-height: 1.5;
  }

  .rs-field input:focus,
  .rs-field textarea:focus {
    border-color: #6d91e9;
    box-shadow: 0 0 0 3px rgba(75, 117, 218, 0.10);
  }

  .rs-field input:disabled {
    color: #8993a2;
    background: #f5f7fa;
    cursor: not-allowed;
  }

  .rs-field small {
    display: block;
    margin-top: 7px;
    color: #98a1ae;
    font-size: 11px;
    line-height: 1.5;
  }

  .rs-gst-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 17px 19px;
    margin-bottom: 24px;
    background: #f8fafc;
    border: 1px solid #edf0f4;
    border-radius: 10px;
  }

  .rs-gst-toggle p {
    margin-bottom: 0;
  }

  .rs-switch {
    position: relative;
    flex: 0 0 48px;
    width: 48px;
    height: 27px;
    padding: 0;
    background: #cbd3df;
    border: none;
    border-radius: 30px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .rs-switch span {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 21px;
    height: 21px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.16);
    transition: transform 0.2s;
  }

  .rs-switch-on {
    background: #27a968;
  }

  .rs-switch-on span {
    transform: translateX(21px);
  }

  .rs-gst-fields {
    margin-bottom: 23px;
  }

  .rs-input-suffix {
    position: relative;
  }

  .rs-input-suffix input {
    padding-right: 38px;
  }

  .rs-input-suffix span {
    position: absolute;
    top: 50%;
    right: 14px;
    transform: translateY(-50%);
    color: #7b8796;
    font-size: 13px;
  }

  .rs-gst-disabled {
    padding: 14px 16px;
    color: #64748b;
    background: #f8fafc;
    border-radius: 8px;
    font-size: 13px;
  }

  .rs-preview {
    overflow: hidden;
    background: #f8faff;
    border: 1px solid #e1e9fa;
    border-radius: 11px;
  }

  .rs-preview-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 17px 19px;
    border-bottom: 1px solid #e6ebf5;
  }

  .rs-preview-heading h3 {
    margin: 0;
    color: #28364b;
    font-size: 14px;
  }

  .rs-preview-heading p {
    margin: 5px 0 0;
    color: #8995a7;
    font-size: 11px;
  }

  .rs-preview-tag {
    padding: 6px 10px;
    color: #237c4b;
    background: #e7f7ed;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
  }

  .rs-preview-body {
    padding: 14px 19px;
  }

  .rs-preview-row,
  .rs-preview-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    color: #687589;
    font-size: 13px;
  }

  .rs-preview-row strong {
    color: #354257;
    font-weight: 600;
  }

  .rs-preview-total {
    margin-top: 7px;
    padding-top: 14px;
    border-top: 1px solid #dfe6f1;
    color: #253247;
    font-weight: 750;
  }

  .rs-preview-total strong {
    color: #2764cb;
    font-size: 17px;
  }

  .rs-preview-note {
    margin: 0;
    padding: 12px 19px;
    color: #8490a2;
    background: #f1f5fc;
    font-size: 11px;
    line-height: 1.6;
  }

  .rs-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 6px 2px 0;
  }

  .rs-footer p {
    margin: 0;
    color: #7c8999;
    font-size: 12px;
  }

  .rs-footer p span {
    margin-right: 6px;
    color: #23985b;
    font-weight: 800;
  }

  .rs-save-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-width: 155px;
    padding: 13px 20px;
    color: #fff;
    background: #2864cf;
    border: none;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(40, 100, 207, 0.18);
    transition: background 0.2s, transform 0.2s;
  }

  .rs-save-button:hover {
    background: #1e53b4;
    transform: translateY(-1px);
  }

  .rs-save-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }

  .rs-alert {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 16px;
    margin-bottom: 18px;
    border-radius: 9px;
    font-size: 13px;
  }

  .rs-alert p {
    flex: 1;
    margin: 0;
  }

  .rs-alert > span {
    font-weight: 800;
  }

  .rs-alert button {
    color: inherit;
    background: none;
    border: none;
    font-size: 21px;
    cursor: pointer;
  }

  .rs-alert-error {
    color: #b42318;
    background: #fff1f0;
    border: 1px solid #ffd6d2;
  }

  .rs-alert-success {
    color: #187747;
    background: #edfbf2;
    border: 1px solid #c8efd6;
  }

  .rs-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 350px;
    color: #718096;
    font-size: 14px;
  }

  .rs-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #e1e8f2;
    border-top-color: #2864cf;
    border-radius: 50%;
    animation: rs-spin 0.8s linear infinite;
  }

  @keyframes rs-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 700px) {
    .rs-page {
      padding: 25px 14px 40px;
    }

    .rs-header h1 {
      font-size: 24px;
    }

    .rs-header-icon {
      width: 43px;
      height: 43px;
    }

    .rs-card {
      padding: 21px 17px;
      border-radius: 12px;
    }

    .rs-form-grid {
      grid-template-columns: 1fr;
      gap: 19px;
    }

    .rs-full-width {
      grid-column: auto;
    }

    .rs-logo-area {
      align-items: flex-start;
      flex-direction: column;
    }

    .rs-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .rs-save-button {
      width: 100%;
    }
  }
`;

export default RestaurantSettings;
