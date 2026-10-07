import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import AdminNavigation from "./AdminNavigation";
const ROLE_OPTIONS = [
  {
    value: "KITCHEN",
    label: "Kitchen",
    description: "Print customer orders for the kitchen",
  },
  {
    value: "BAR",
    label: "Bar",
    description: "Print beverage/bar orders",
  },
  {
    value: "BILLING",
    label: "Billing",
    description: "Print bills and invoices",
  },
  {
    value: "RECEIPT",
    label: "Receipt",
    description: "Print customer receipts",
  },
];
const CONNECTION_OPTIONS = [
  {
    value: "BLUETOOTH",
    label: "Bluetooth",
  },
  {
    value: "USB",
    label: "USB",
  },
  {
    value: "NETWORK",
    label: "Network",
  },
];
const emptyForm = {
  name: "",
  deviceId: "",
  role: "KITCHEN",
  connectionType: "BLUETOOTH",
  address: "",
  model: "",
};
function PrinterManagement() {
  const [devices, setDevices] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingExpiresAt, setPairingExpiresAt] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingCopied, setPairingCopied] = useState(false);
  const [editingPrinterId, setEditingPrinterId] =
    useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "KITCHEN",
    connectionType: "BLUETOOTH",
    address: "",
    model: "",
    enabled: true,
  });
  // ==========================================
  // LOAD PRINTER DATA
  // ==========================================
  const loadPrinters = async () => {
    try {
      setLoading(true);
      setError("");
      const [deviceResponse, printerResponse] =
        await Promise.all([
          apiFetch("/api/printer-devices"),
          apiFetch("/api/printers"),
        ]);
      const deviceData = await deviceResponse.json();
      const printerData = await printerResponse.json();
      if (!deviceResponse.ok) {
        throw new Error(
          deviceData.message ||
            "Failed to load printer devices"
        );
      }
      if (!printerResponse.ok) {
        throw new Error(
          printerData.message ||
            "Failed to load printers"
        );
      }
      setDevices(deviceData.devices || []);
      setPrinters(printerData.printers || []);
    } catch (err) {
      console.error(
        "Failed to load printer configuration:",
        err
      );
      setError(
        err.message ||
          "Failed to load printer configuration."
      );
    } finally {
      setLoading(false);
    }
  };
  // ==========================================
  // GENERATE PAIRING CODE
  // ==========================================
  const generatePairingCode = async () => {
    try {
      setPairingLoading(true);
      setError("");
      setSuccess("");
      setPairingCopied(false);
      const response = await apiFetch(
        "/api/printer-devices/pairing-code",
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to generate pairing code."
        );
      }
      setPairingCode(data.code || "");
      setPairingExpiresAt(data.expiresAt || null);
      setSuccess("Pairing code generated successfully.");
    } catch (err) {
      console.error("Failed to generate pairing code:", err);
      setError(
        err.message ||
          "Failed to generate pairing code."
      );
    } finally {
      setPairingLoading(false);
    }
  };
  const copyPairingCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setPairingCopied(true);
      setTimeout(() => {
        setPairingCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy pairing code:", err);
      setError("Unable to copy pairing code.");
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPrinters();
  }, []);
  // ==========================================
  // DEVICE HELPERS
  // ==========================================
  const getDevice = (deviceId) => {
    return devices.find(
      (device) =>
        String(device._id) === String(deviceId)
    );
  };
  const getDeviceName = (deviceId) => {
    const device = getDevice(deviceId);
    if (!device) {
      return "Unknown device";
    }
    return device.name;
  };
  // eslint-disable-next-line no-unused-vars
  const getDeviceStatus = (deviceId) => {
    const device = getDevice(deviceId);
    if (!device) {
      return "UNKNOWN";
    }
    return device.status || "UNKNOWN";
  };
  const onlineDevices = useMemo(() => {
    return devices.filter(
      (device) => device.status === "ONLINE"
    );
  }, [devices]);
  // ==========================================
  // FORM HANDLERS
  // ==========================================
  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const updateEditForm = (field, value) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };
  // ==========================================
  // CREATE PRINTER
  // ==========================================
  const createPrinter = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (!form.name.trim()) {
        throw new Error(
          "Please enter a printer name."
        );
      }
      if (!form.deviceId) {
        throw new Error(
          "Please select a printer device."
        );
      }
      const response = await apiFetch(
        "/api/printers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            deviceId: form.deviceId,
            role: form.role,
            connection: {
              type: form.connectionType,
              address: form.address.trim(),
            },
            model: form.model.trim(),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create printer."
        );
      }
      setPrinters((current) => [
        data.printer,
        ...current,
      ]);
      setForm(emptyForm);
      setShowAddForm(false);
      setSuccess(
        "Printer configured successfully."
      );
      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      console.error(
        "Failed to create printer:",
        err
      );
      setError(
        err.message ||
          "Failed to create printer."
      );
    } finally {
      setSaving(false);
    }
  };
  // ==========================================
  // START EDIT
  // ==========================================
  const startEdit = (printer) => {
    setEditingPrinterId(printer._id);
    setEditForm({
      name: printer.name || "",
      role: printer.role || "KITCHEN",
      connectionType:
        printer.connection?.type ||
        "BLUETOOTH",
      address:
        printer.connection?.address || "",
      model: printer.model || "",
      enabled:
        printer.enabled !== false,
    });
    setError("");
    setSuccess("");
  };
  // ==========================================
  // CANCEL EDIT
  // ==========================================
  const cancelEdit = () => {
    setEditingPrinterId(null);
    setEditForm({
      name: "",
      role: "KITCHEN",
      connectionType: "BLUETOOTH",
      address: "",
      model: "",
      enabled: true,
    });
  };
  // ==========================================
  // UPDATE PRINTER
  // ==========================================
  const updatePrinter = async (printerId) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (!editForm.name.trim()) {
        throw new Error(
          "Printer name cannot be empty."
        );
      }
      const response = await apiFetch(
        `/api/printers/${printerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editForm.name.trim(),
            role: editForm.role,
            connection: {
              type: editForm.connectionType,
              address:
                editForm.address.trim(),
            },
            model: editForm.model.trim(),
            enabled: editForm.enabled,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update printer."
        );
      }
      setPrinters((current) =>
        current.map((printer) =>
          String(printer._id) ===
          String(printerId)
            ? data.printer
            : printer
        )
      );
      cancelEdit();
      setSuccess(
        "Printer updated successfully."
      );
      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      console.error(
        "Failed to update printer:",
        err
      );
      setError(
        err.message ||
          "Failed to update printer."
      );
    } finally {
      setSaving(false);
    }
  };
  // ==========================================
  // ENABLE / DISABLE
  // ==========================================
  const togglePrinter = async (printer) => {
    try {
      setError("");
      setSuccess("");
      const response = await apiFetch(
        `/api/printers/${printer._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: !printer.enabled,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update printer."
        );
      }
      setPrinters((current) =>
        current.map((item) =>
          String(item._id) ===
          String(printer._id)
            ? data.printer
            : item
        )
      );
      setSuccess(
        data.printer.enabled
          ? "Printer enabled."
          : "Printer disabled."
      );
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to toggle printer:",
        err
      );
      setError(
        err.message ||
          "Failed to update printer."
      );
    }
  };
  // ==========================================
  // ROLE LABEL
  // ==========================================
  const getRoleLabel = (role) => {
    const option = ROLE_OPTIONS.find(
      (item) => item.value === role
    );
    return option?.label || role;
  };
  // ==========================================
  // STATUS
  // ==========================================
  const getPrinterStatus = (printer) => {
    const device = getDevice(
      printer.deviceId
    );
    if (!printer.enabled) {
      return {
        label: "Disabled",
        className: "disabled",
      };
    }
    if (device?.status === "ONLINE") {
      return {
        label: "Online",
        className: "online",
      };
    }
    if (device?.status === "OFFLINE") {
      return {
        label: "Offline",
        className: "offline",
      };
    }
    return {
      label: "Unknown",
      className: "unknown",
    };
  };
  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
  return (
    <div className="printer-management-page">
      <AdminNavigation />

      <main className="printer-management-main">
        <section style={styles.section}>
          <div style={styles.loadingBox}>
            <div style={styles.spinner}>⟳</div>

            <strong>
              Loading printer configuration...
            </strong>

            <span>
              Checking connected printer devices.
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
  return (
    <div className="printer-management-page">
    <AdminNavigation />

    <main className="printer-management-main">
      <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            HARDWARE
          </div>
          <h2 style={styles.title}>
            Printer Management
          </h2>
          <p style={styles.subtitle}>
            Configure which physical printer handles
            kitchen, billing and receipt jobs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(
              (current) => !current
            );
            setError("");
            setSuccess("");
          }}
          style={styles.primaryButton}
        >
          {showAddForm
            ? "× Close"
            : "+ Add Printer"}
        </button>
      </div>
      {/* ========================================
          MESSAGES
      ======================================== */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Something went wrong</strong>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={styles.successBox}>
          <strong>✓ Success</strong>
          <span>{success}</span>
        </div>
      )}
      {/* ========================================
          PRINTER AGENT PAIRING
      ======================================== */}
      <div
        style={{
          marginTop: "24px",
          padding: "22px",
          borderRadius: "18px",
          background: "#fafafa",
          border: "1px solid #e8e8e8",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "18px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#181818",
              }}
            >
              Connect Printer Agent
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                color: "#858585",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Generate a code and enter it in the
              DineFlow Printer Agent running on the
              restaurant computer.
            </p>
          </div>
          <button
            type="button"
            onClick={generatePairingCode}
            disabled={pairingLoading}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "11px 16px",
              background: "#111111",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: pairingLoading ? "not-allowed" : "pointer",
              opacity: pairingLoading ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {pairingLoading
              ? "Generating..."
              : pairingCode
              ? "Generate New Code"
              : "Generate Pairing Code"}
          </button>
        </div>
        {pairingCode && (
          <div
            style={{
              padding: "20px",
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #dddddd",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "#777",
                marginBottom: "10px",
              }}
            >
              PAIRING CODE
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 900,
                letterSpacing: "0.18em",
                color: "#111111",
                fontFamily: "monospace",
                marginBottom: "10px",
              }}
            >
              {pairingCode}
            </div>
            {pairingExpiresAt && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  marginBottom: "16px",
                }}
              >
                Expires at{" "}
                {new Date(pairingExpiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            <button
              type="button"
              onClick={copyPairingCode}
              style={{
                border: "1px solid #dddddd",
                borderRadius: "10px",
                padding: "9px 14px",
                background: "#ffffff",
                color: "#222",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {pairingCopied ? "✓ Copied" : "Copy Code"}
            </button>
          </div>
        )}
      </div>
      {/* ========================================
          REGISTERED DEVICES
      ======================================== */}
      <div style={styles.subSection}>
        <div style={styles.subHeader}>
          <div>
            <h3 style={styles.subTitle}>
              Registered Devices
            </h3>
            <p style={styles.subDescription}>
              Physical computers or gateways running
              the DineFlow Printer Agent.
            </p>
          </div>
          <span style={styles.deviceCount}>
            {onlineDevices.length} online
          </span>
        </div>
        {devices.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={styles.emptyIcon}>
              🖨️
            </div>
            <strong>
              No printer devices registered
            </strong>
            <span>
              Generate a pairing code above and enter it in the DineFlow Printer Agent.
            </span>
          </div>
        ) : (
          <div style={styles.deviceGrid}>
            {devices.map((device) => {
              const isOnline =
                device.status === "ONLINE";
              return (
                <div
                  key={device._id}
                  style={styles.deviceCard}
                >
                  <div style={styles.deviceTop}>
                    <div
                      style={{
                        ...styles.deviceIcon,
                        ...(isOnline
                          ? styles.deviceIconOnline
                          : {}),
                      }}
                    >
                      🖨️
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(isOnline
                          ? styles.statusOnline
                          : styles.statusOffline),
                      }}
                    >
                      <span
                        style={styles.statusDot}
                      />
                      {device.status}
                    </span>
                  </div>
                  <strong
                    style={styles.deviceName}
                  >
                    {device.name}
                  </strong>
                  <span style={styles.deviceType}>
                    {device.type
                      ?.replaceAll(
                        "_",
                        " "
                      )}
                  </span>
                  <div
                    style={styles.capabilities}
                  >
                    {device.capabilities
                      ?.bluetooth && (
                      <span>
                        Bluetooth
                      </span>
                    )}
                    {device.capabilities
                      ?.usb && (
                      <span>USB</span>
                    )}
                    {device.capabilities
                      ?.network && (
                      <span>
                        Network
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ========================================
          ADD PRINTER
      ======================================== */}
      {showAddForm && (
        <form
          onSubmit={createPrinter}
          style={styles.formCard}
        >
          <div style={styles.formHeader}>
            <div>
              <h3 style={styles.subTitle}>
                Add Printer
              </h3>
              <p
                style={
                  styles.subDescription
                }
              >
                Assign a registered device to a
                printing role.
              </p>
            </div>
          </div>
          <div style={styles.formGrid}>
            <label style={styles.field}>
              <span style={styles.label}>
                Printer Name
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  updateForm(
                    "name",
                    event.target.value
                  )
                }
                placeholder="Kitchen Printer"
                style={styles.input}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>
                Device
              </span>
              <select
                value={form.deviceId}
                onChange={(event) =>
                  updateForm(
                    "deviceId",
                    event.target.value
                  )
                }
                style={styles.input}
              >
                <option value="">
                  Select a printer device
                </option>
                {devices.map((device) => (
                  <option
                    key={device._id}
                    value={device._id}
                  >
                    {device.name} —{" "}
                    {device.status}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>
                Printing Role
              </span>
              <select
                value={form.role}
                onChange={(event) =>
                  updateForm(
                    "role",
                    event.target.value
                  )
                }
                style={styles.input}
              >
                {ROLE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>
                Connection
              </span>
              <select
                value={
                  form.connectionType
                }
                onChange={(event) =>
                  updateForm(
                    "connectionType",
                    event.target.value
                  )
                }
                style={styles.input}
              >
                {CONNECTION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>
                Model
              </span>
              <input
                value={form.model}
                onChange={(event) =>
                  updateForm(
                    "model",
                    event.target.value
                  )
                }
                placeholder="PSF588"
                style={styles.input}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>
                Address
                <small
                  style={styles.optional}
                >
                  Optional
                </small>
              </span>
              <input
                value={form.address}
                onChange={(event) =>
                  updateForm(
                    "address",
                    event.target.value
                  )
                }
                placeholder="Bluetooth / IP address"
                style={styles.input}
              />
            </label>
          </div>
          <div style={styles.roleHint}>
            <strong>
              {
                ROLE_OPTIONS.find(
                  (item) =>
                    item.value ===
                    form.role
                )?.label
              }
            </strong>
            <span>
              {
                ROLE_OPTIONS.find(
                  (item) =>
                    item.value ===
                    form.role
                )?.description
              }
            </span>
          </div>
          <div style={styles.formActions}>
            <button
              type="button"
              onClick={() =>
                setShowAddForm(false)
              }
              style={styles.secondaryButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.primaryButton,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Creating..."
                : "Create Printer"}
            </button>
          </div>
        </form>
      )}
      {/* ========================================
          CONFIGURED PRINTERS
      ======================================== */}
      <div style={styles.subSection}>
        <div style={styles.subHeader}>
          <div>
            <h3 style={styles.subTitle}>
              Configured Printers
            </h3>
            <p
              style={
                styles.subDescription
              }
            >
              Logical printer assignments used by
              DineFlow's print routing.
            </p>
          </div>
          <span style={styles.deviceCount}>
            {printers.length} configured
          </span>
        </div>
        {printers.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={styles.emptyIcon}>
              ⚙️
            </div>
            <strong>
              No printers configured
            </strong>
            <span>
              Add a printer above to enable
              automatic printing.
            </span>
          </div>
        ) : (
          <div style={styles.printerList}>
            {printers.map((printer) => {
              const status =
                getPrinterStatus(
                  printer
                );
              const isEditing =
                String(
                  editingPrinterId
                ) ===
                String(printer._id);
              if (isEditing) {
                return (
                  <div
                    key={printer._id}
                    style={styles.editCard}
                  >
                    <div
                      style={
                        styles.editHeader
                      }
                    >
                      <div>
                        <strong>
                          Edit Printer
                        </strong>
                        <span>
                          {getDeviceName(
                            printer.deviceId
                          )}
                        </span>
                      </div>
                    </div>
                    <div
                      style={
                        styles.formGrid
                      }
                    >
                      <label
                        style={
                          styles.field
                        }
                      >
                        <span
                          style={
                            styles.label
                          }
                        >
                          Printer Name
                        </span>
                        <input
                          value={
                            editForm.name
                          }
                          onChange={(
                            event
                          ) =>
                            updateEditForm(
                              "name",
                              event
                                .target
                                .value
                            )
                          }
                          style={
                            styles.input
                          }
                        />
                      </label>
                      <label
                        style={
                          styles.field
                        }
                      >
                        <span
                          style={
                            styles.label
                          }
                        >
                          Role
                        </span>
                        <select
                          value={
                            editForm.role
                          }
                          onChange={(
                            event
                          ) =>
                            updateEditForm(
                              "role",
                              event
                                .target
                                .value
                            )
                          }
                          style={
                            styles.input
                          }
                        >
                          {ROLE_OPTIONS.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>
                      <label
                        style={
                          styles.field
                        }
                      >
                        <span
                          style={
                            styles.label
                          }
                        >
                          Connection
                        </span>
                        <select
                          value={
                            editForm.connectionType
                          }
                          onChange={(
                            event
                          ) =>
                            updateEditForm(
                              "connectionType",
                              event
                                .target
                                .value
                            )
                          }
                          style={
                            styles.input
                          }
                        >
                          {CONNECTION_OPTIONS.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>
                      <label
                        style={
                          styles.field
                        }
                      >
                        <span
                          style={
                            styles.label
                          }
                        >
                          Model
                        </span>
                        <input
                          value={
                            editForm.model
                          }
                          onChange={(
                            event
                          ) =>
                            updateEditForm(
                              "model",
                              event
                                .target
                                .value
                            )
                          }
                          style={
                            styles.input
                          }
                        />
                      </label>
                      <label
                        style={
                          styles.field
                        }
                      >
                        <span
                          style={
                            styles.label
                          }
                        >
                          Address
                        </span>
                        <input
                          value={
                            editForm.address
                          }
                          onChange={(
                            event
                          ) =>
                            updateEditForm(
                              "address",
                              event
                                .target
                                .value
                            )
                          }
                          style={
                            styles.input
                          }
                        />
                      </label>
                    </div>
                    <label
                      style={
                        styles.checkboxRow
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          editForm.enabled
                        }
                        onChange={(
                          event
                        ) =>
                          updateEditForm(
                            "enabled",
                            event
                              .target
                              .checked
                          )
                        }
                      />
                      <span>
                        Printer enabled
                      </span>
                    </label>
                    <div
                      style={
                        styles.formActions
                      }
                    >
                      <button
                        type="button"
                        onClick={
                          cancelEdit
                        }
                        style={
                          styles.secondaryButton
                        }
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          updatePrinter(
                            printer._id
                          )
                        }
                        style={{
                          ...styles.primaryButton,
                          opacity:
                            saving
                              ? 0.6
                              : 1,
                        }}
                      >
                        {saving
                          ? "Saving..."
                          : "Save Changes"}
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={printer._id}
                  style={styles.printerCard}
                >
                  <div
                    style={
                      styles.printerMain
                    }
                  >
                    <div
                      style={
                        styles.printerIcon
                      }
                    >
                      🖨️
                    </div>
                    <div
                      style={
                        styles.printerInfo
                      }
                    >
                      <div
                        style={
                          styles.printerNameRow
                        }
                      >
                        <strong
                          style={
                            styles.printerName
                          }
                        >
                          {printer.name}
                        </strong>
                        <span
                          style={{
                            ...styles.roleBadge,
                            ...(printer.role ===
                            "KITCHEN"
                              ? styles.roleKitchen
                              : {}),
                          }}
                        >
                          {getRoleLabel(
                            printer.role
                          )}
                        </span>
                      </div>
                      <div
                        style={
                          styles.printerMeta
                        }
                      >
                        <span>
                          Device:{" "}
                          <strong>
                            {getDeviceName(
                              printer.deviceId
                            )}
                          </strong>
                        </span>
                        <span>
                          {printer.connection
                            ?.type ||
                            "UNKNOWN"}
                        </span>
                        {printer.model && (
                          <span>
                            {
                              printer.model
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    style={
                      styles.printerActions
                    }
                  >
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(status.className ===
                        "online"
                          ? styles.statusOnline
                          : status.className ===
                            "disabled"
                          ? styles.statusDisabled
                          : styles.statusOffline),
                      }}
                    >
                      <span
                        style={
                          styles.statusDot
                        }
                      />
                      {status.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(
                          printer
                        )
                      }
                      style={
                        styles.smallButton
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        togglePrinter(
                          printer
                        )
                      }
                      style={
                        styles.smallButton
                      }
                    >
                      {printer.enabled
                        ? "Disable"
                        : "Enable"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
    </main>
  </div>
  );
}
const styles = {
  section: {
    marginTop: "40px",
    marginBottom: "40px",
    padding: "28px",
    borderRadius: "24px",
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.04)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "24px",
    marginBottom: "28px",
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#777",
    marginBottom: "7px",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 800,
    color: "#171717",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#777",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  primaryButton: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "#111111",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  secondaryButton: {
    border: "1px solid #dddddd",
    borderRadius: "12px",
    padding: "11px 17px",
    background: "#ffffff",
    color: "#222",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#fff4f4",
    border: "1px solid #ffd4d4",
    color: "#a32323",
    fontSize: "13px",
    marginBottom: "20px",
  },
  successBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#f1fff6",
    border: "1px solid #ccefd9",
    color: "#176b38",
    fontSize: "13px",
    marginBottom: "20px",
  },
  subSection: {
    marginTop: "30px",
  },
  subHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "16px",
  },
  subTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#181818",
  },
  subDescription: {
    margin: "5px 0 0",
    color: "#858585",
    fontSize: "13px",
  },
  deviceCount: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#f5f5f5",
    color: "#555",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  deviceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  deviceCard: {
    padding: "18px",
    border: "1px solid #e8e8e8",
    borderRadius: "16px",
    background: "#fafafa",
  },
  deviceTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  deviceIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eeeeee",
    fontSize: "20px",
  },
  deviceIconOnline: {
    background: "#eaf9ef",
  },
  deviceName: {
    display: "block",
    fontSize: "15px",
    marginBottom: "5px",
    color: "#202020",
  },
  deviceType: {
    display: "block",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#999",
  },
  capabilities: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "14px",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "currentColor",
  },
  statusOnline: {
    color: "#18753c",
    background: "#eaf8ef",
  },
  statusOffline: {
    color: "#8b5d12",
    background: "#fff7e6",
  },
  statusDisabled: {
    color: "#777",
    background: "#eeeeee",
  },
  statusUnknown: {
    color: "#666",
    background: "#eeeeee",
  },
  // eslint-disable-next-line no-dupe-keys
  capabilities: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "14px",
  },
  emptyBox: {
    minHeight: "150px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    border: "1px dashed #dcdcdc",
    borderRadius: "16px",
    background: "#fafafa",
    color: "#777",
    textAlign: "center",
    padding: "24px",
    fontSize: "13px",
  },
  emptyIcon: {
    fontSize: "30px",
    marginBottom: "4px",
  },
  formCard: {
    marginTop: "24px",
    padding: "22px",
    borderRadius: "18px",
    background: "#fafafa",
    border: "1px solid #e5e5e5",
  },
  formHeader: {
    marginBottom: "20px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#333",
  },
  optional: {
    marginLeft: "6px",
    color: "#999",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dddddd",
    borderRadius: "10px",
    padding: "11px 12px",
    background: "#ffffff",
    color: "#222",
    fontSize: "13px",
    outline: "none",
  },
  roleHint: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    marginTop: "18px",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#f2f2f2",
    color: "#555",
    fontSize: "12px",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
  },
  printerList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  printerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "17px",
    border: "1px solid #e8e8e8",
    borderRadius: "16px",
    background: "#ffffff",
  },
  printerMain: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
  printerIcon: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f1f1",
    fontSize: "21px",
  },
  printerInfo: {
    minWidth: 0,
  },
  printerNameRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  printerName: {
    fontSize: "15px",
    color: "#202020",
  },
  roleBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#f1f1f1",
    color: "#555",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.05em",
  },
  roleKitchen: {
    background: "#fff2df",
    color: "#9a5c00",
  },
  printerMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "6px",
    color: "#888",
    fontSize: "11px",
  },
  printerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "7px",
    flexWrap: "wrap",
  },
  smallButton: {
    border: "1px solid #dddddd",
    borderRadius: "9px",
    padding: "7px 10px",
    background: "#ffffff",
    color: "#333",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  editCard: {
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid #dcdcdc",
    background: "#fafafa",
  },
  editHeader: {
    marginBottom: "18px",
  },
  loadingBox: {
    minHeight: "160px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "#777",
    fontSize: "13px",
  },
  spinner: {
    fontSize: "28px",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "18px",
    color: "#333",
    fontSize: "13px",
    fontWeight: 600,
  },


};


export default PrinterManagement;
