function CategoryPerformance({ categories }) {
  if (categories.length === 0) {
    return (
      <div className="empty-dashboard">
        <span>🍽️</span>
        <p>No category sales yet.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(
    ...categories.map((category) => category.revenue)
  );

  return (
    <div className="category-performance">
      {categories.map((category) => {
        const percentage =
          maxRevenue > 0
            ? (category.revenue / maxRevenue) * 100
            : 0;

        return (
          <div
            className="category-performance-item"
            key={category._id}
          >
            <div className="category-performance-header">
              <strong>{category._id}</strong>

              <strong>
                ₹{category.revenue}
              </strong>
            </div>

            <div className="category-progress">
              <div
                className="category-progress-bar"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <span>
              {category.quantitySold} items sold
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default CategoryPerformance;