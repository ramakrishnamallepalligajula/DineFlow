import "./FoodPerformance.css";
function FoodPerformance({ foods = [] }) {
  if (!foods.length) {
    return (
      <div className="food-performance-empty">
        <div className="food-performance-empty-icon">
          🍽️
        </div>

        <h3>No food sales yet</h3>

        <p>
          Food performance will appear here once
          customers start placing orders.
        </p>
      </div>
    );
  }

  return (
    <div className="food-performance">
      {foods.slice(0, 5).map((food, index) => (
        <div
          className="food-performance-row"
          key={food._id || index}
        >
          <div className="food-performance-rank">
            {String(index + 1).padStart(2, "0")}
          </div>

          <div className="food-performance-icon">
            🍛
          </div>

          <div className="food-performance-info">
            <strong>{food._id}</strong>

            <span>
              {Number(food.quantity) || 0}{" "}
              {(Number(food.quantity) || 0) === 1
                ? "item"
                : "items"}{" "}
              sold
            </span>
          </div>

          <div className="food-performance-revenue">
            <strong>
              ₹
              {Number(food.revenue || 0).toLocaleString(
                "en-IN"
              )}
            </strong>

            <span>Revenue</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FoodPerformance;