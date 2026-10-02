import "./CategoryPerformance.css";

function CategoryPerformance({
  categories = [],
}) {
  if (!categories.length) {
    return (
      <div className="category-performance-empty">
        <div className="category-performance-empty-icon">
          🏷️
        </div>

        <h3>No category sales yet</h3>

        <p>
          Category performance will appear here once
          customers start placing orders.
        </p>
      </div>
    );
  }

  return (
    <div className="category-performance">
      {categories.map((category, index) => (
        <div
          className="category-performance-row"
          key={category._id || index}
        >
          <div className="category-performance-left">
            <div className="category-performance-icon">
              🏷️
            </div>

            <div className="category-performance-info">
              <strong>
                {category._id || "Uncategorized"}
              </strong>

              <span>
                {Number(category.quantity) || 0}{" "}
                {(Number(category.quantity) || 0) === 1
                  ? "item"
                  : "items"}{" "}
                sold
              </span>
            </div>
          </div>

          <div className="category-performance-revenue">
            <strong>
              ₹
              {Number(
                category.revenue || 0
              ).toLocaleString("en-IN")}
            </strong>

            <span>Revenue</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CategoryPerformance;