import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";
import AdminNavigation from "../components/AdminNavigation";

import "./BillHistory.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function BillHistory() {
  const { restaurant } = useAuth();

  const [bills, setBills] = useState([]);

  const [summary, setSummary] = useState({
    totalBills: 0,
    revenue: 0,
    paidBills: 0,
    pendingBills: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [billStatus, setBillStatus] = useState("ALL");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedBill, setSelectedBill] = useState(null);
  const [notice, setNotice] = useState("");

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (paymentStatus !== "ALL") {
        params.set("paymentStatus", paymentStatus);
      }

      if (billStatus !== "ALL") {
        params.set("status", billStatus);
      }

      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      params.set("limit", "100");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/bills?${params.toString()}`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Could not load bills (${response.status})`
        );
      }

      setBills(Array.isArray(data.bills) ? data.bills : []);

      setSummary(
        data.summary || {
          totalBills: 0,
          revenue: 0,
          paidBills: 0,
          pendingBills: 0,
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load bill history.");
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatus, billStatus, fromDate, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBills();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchBills]);

  const visibleBills = useMemo(() => bills, [bills]);

  const openBill = async (bill) => {
    setSelectedBill(bill);
    setNotice("");

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/bills/${bill._id}`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.bill) {
        setSelectedBill(data.bill);
      } else if (!response.ok) {
        setNotice(
          data.message || "Showing the available bill summary."
        );
      }
    } catch {
      setNotice("Showing the available bill summary.");
    }
  };

  const exportCsv = () => {
    const columns = [
      "Bill Number",
      "Table",
      "Created At",
      "Items",
      "Subtotal",
      "Tax",
      "Total",
      "Bill Status",
      "Payment Status",
      "Payment Method",
    ];

    const rows = visibleBills.map((bill) => [
      bill.billNumber,
      bill.tableNumber,
      bill.createdAt,
      bill.totalItems,
      bill.subtotal,
      bill.tax,
      bill.total,
      bill.status,
      bill.paymentStatus,
      bill.paymentMethod || "",
    ]);

    const escapeCsv = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [columns, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\ufeff", csv], {
        type: "text/csv;charset=utf-8;",
      })
    );

    const link = document.createElement("a");

    link.href = url;
    link.download = `dineflow-bills-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const printBill = (bill) => {
    if (!bill) return;

    const escapeHtml = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[char];
      });

    const items = (bill.items || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${Number(item.quantity || 0)}</td>
            <td>${money(item.price)}</td>
            <td>${money(
              Number(item.price || 0) *
                Number(item.quantity || 0)
            )}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

    if (!printWindow) {
      setNotice("Allow pop-ups to print this bill.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Bill ${escapeHtml(bill.billNumber)}</title>
          <style>
            body {
              font: 14px Arial, sans-serif;
              max-width: 760px;
              margin: 32px auto;
              color: #111;
            }

            h1, h2, p {
              text-align: center;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
            }

            th, td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }

            .totals {
              margin-left: auto;
              width: 260px;
            }

            .totals div {
              display: flex;
              justify-content: space-between;
              padding: 5px;
            }
          </style>
        </head>

        <body>
          <h1>${escapeHtml(
            restaurant?.name || "DineFlow Restaurant"
          )}</h1>

          <h2>Bill #${escapeHtml(bill.billNumber)}</h2>

          <p>
            Table ${escapeHtml(bill.tableNumber || "—")}
            · ${escapeHtml(dateTime(bill.createdAt))}
          </p>

          <p>
            Payment: ${escapeHtml(bill.paymentStatus || "UNPAID")}
            · ${escapeHtml(bill.paymentMethod || "—")}
          </p>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>${items}</tbody>
          </table>

          <div class="totals">
            <div>
              <span>Subtotal</span>
              <strong>${money(bill.subtotal)}</strong>
            </div>

            <div>
              <span>CGST</span>
              <strong>${money(bill.cgst)}</strong>
            </div>

            <div>
              <span>SGST</span>
              <strong>${money(bill.sgst)}</strong>
            </div>

            <div>
              <strong>Total</strong>
              <strong>${money(bill.total)}</strong>
            </div>
          </div>

          <p>Generated from DineFlow</p>

          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const statusClass = (value) =>
    String(value || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

  const clearFilters = () => {
    setSearch("");
    setPaymentStatus("ALL");
    setBillStatus("ALL");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="bill-history-page">
      {/* ADMIN SIDEBAR */}
      <AdminNavigation />

      {/* MAIN CONTENT */}
      <main className="bill-history-main">
        <header className="bh-header">
          <div className="bh-title-wrap">
            <div className="bh-title-icon">▤</div>

            <div>
              <p className="bh-eyebrow">
                BILLING &amp; OPERATIONS
              </p>

              <h1>Bill History</h1>

              <p className="bh-subtitle">
                View, search and manage your restaurant bills
              </p>
            </div>
          </div>

          <div className="bh-header-actions">
            <div className="bh-search">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bill number or table..."
                aria-label="Search bills"
              />
            </div>

            <button
              className="bh-button bh-button-primary"
              onClick={exportCsv}
            >
              ⇩ <span>Export CSV</span>
            </button>
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <section className="bh-kpis">
          <article className="bh-kpi">
            <div className="bh-kpi-icon blue">▤</div>
            <div>
              <span>Total Bills</span>
              <strong>
                {Number(summary.totalBills || 0).toLocaleString(
                  "en-IN"
                )}
              </strong>
              <small>Matching records</small>
            </div>
          </article>

          <article className="bh-kpi">
            <div className="bh-kpi-icon green">₹</div>
            <div>
              <span>Total Revenue</span>
              <strong>{money(summary.revenue)}</strong>
              <small>Paid bills in results</small>
            </div>
          </article>

          <article className="bh-kpi">
            <div className="bh-kpi-icon mint">✓</div>
            <div>
              <span>Paid Bills</span>
              <strong>{summary.paidBills || 0}</strong>
              <small>Payment completed</small>
            </div>
          </article>

          <article className="bh-kpi">
            <div className="bh-kpi-icon amber">◷</div>
            <div>
              <span>Pending Bills</span>
              <strong>{summary.pendingBills || 0}</strong>
              <small>Awaiting payment</small>
            </div>
          </article>
        </section>

        {/* FILTERS */}
        <section className="bh-filter-panel">
          <div className="bh-filter-heading">
            <div>
              <h2>All bills</h2>
              <p>Filter and retrieve previous transactions</p>
            </div>

            <button
              className="bh-button bh-button-ghost"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="bh-filters">
            <label>
              From date
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>

            <label>
              To date
              <input
                type="date"
                min={fromDate || undefined}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>

            <label>
              Payment status
              <select
                value={paymentStatus}
                onChange={(event) =>
                  setPaymentStatus(event.target.value)
                }
              >
                <option value="ALL">All payments</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>

            <label>
              Bill status
              <select
                value={billStatus}
                onChange={(event) =>
                  setBillStatus(event.target.value)
                }
              >
                <option value="ALL">All statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="PRINTING">Printing</option>
                <option value="PRINTED">Printed</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>

            <button
              className="bh-button bh-button-primary bh-apply"
              onClick={fetchBills}
            >
              Apply filters
            </button>
          </div>
        </section>

        {error && (
          <div className="bh-alert bh-alert-error">
            <strong>Unable to load bills.</strong> {error}
            <button onClick={fetchBills}>Retry</button>
          </div>
        )}

        {notice && (
          <div className="bh-alert">
            {notice}
            <button onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}

        {/* BILL TABLE */}
        <section className="bh-table-card">
          <div className="bh-table-top">
            <div>
              <h2>Bill records</h2>
              <p>
                {visibleBills.length} record
                {visibleBills.length === 1 ? "" : "s"} loaded
              </p>
            </div>

            <span className="bh-live-indicator">
              <i /> Live database
            </span>
          </div>

          <div className="bh-table-scroll">
            <table className="bh-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Table</th>
                  <th>Date &amp; Time</th>
                  <th>Orders</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Bill Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="bh-state-cell">
                      <span className="bh-loader" />
                      Loading bill records...
                    </td>
                  </tr>
                ) : visibleBills.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="bh-state-cell">
                      <div className="bh-empty-icon">▤</div>
                      <strong>No bills found</strong>
                      <span>
                        Try changing your filters or date range.
                      </span>
                    </td>
                  </tr>
                ) : (
                  visibleBills.map((bill) => (
                    <tr key={bill._id}>
                      <td>
                        <button
                          className="bh-bill-link"
                          onClick={() => openBill(bill)}
                        >
                          DF-{bill.billNumber}
                        </button>
                      </td>

                      <td>
                        <span className="bh-table-pill">
                          {bill.tableNumber || "—"}
                        </span>
                      </td>

                      <td>{dateTime(bill.createdAt)}</td>
                      <td>{bill.orderCount ?? "—"}</td>

                      <td>
                        {bill.totalItems ??
                          bill.items?.reduce(
                            (count, item) =>
                              count + Number(item.quantity || 0),
                            0
                          ) ??
                          0}
                      </td>

                      <td className="bh-amount">
                        {money(bill.total)}
                      </td>

                      <td>
                        <span
                          className={`bh-status ${statusClass(
                            bill.status
                          )}`}
                        >
                          {bill.status || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`bh-status ${statusClass(
                            bill.paymentStatus
                          )}`}
                        >
                          {bill.paymentStatus || "UNPAID"}
                        </span>
                      </td>

                      <td>
                        <div className="bh-row-actions">
                          <button
                            title="View details"
                            aria-label="View bill details"
                            onClick={() => openBill(bill)}
                          >
                            ◉
                          </button>

                          <button
                            title="Print bill"
                            aria-label="Print bill"
                            onClick={() => printBill(bill)}
                          >
                            ⎙
                          </button>

                          <button
                            title="More details"
                            aria-label="More details"
                            onClick={() => openBill(bill)}
                          >
                            ⋮
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bh-table-footer">
            <span>Showing up to 100 matching bills</span>

            <button
              className="bh-button bh-button-ghost"
              onClick={fetchBills}
            >
              ↻ Refresh
            </button>
          </div>
        </section>

        {/* INFORMATION CARDS */}
        <section className="bh-bottom-grid">
          <article className="bh-info-card">
            <div className="bh-info-heading">
              <span className="bh-info-icon">◉</span>
              <div>
                <h3>WhatsApp delivery</h3>
                <p>Customer delivery status</p>
              </div>
            </div>

            <div className="bh-delivery-flow">
              <span className="bh-flow-step">○ Not configured</span>
              <span className="bh-flow-arrow">→</span>
              <span className="bh-flow-step">↗ Sent</span>
              <span className="bh-flow-arrow">→</span>
              <span className="bh-flow-step">✓ Delivered</span>
            </div>

            <p className="bh-muted-note">
              WhatsApp sending and delivery tracking require a
              configured WhatsApp Business integration.
            </p>
          </article>

          <article className="bh-info-card bh-retention-card">
            <div className="bh-info-heading">
              <span className="bh-info-icon amber-icon">◷</span>
              <div>
                <h3>Bill history retention</h3>
                <p>Subscription-based access</p>
              </div>
            </div>

            <div className="bh-retention-message">
              <strong>Retention policy not configured</strong>
              <span>
                Bill availability will follow your plan once
                retention rules are implemented. This page does
                not delete existing bills.
              </span>
            </div>
          </article>
        </section>
      </main>

      {/* BILL DETAILS MODAL */}
      {selectedBill && (
        <div
          className="bh-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedBill(null);
            }
          }}
        >
          <section
            className="bh-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bh-modal-title"
          >
            <header className="bh-modal-header">
              <div>
                <span className="bh-eyebrow">BILL DETAILS</span>
                <h2 id="bh-modal-title">
                  DF-{selectedBill.billNumber}
                </h2>
              </div>

              <button
                className="bh-close"
                onClick={() => setSelectedBill(null)}
                aria-label="Close bill details"
              >
                ×
              </button>
            </header>

            <div className="bh-modal-meta">
              <div>
                <span>Table</span>
                <strong>{selectedBill.tableNumber || "—"}</strong>
              </div>

              <div>
                <span>Date &amp; time</span>
                <strong>{dateTime(selectedBill.createdAt)}</strong>
              </div>

              <div>
                <span>Payment method</span>
                <strong>
                  {selectedBill.paymentMethod || "Not recorded"}
                </strong>
              </div>

              <div>
                <span>Payment status</span>
                <strong>
                  <span
                    className={`bh-status ${statusClass(
                      selectedBill.paymentStatus
                    )}`}
                  >
                    {selectedBill.paymentStatus || "UNPAID"}
                  </span>
                </strong>
              </div>
            </div>

            <div className="bh-modal-items">
              <h3>Items</h3>

              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedBill.items || []).map((item, index) => (
                    <tr key={`${item.id || item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.price)}</td>
                      <td>
                        {money(
                          Number(item.price || 0) *
                            Number(item.quantity || 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bh-modal-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(selectedBill.subtotal)}</strong>
              </div>

              <div>
                <span>CGST</span>
                <strong>{money(selectedBill.cgst)}</strong>
              </div>

              <div>
                <span>SGST</span>
                <strong>{money(selectedBill.sgst)}</strong>
              </div>

              <div className="bh-grand-total">
                <span>Total</span>
                <strong>{money(selectedBill.total)}</strong>
              </div>
            </div>

            <footer className="bh-modal-actions">
              <button
                className="bh-button bh-button-ghost"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>

              <button
                className="bh-button bh-button-primary"
                onClick={() => printBill(selectedBill)}
              >
                ⎙ Print / Save PDF
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default BillHistory;