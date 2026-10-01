function PeakHours({ hours }) {
  if (hours.length === 0) {
    return (
      <div className="empty-dashboard">
        <span>🕐</span>
        <p>No order timing data yet.</p>
      </div>
    );
  }

  const maxOrders = Math.max(
    ...hours.map((item) => item.orders)
  );

  const formatHour = (hour) => {
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour =
      hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour} ${suffix}`;
  };

  return (
    <div className="peak-hours">
      {hours.map((item) => {
        const percentage =
          maxOrders > 0
            ? (item.orders / maxOrders) * 100
            : 0;

        return (
          <div
            className="peak-hour-item"
            key={item.hour}
          >
            <div className="peak-hour-label">
              {formatHour(item.hour)}
            </div>

            <div className="peak-hour-bar-container">
              <div
                className="peak-hour-bar"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <strong>{item.orders}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default PeakHours;
