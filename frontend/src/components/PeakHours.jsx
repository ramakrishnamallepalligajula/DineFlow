import "./PeakHours.css";
function formatHour(hour) {
  const numericHour = Number(hour);

  if (
    !Number.isFinite(numericHour) ||
    numericHour < 0 ||
    numericHour > 23
  ) {
    return "--";
  }

  const period = numericHour >= 12 ? "PM" : "AM";

  const hour12 = numericHour % 12 || 12;

  return `${hour12} ${period}`;
}

function PeakHours({ hours = [] }) {
  if (!hours.length) {
    return (
      <div className="peak-hours-empty">
        <div className="peak-hours-empty-icon">
          🕐
        </div>

        <h3>No ordering activity yet</h3>

        <p>
          Peak ordering hours will appear here once
          customers start placing orders.
        </p>
      </div>
    );
  }

  return (
    <div className="peak-hours">
      {hours.map((hour, index) => {
        const orders = Number(hour.orders) || 0;
        const revenue = Number(hour.revenue) || 0;

        return (
          <div
            className="peak-hours-row"
            key={`${hour._id}-${index}`}
          >
            <div className="peak-hours-time">
              <div className="peak-hours-icon">
                🕐
              </div>

              <div>
                <strong>
                  {formatHour(hour._id)}
                </strong>

                <span>
                  {orders}{" "}
                  {orders === 1
                    ? "order"
                    : "orders"}
                </span>
              </div>
            </div>

            <div className="peak-hours-revenue">
              <strong>
                ₹{revenue.toLocaleString("en-IN")}
              </strong>

              <span>Revenue</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PeakHours;