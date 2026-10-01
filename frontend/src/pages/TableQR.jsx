import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import AdminNavigation from "../components/AdminNavigation";
import "./TableQR.css";
import { apiFetch } from "../services/api";

function TableQR() {
  const [tables, setTables] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // =========================================
  // LOAD TABLES
  // =========================================

  const loadTables = async () => {
    try {
      const response = await apiFetch("/api/tables");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch tables"
        );
      }

      setTables(data.tables || []);
      setError("");
    } catch (error) {
      console.error("Failed to fetch tables:", error);

      setError(
        error.message || "Failed to load tables"
      );
    }
  };

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    let cancelled = false;

    const initializeTables = async () => {
      try {
        setLoading(true);

        const response = await apiFetch("/api/tables");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch tables"
          );
        }

        if (!cancelled) {
          setTables(data.tables || []);
          setError("");
        }
      } catch (error) {
        console.error(
          "Failed to fetch tables:",
          error
        );

        if (!cancelled) {
          setError(
            error.message || "Failed to load tables"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeTables();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================
  // REFRESH
  // =========================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadTables();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // =========================================
  // CREATE TABLE
  // =========================================

  const createTable = async () => {
    const trimmedNumber = String(tableNumber).trim();

    if (!trimmedNumber) {
      alert("Enter a table number");
      return;
    }

    const numericTableNumber = Number(trimmedNumber);

    if (
      !Number.isInteger(numericTableNumber) ||
      numericTableNumber < 1
    ) {
      alert("Enter a valid table number");
      return;
    }

    const alreadyExists = tables.some(
      (table) =>
        Number(table.tableNumber) === numericTableNumber
    );

    if (alreadyExists) {
      alert(
        `Table ${numericTableNumber} already exists.`
      );
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await apiFetch("/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableNumber: numericTableNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create table"
        );
      }

      setTables((currentTables) => [
        ...currentTables,
        data.table,
      ]);

      setTableNumber("");
    } catch (error) {
      console.error(
        "Failed to create table:",
        error
      );

      setError(
        error.message || "Failed to create table"
      );

      alert(
        error.message || "Failed to create table"
      );
    } finally {
      setCreating(false);
    }
  };

// =========================================
// REMOVE TABLE
// =========================================

  const removeTable = async (table) => {
  const confirmed = window.confirm(
    `Remove Table ${table.tableNumber}?\n\n` +
      `This will remove the table from your active floor plan. ` +
      `Existing orders and order history will be preserved.`
  );

  if (!confirmed) return;

  try {
    setError("");

    const response = await apiFetch(
      `/api/tables/${table._id}`,
      {
        method: "DELETE",
      }
    );

    const responseText = await response.text();

    let data = {};

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Server returned an unexpected response (${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to remove table"
      );
    }

    setTables((currentTables) =>
      currentTables.filter(
        (currentTable) => currentTable._id !== table._id
      )
    );
  } catch (error) {
    console.error("Failed to remove table:", error);

    setError(
      error.message || "Failed to remove table"
    );

    alert(
      error.message || "Failed to remove table"
    );
  }
};


  // =========================================
  // DOWNLOAD QR
  // =========================================

  const downloadQR = (table) => {
    const canvas = document.getElementById(
      `qr-${table._id}`
    );

    if (!canvas) {
      return;
    }

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const downloadLink =
      document.createElement("a");

    downloadLink.href = pngUrl;

    downloadLink.download =
      `${table.tableId}-qr.png`;

    document.body.appendChild(downloadLink);

    downloadLink.click();

    document.body.removeChild(downloadLink);
  };

  // =========================================
  // CUSTOMER URL
  // =========================================

  const getTableUrl = (table) => {
    return `${window.location.origin}/order/${table.tableId}`;
  };

  // =========================================
  // OPEN CUSTOMER PAGE
  // =========================================

  const openCustomerPage = (table) => {
    window.open(
      getTableUrl(table),
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================
  // STATUS CLASS
  // =========================================

  const getStatusClass = (status) => {
    return String(status || "")
      .toLowerCase()
      .replaceAll(" ", "-");
  };

  // =========================================
  // TABLE COUNTS
  // =========================================

  const tableCounts = useMemo(() => {
    return {
      total: tables.length,

      available: tables.filter(
        (table) => table.status === "Available"
      ).length,

      occupied: tables.filter(
        (table) => table.status === "Occupied"
      ).length,
    };
  }, [tables]);

  // =========================================
  // FILTER TABLES
  // =========================================

  const filteredTables = useMemo(() => {
    let result = [...tables];

    if (activeFilter === "Available") {
      result = result.filter(
        (table) => table.status === "Available"
      );
    }

    if (activeFilter === "Occupied") {
      result = result.filter(
        (table) => table.status === "Occupied"
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery
        .trim()
        .toLowerCase();

      result = result.filter(
        (table) =>
          String(table.tableNumber || "")
            .toLowerCase()
            .includes(query) ||
          String(table.tableId || "")
            .toLowerCase()
            .includes(query)
      );
    }

    return result.sort(
      (a, b) =>
        Number(a.tableNumber) -
        Number(b.tableNumber)
    );
  }, [tables, activeFilter, searchQuery]);

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="table-qr-page">
        <AdminNavigation />

        <main className="table-page-content">
          <div className="table-loading-state">
            <div className="table-loading-icon">
              🪑
            </div>

            <h2>Loading tables...</h2>

            <p>
              Getting your restaurant tables
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="table-qr-page">
      <AdminNavigation />

      <main className="table-page-content">

        {/* =====================================
            HEADER
        ===================================== */}

        <header className="table-qr-header">
          <div className="table-header-copy">
            <span className="table-page-label">
              OPERATIONS / TABLES
            </span>

            <h1>Tables</h1>

            <p>
              Manage your restaurant floor,
              table availability and customer
              ordering QR codes.
            </p>
          </div>

          <button
            type="button"
            className="table-refresh-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <span className="refresh-icon">
              ↻
            </span>

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        {/* =====================================
            BUSINESS SNAPSHOT
        ===================================== */}

        <section className="table-stats-grid">

          <button
            type="button"
            className={`table-stat-card total ${
              activeFilter === "All"
                ? "active"
                : ""
            }`}
            onClick={() => setActiveFilter("All")}
          >
            <div className="table-stat-top">
              <span>Total Tables</span>

              <span className="table-stat-icon">
                ▦
              </span>
            </div>

            <strong>{tableCounts.total}</strong>

            <small>
              Restaurant floor capacity
            </small>
          </button>

          <button
            type="button"
            className={`table-stat-card available ${
              activeFilter === "Available"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter("Available")
            }
          >
            <div className="table-stat-top">
              <span>Available</span>

              <span className="table-stat-icon">
                ✓
              </span>
            </div>

            <strong>{tableCounts.available}</strong>

            <small>
              Ready for new guests
            </small>
          </button>

          <button
            type="button"
            className={`table-stat-card occupied ${
              activeFilter === "Occupied"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveFilter("Occupied")
            }
          >
            <div className="table-stat-top">
              <span>Occupied</span>

              <span className="table-stat-icon">
                ●
              </span>
            </div>

            <strong>{tableCounts.occupied}</strong>

            <small>
              Currently serving guests
            </small>
          </button>

        </section>

        {/* =====================================
            ERROR
        ===================================== */}

        {error && (
          <div className="table-error">
            <div className="table-error-icon">
              !
            </div>

            <div className="table-error-content">
              <strong>
                Something went wrong
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* =====================================
            CREATE TABLE
        ===================================== */}

        <section className="create-table-section">

          <div className="create-table-heading">
            <div>
              <span className="section-label">
                TABLE SETUP
              </span>

              <h2>
                Add a new table
              </h2>

              <p>
                Create a table and DineFlow will
                automatically generate its
                customer ordering QR code.
              </p>
            </div>

            <div className="create-table-badge">
              <span>+</span>
            </div>
          </div>

          <div className="create-table-form">

            <div className="table-input-wrapper">
              <span className="input-prefix">
                #
              </span>

              <input
                type="number"
                min="1"
                placeholder="Enter table number"
                value={tableNumber}
                onChange={(event) =>
                  setTableNumber(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    createTable();
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={createTable}
              disabled={creating}
              className="create-table-button"
            >
              {creating ? (
                <>
                  <span className="button-spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <span>+</span>
                  Add Table
                </>
              )}
            </button>

          </div>

          <div className="create-table-note">
            <span>✓</span>
            QR code is generated automatically
            when the table is created.
          </div>

        </section>

        {/* =====================================
            TABLE LIST HEADER
        ===================================== */}

        <section className="tables-section">

          <div className="tables-toolbar">

            <div className="tables-toolbar-copy">
              <span className="section-label">
                RESTAURANT FLOOR
              </span>

              <div className="tables-title-row">
                <h2>Restaurant Tables</h2>

                <span className="tables-count">
                  {filteredTables.length}
                </span>
              </div>
            </div>

            <div className="tables-toolbar-actions">

              <div className="table-search">
                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search table..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery("")
                    }
                  >
                    ×
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* =====================================
              FILTERS
          ===================================== */}

          <div className="table-filter-tabs">

            <button
              type="button"
              className={
                activeFilter === "All"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("All")
              }
            >
              All
              <span>{tableCounts.total}</span>
            </button>

            <button
              type="button"
              className={
                activeFilter === "Available"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("Available")
              }
            >
              <i className="filter-dot available" />
              Available
              <span>{tableCounts.available}</span>
            </button>

            <button
              type="button"
              className={
                activeFilter === "Occupied"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveFilter("Occupied")
              }
            >
              <i className="filter-dot occupied" />
              Occupied
              <span>{tableCounts.occupied}</span>
            </button>

          </div>

          {/* =====================================
              EMPTY STATE
          ===================================== */}

          {filteredTables.length === 0 ? (

            <div className="no-tables">

              <div className="no-tables-icon">
                🪑
              </div>

              <h3>
                {tables.length === 0
                  ? "No tables yet"
                  : "No tables found"}
              </h3>

              <p>
                {tables.length === 0
                  ? "Create your first restaurant table to start accepting QR orders."
                  : "Try a different search or filter."}
              </p>

              {tables.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("All");
                  }}
                >
                  View all tables
                </button>
              )}

            </div>

          ) : (

            /* =====================================
               TABLE GRID
            ===================================== */

            <div className="tables-grid">

              {filteredTables.map((table) => {

                const statusClass =
                  getStatusClass(table.status);

                const isOccupied =
                  table.status === "Occupied";

                return (
                  <article
                    className={`table-card ${statusClass}`}
                    key={table._id}
                  >

                    {/* CARD HEADER */}

                    <div className="table-card-header">

                      <div className="table-number-block">
                        <span>TABLE</span>

                        <div className="table-number-row">
                          <h3>
                            {table.tableNumber}
                          </h3>

                          <span className="table-id">
                            {table.tableId}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`table-status ${statusClass}`}
                      >
                        <span className="status-dot" />

                        {isOccupied
                          ? "Occupied"
                          : "Available"}
                      </span>

                    </div>

                    {/* QR AREA */}

                    <div className="qr-container">

                      <div className="qr-heading">
                        <span>
                          CUSTOMER ORDERING
                        </span>

                        <strong>
                          Scan to open menu
                        </strong>
                      </div>

                      <div className="qr-inner">
                        <QRCodeCanvas
                          id={`qr-${table._id}`}
                          value={getTableUrl(table)}
                          size={220}
                          level="H"
                          includeMargin
                        />
                      </div>

                      <p className="qr-caption">
                        Scan this code to order
                        directly from Table{" "}
                        {table.tableNumber}
                      </p>

                    </div>

                    {/* CUSTOMER URL */}

                    <div className="table-url">

                      <div className="table-url-label">
                        <span>ORDERING LINK</span>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              getTableUrl(table)
                            );
                          }}
                          title="Copy customer URL"
                        >
                          Copy
                        </button>
                      </div>

                      <p>
                        {getTableUrl(table)}
                      </p>

                    </div>

                    {/* ACTIONS */}

                    <div className="table-card-actions">

                      <button
                        type="button"
                        className="open-order-button"
                        onClick={() =>
                          openCustomerPage(table)
                        }
                      >
                        <span>↗</span>
                        Open Ordering
                      </button>

                      <button
                        type="button"
                        className="download-qr-button"
                        onClick={() =>
                          downloadQR(table)
                        }
                      >
                        <span>↓</span>
                        Download QR
                      </button>

                      <button
                        type="button"
                        className="remove-table-button"
                        onClick={() => removeTable(table)}
                      >
                        <span>🗑</span>
                          Remove Table
                      </button>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

      </main>
    </div>
  );
}

export default TableQR;