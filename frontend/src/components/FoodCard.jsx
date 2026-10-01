function FoodCard({ food, onAdd }) {
  return (
    <div className="food-card">
      <div className="food-image-wrapper">
        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
          />
        ) : (
          <div className="food-image-placeholder">
            🍽️
          </div>
        )}
      </div>

      <div className="food-card-content">
        <h3>{food.name}</h3>

        <p>{food.description}</p>

        <div className="food-card-bottom">
          <span className="price">
            ₹{food.price}
          </span>

          <button onClick={() => onAdd(food)}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;