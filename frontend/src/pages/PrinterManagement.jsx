
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Printer, RefreshCw, Smartphone, Wifi, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AdminNavigation from "../components/AdminNavigation";
import "./PrinterManagement.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function getStatusLabel(status) {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "OFFLINE":
      return "Offline";
    case "DISABLED":
      return "Disabled";
    case "PENDING":
      return "Pending";
    default:
      return status || "Unknown";
  }
}

function PrinterManagement() {
  const { token } = useAuth();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deviceName, setDeviceName] = useState("DineFlow Printer Bridge");
  const [pairing, setPairing] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [disablingId, setDisablingId] = useState("");

  const authHeaders = useCallback(
    (includeJson = false) => ({
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadDevices = useCallback(
    async (isRefresh = false) => {
      if (!token) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const response = await fetch(`${API_URL}/api/printers/devices`, {
          headers: authHeaders(),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Unable to load printer devices.");
        }

        setDevices(Array.isArray(data.devices) ? data.devices : []);
      } catch (err) {
        setError(err.message || "Unable to load printer devices.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, authHeaders]
  );

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const generatePairingCode = async (event) => {
    event.preventDefault();

    if (!deviceName.trim()) {
      setError("Enter a name for the printer bridge device.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");
    setPairing(null);

    try {
      const response = await fetch(`${API_URL}/api/printers/pairing-code`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          deviceName: deviceName.trim(),
          capabilities: {
            bluetooth: true,
            usb: true,
            network: true,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to generate pairing code.");
      }

      setPairing({
        code: data.pairingCode,
        expiresAt: data.expiresAt,
        deviceName: data.deviceName || deviceName.trim(),
      });

      setSuccess("Pairing code generated. Enter it in the Flutter app.");
      await loadDevices(true);
    } catch (err) {
      setError(err.message || "Unable to generate pairing code.");
    } finally {
      setGenerating(false);
    }
  };

  const disableDevice = async (device) => {
    const id = device._id || device.deviceId;

    if (!id) {
      setError("This device is missing its identifier.");
      return;
    }

    const confirmed = window.confirm(
      `Disable "${device.deviceName || "this device"}"? It will need to be paired again to reconnect.`
    );

    if (!confirmed) return;

    setDisablingId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/printers/devices/${id}/disable`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to disable device.");
      }

      setSuccess("Device disabled.");
      await loadDevices(true);
    } catch (err) {
      setError(err.message || "Unable to disable device.");
    } finally {
      setDisablingId("");
    }
  };

  return (
    <div className="printer-management-page">
      <AdminNavigation />

      <main className="printer-management-main">
        <section>
          <header className="printer-page-header">
            <div>
              <span className="printer-page-eyebrow">DEVICE OPERATIONS</span>
              <h1>Printer Management</h1>
              <p>
                Pair Android bridge devices and manage printer connectivity
                for your restaurant.
              </p>
            </div>

            <button
              className="printer-refresh-button"
              type="button"
              onClick={() => loadDevices(true)}
              disabled={refreshing}
            >
              <RefreshCw size={17} className={refreshing ? "printer-spin" : ""} />
              Refresh
            </button>
          </header>

          {error && (
            <div className="printer-alert printer-alert-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="printer-alert printer-alert-success" role="status">
              <CheckCircle2 size={18} />
              <span>{success}</span>
              <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss success">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="printer-management-grid">
            <article className="printer-card printer-pairing-card">
              <div className="printer-card-heading">
                <div className="printer-card-icon">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2>Pair a device</h2>
                  <p>Generate a temporary code for the Android app.</p>
                </div>
              </div>

              <form onSubmit={generatePairingCode}>
                <label htmlFor="printer-device-name">Device name</label>
                <input
                  id="printer-device-name"
                  type="text"
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  maxLength={80}
                  required
                />

                <button
                  className="printer-primary-button"
                  type="submit"
                  disabled={generating}
                >
                  {generating ? "Generating…" : "Generate pairing code"}
                </button>
              </form>

              {pairing && (
                <div className="printer-pairing-result">
                  <div className="printer-pairing-result-title">
                    <CheckCircle2 size={17} />
                    <span>Pairing code ready</span>
                  </div>
                  <div className="printer-pairing-code">{pairing.code}</div>
                  <p>
                    Enter this code in the DineFlow Print Bridge app.
                  </p>
                  <div className="printer-pairing-expiry">
                    <Clock size={15} />
                    Expires: {formatDate(pairing.expiresAt)}
                  </div>
                </div>
              )}
            </article>

            <article className="printer-card printer-overview-card">
              <div className="printer-card-heading">
                <div className="printer-card-icon">
                  <Printer size={20} />
                </div>
                <div>
                  <h2>Device overview</h2>
                  <p>Current printer bridge registrations.</p>
                </div>
              </div>

              <div className="printer-overview-stats">
                <div>
                  <strong>{devices.length}</strong>
                  <span>Total devices</span>
                </div>
                <div>
                  <strong>{devices.filter((device) => device.status === "ONLINE").length}</strong>
                  <span>Online</span>
                </div>
                <div>
                  <strong>{devices.filter((device) => device.status === "OFFLINE").length}</strong>
                  <span>Offline</span>
                </div>
              </div>

              <div className="printer-overview-note">
                <Wifi size={17} />
                <span>
                  Physical printer discovery and test printing will be enabled
                  after a printer is connected.
                </span>
              </div>
            </article>
          </div>

          <section className="printer-devices-section">
            <div className="printer-section-heading">
              <div>
                <h2>Registered devices</h2>
                <p>Manage paired Android bridge devices.</p>
              </div>
              <span className="printer-device-count">{devices.length} devices</span>
            </div>

            {loading ? (
              <div className="printer-empty-state">Loading devices…</div>
            ) : devices.length === 0 ? (
              <div className="printer-empty-state">
                <Printer size={28} />
                <strong>No printer bridge devices yet</strong>
                <span>Generate a pairing code above to connect your first device.</span>
              </div>
            ) : (
              <div className="printer-device-list">
                {devices.map((device) => {
                  const id = device._id || device.deviceId;
                  const capabilities = device.capabilities || {};
                  const assignments = Array.isArray(device.printerAssignments)
                    ? device.printerAssignments
                    : [];

                  return (
                    <article className="printer-device-card" key={id}>
                      <div className="printer-device-main">
                        <div className="printer-device-icon">
                          <Smartphone size={21} />
                        </div>
                        <div className="printer-device-info">
                          <h3>{device.deviceName || "Android Printer Bridge"}</h3>
                          <p>
                            Paired {formatDate(device.pairedAt || device.createdAt)}
                          </p>
                          <div className="printer-capability-list">
                            {capabilities.bluetooth && <span>Bluetooth</span>}
                            {capabilities.usb && <span>USB</span>}
                            {capabilities.network && <span>Network</span>}
                          </div>
                        </div>
                      </div>

                      <div className="printer-device-side">
                        <span className={`printer-status printer-status-${String(device.status || "unknown").toLowerCase()}`}>
                          <span />
                          {getStatusLabel(device.status)}
                        </span>
                        <span className="printer-device-last-seen">
                          Last seen: {formatDate(device.lastSeenAt)}
                        </span>
                        {device.status !== "DISABLED" && (
                          <button
                            className="printer-disable-button"
                            type="button"
                            onClick={() => disableDevice(device)}
                            disabled={disablingId === id}
                          >
                            {disablingId === id ? "Disabling…" : "Disable device"}
                          </button>
                        )}
                      </div>

                      {assignments.length > 0 && (
                        <div className="printer-device-assignments">
                          <strong>Printer assignments</strong>
                          {assignments.map((assignment) => (
                            <div key={assignment._id || assignment.printerRole}>
                              <span>{assignment.printerRole}</span>
                              <span>{assignment.printerName}</span>
                              <span>{assignment.connectionType}</span>
                              <span>{assignment.paperWidth} mm</span>
                              <span>{assignment.enabled ? "Enabled" : "Disabled"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default PrinterManagement;
