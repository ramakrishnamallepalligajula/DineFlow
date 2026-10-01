import { useEffect, useState } from "react";
import AdminNavigation from "../components/AdminNavigation";
import { apiFetch } from "../services/api";

function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =========================
     LOAD STAFF
  ========================= */

  const loadStaff = async () => {
  try {
    setLoading(true);
    setError("");

    const response = await apiFetch(
      "/api/auth/staff"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to load staff members"
      );
    }

    setStaff(data.staff || []);

  } catch (err) {
    console.error(
      "Failed to load staff:",
      err
    );

    setError(
      err.message ||
        "Failed to load staff members"
    );

  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStaff();
  }, []);

  /* =========================
     INPUT HANDLER
  ========================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================
     CREATE STAFF
  ========================= */

  const handleCreateStaff = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setCreating(true);

      const response = await apiFetch(
        "/api/auth/staff",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create staff account"
        );
      }

      /*
        Add newly created staff to the
        current UI immediately.
      */

      setStaff((previous) => [
        data.staff,
        ...previous,
      ]);

      setMessage(
        "Staff account created successfully"
      );

      setFormData({
        name: "",
        email: "",
        password: "",
      });

      setShowModal(false);

    } catch (err) {
      console.error(
        "Create staff error:",
        err
      );

      setError(
        err.message ||
          "Failed to create staff account"
      );
    } finally {
      setCreating(false);
    }
  };

  /* =========================
     CLOSE MODAL
  ========================= */

  const closeModal = () => {
    if (creating) return;

    setShowModal(false);

    setFormData({
      name: "",
      email: "",
      password: "",
    });

    setError("");
  };

  return (
    <>
      <AdminNavigation />

      <main className="staff-page">

        {/* =========================
            HEADER
        ========================= */}

        <div className="staff-page-header">

          <div>
            <div className="staff-page-eyebrow">
              TEAM MANAGEMENT
            </div>

            <h1>
              Staff Management
            </h1>

            <p>
              Manage the people who help run
              your restaurant.
            </p>
          </div>

          <button
            className="staff-add-button"
            onClick={() => {
              setError("");
              setMessage("");
              setShowModal(true);
            }}
          >
            <span>＋</span>
            Add Staff
          </button>

        </div>

        {/* =========================
            FEEDBACK
        ========================= */}

        {message && (
          <div className="staff-success-message">
            ✓ {message}
          </div>
        )}

        {error && !showModal && (
          <div className="staff-error-message">
            {error}
          </div>
        )}

        {/* =========================
            STAFF CARD
        ========================= */}

        <section className="staff-card">

          <div className="staff-card-header">

            <div>
              <h2>
                Team Members
              </h2>

              <p>
                Staff accounts belonging to
                your restaurant.
              </p>
            </div>

            <div className="staff-count">
              {staff.length}{" "}
              {staff.length === 1
                ? "Member"
                : "Members"}
            </div>

          </div>

          {loading ? (
            <div className="staff-empty">
              <div className="staff-loading">
                Loading staff...
              </div>
            </div>
          ) : staff.length === 0 ? (
            <div className="staff-empty">

              <div className="staff-empty-icon">
                👥
              </div>

              <h3>
                No staff members yet
              </h3>

              <p>
                Add your first staff member
                to start managing your team.
              </p>

              <button
                className="staff-empty-button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setShowModal(true);
                }}
              >
                ＋ Add Staff
              </button>

            </div>
          ) : (
            <div className="staff-list">

              {staff.map((member) => (
                <div
                  className="staff-row"
                  key={member.id}
                >

                  <div className="staff-avatar">
                    {member.name
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="staff-info">
                    <strong>
                      {member.name}
                    </strong>

                    <span>
                      {member.email}
                    </span>
                  </div>

                  <div className="staff-role">
                    <span>
                      Staff
                    </span>
                  </div>

                  <div className="staff-status">
                    <span className="staff-status-dot" />
                    Active
                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

      </main>

      {/* =========================
          ADD STAFF MODAL
      ========================= */}

      {showModal && (
        <div
          className="staff-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="staff-modal">

            <div className="staff-modal-header">

              <div>
                <div className="staff-modal-icon">
                  👤
                </div>

                <h2>
                  Add Staff Member
                </h2>

                <p>
                  Create a login account for
                  your restaurant staff.
                </p>
              </div>

              <button
                className="staff-modal-close"
                onClick={closeModal}
                disabled={creating}
              >
                ×
              </button>

            </div>

            {error && (
              <div className="staff-error-message">
                {error}
              </div>
            )}

            <form
              className="staff-form"
              onSubmit={handleCreateStaff}
            >

              <div className="staff-form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Ravi Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={creating}
                  autoComplete="name"
                />

              </div>

              <div className="staff-form-group">

                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="staff@restaurant.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={creating}
                  autoComplete="email"
                />

              </div>

              <div className="staff-form-group">

                <label>
                  Temporary Password
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={creating}
                  autoComplete="new-password"
                />

              </div>

              <div className="staff-form-note">
                🔐 Staff will use these credentials
                to log in to DineFlow.
              </div>

              <div className="staff-form-actions">

                <button
                  type="button"
                  className="staff-cancel-button"
                  onClick={closeModal}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="staff-create-button"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Staff"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =========================
          PAGE STYLES
      ========================= */}

      <style>{`

        .staff-page {
          margin-left: 250px;
          min-height: 100vh;
          padding: 42px;
          background: #F6F7F9;
          box-sizing: border-box;
        }

        .staff-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .staff-page-eyebrow {
          color: #F15A24;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-bottom: 8px;
        }

        .staff-page-header h1 {
          margin: 0;
          color: #171717;
          font-size: 32px;
          line-height: 1.15;
          font-weight: 800;
        }

        .staff-page-header p {
          margin: 10px 0 0;
          color: #6B7280;
          font-size: 15px;
        }

        .staff-add-button,
        .staff-empty-button,
        .staff-create-button {
          border: none;
          cursor: pointer;
          background: #F15A24;
          color: white;
          font-weight: 700;
          border-radius: 10px;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .staff-add-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 13px 19px;
          font-size: 14px;
          white-space: nowrap;
          box-shadow: 0 7px 18px rgba(241, 90, 36, 0.18);
        }

        .staff-add-button span {
          font-size: 19px;
          line-height: 1;
        }

        .staff-add-button:hover,
        .staff-empty-button:hover,
        .staff-create-button:hover {
          background: #D94E1D;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(241, 90, 36, 0.22);
        }

        .staff-success-message,
        .staff-error-message {
          padding: 13px 16px;
          border-radius: 10px;
          margin-bottom: 18px;
          font-size: 14px;
          font-weight: 600;
        }

        .staff-success-message {
          color: #166534;
          background: #DCFCE7;
          border: 1px solid #BBF7D0;
        }

        .staff-error-message {
          color: #991B1B;
          background: #FEE2E2;
          border: 1px solid #FECACA;
        }

        .staff-card {
          background: #FFFFFF;
          border: 1px solid #E7E9ED;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
        }

        .staff-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 26px;
          border-bottom: 1px solid #E7E9ED;
        }

        .staff-card-header h2 {
          margin: 0;
          color: #171717;
          font-size: 18px;
          font-weight: 800;
        }

        .staff-card-header p {
          margin: 6px 0 0;
          color: #6B7280;
          font-size: 13px;
        }

        .staff-count {
          padding: 7px 11px;
          border-radius: 999px;
          background: #F3F4F6;
          color: #4B5563;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .staff-empty {
          min-height: 350px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
        }

        .staff-empty-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #FFF3ED;
          font-size: 29px;
          margin-bottom: 18px;
        }

        .staff-empty h3 {
          margin: 0;
          color: #171717;
          font-size: 18px;
        }

        .staff-empty p {
          max-width: 390px;
          margin: 8px 0 20px;
          color: #6B7280;
          font-size: 14px;
          line-height: 1.6;
        }

        .staff-empty-button {
          padding: 11px 17px;
          font-size: 13px;
        }

        .staff-loading {
          color: #6B7280;
          font-size: 14px;
        }

        .staff-list {
          display: flex;
          flex-direction: column;
        }

        .staff-row {
          display: grid;
          grid-template-columns: auto minmax(180px, 1fr) auto auto;
          align-items: center;
          gap: 18px;
          padding: 18px 26px;
          border-bottom: 1px solid #F0F1F3;
        }

        .staff-row:last-child {
          border-bottom: none;
        }

        .staff-avatar {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #FFF0E9;
          color: #F15A24;
          font-size: 16px;
          font-weight: 800;
        }

        .staff-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .staff-info strong {
          color: #171717;
          font-size: 14px;
          font-weight: 700;
        }

        .staff-info span {
          margin-top: 4px;
          color: #6B7280;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .staff-role span {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          background: #F3F4F6;
          color: #4B5563;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .staff-status {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #166534;
          font-size: 12px;
          font-weight: 700;
        }

        .staff-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16A34A;
        }

        .staff-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(4px);
        }

        .staff-modal {
          width: min(500px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #FFFFFF;
          border-radius: 18px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
        }

        .staff-modal-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 26px 26px 20px;
          border-bottom: 1px solid #E7E9ED;
        }

        .staff-modal-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
          border-radius: 12px;
          background: #FFF0E9;
          font-size: 21px;
        }

        .staff-modal-header h2 {
          margin: 0;
          color: #171717;
          font-size: 21px;
          font-weight: 800;
        }

        .staff-modal-header p {
          margin: 7px 0 0;
          color: #6B7280;
          font-size: 13px;
          line-height: 1.5;
        }

        .staff-modal-close {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border: none;
          border-radius: 9px;
          background: #F3F4F6;
          color: #4B5563;
          cursor: pointer;
          font-size: 23px;
          line-height: 1;
        }

        .staff-modal-close:hover {
          background: #E5E7EB;
        }

        .staff-form {
          padding: 24px 26px 26px;
        }

        .staff-form-group {
          margin-bottom: 17px;
        }

        .staff-form-group label {
          display: block;
          margin-bottom: 7px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
        }

        .staff-form-group input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 13px;
          border: 1px solid #D9DDE3;
          border-radius: 9px;
          outline: none;
          color: #171717;
          background: #FFFFFF;
          font-size: 14px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .staff-form-group input:focus {
          border-color: #F15A24;
          box-shadow: 0 0 0 3px rgba(241, 90, 36, 0.1);
        }

        .staff-form-group input:disabled {
          background: #F9FAFB;
          cursor: not-allowed;
        }

        .staff-form-note {
          padding: 12px 13px;
          margin: 5px 0 22px;
          border-radius: 9px;
          background: #F8FAFC;
          color: #64748B;
          font-size: 12px;
          line-height: 1.5;
        }

        .staff-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .staff-cancel-button,
        .staff-create-button {
          padding: 11px 17px;
          font-size: 13px;
        }

        .staff-cancel-button {
          border: 1px solid #D9DDE3;
          border-radius: 9px;
          background: #FFFFFF;
          color: #4B5563;
          font-weight: 700;
          cursor: pointer;
        }

        .staff-cancel-button:hover {
          background: #F9FAFB;
        }

        .staff-create-button:disabled,
        .staff-cancel-button:disabled,
        .staff-modal-close:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 900px) {

          .staff-page {
            margin-left: 0;
            padding: 28px 20px;
          }

          .staff-row {
            grid-template-columns: auto 1fr auto;
          }

          .staff-role {
            display: none;
          }

        }

        @media (max-width: 700px) {

          .staff-page {
            padding: 22px 15px;
          }

          .staff-page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .staff-page-header h1 {
            font-size: 26px;
          }

          .staff-add-button {
            width: 100%;
            justify-content: center;
          }

          .staff-card-header {
            padding: 20px;
          }

          .staff-row {
            grid-template-columns: auto 1fr;
            padding: 16px 20px;
          }

          .staff-status {
            grid-column: 2;
          }

          .staff-form {
            padding: 20px;
          }

          .staff-modal-header {
            padding: 22px 20px 18px;
          }

        }

      `}</style>
    </>
  );
}

export default StaffManagement;