function FoodPerformance({ foods }) {
  return (
    <div className="food-performance">
      {foods.length === 0 ? (
        <div className="empty-dashboard">
          <span>🍽️</span>
          <p>No food sales yet.</p>
        </div>
      ) : (
        foods.map((food, index) => (
          <div
            className="food-performance-row"
            key={food._id}
          >
            <div className="food-performance-rank">
              #{index + 1}
            </div>

            <div className="food-performance-info">
              <strong>{food._id}</strong>

              <span>
                {food.quantitySold} items sold
              </span>
            </div>

            <div className="food-performance-revenue">
              <strong>
                ₹{food.revenue}
              </strong>

              <span>Revenue</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default FoodPerformance;