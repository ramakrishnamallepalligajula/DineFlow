import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import FoodCard from "../components/FoodCard";
import CategoryTabs from "../components/CategoryTabs";
import Cart from "../components/Cart";
import { useCart } from "../context/useCart";

const API_URL = `http://${window.location.hostname}:3000`;

function Menu() {
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [restaurantId, setRestaurantId] =
    useState(null);

  const [tableNumber, setTableNumber] =
    useState(null);

  const { tableId } = useParams();

  const { addToCart } = useCart();

  /*
    STEP 1
    Get restaurant information from the table.
  */
  useEffect(() => {
    let cancelled = false;

    const loadTable = async () => {
      try {
        console.log("🔍 Loading table:", tableId);

        const response = await fetch(
          `${API_URL}/api/tables/public/${tableId}`
        );

        const data = await response.json();

        console.log("🏪 Table API response:", data);

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load table"
          );
        }

        if (!data.table) {
          throw new Error(
            "Table information was not returned"
          );
        }

        if (!data.table.restaurantId) {
          throw new Error(
            "This table is not linked to a restaurant."
          );
        }

        if (!cancelled) {
          setRestaurantId(
            data.table.restaurantId
          );

          setTableNumber(
            data.table.tableNumber
          );
        }
      } catch (error) {
        console.error(
          "❌ Failed to load table:",
          error
        );

        if (!cancelled) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    if (tableId) {
      loadTable();
    }

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  /*
    STEP 2
    Fetch foods only after restaurantId
    has been obtained from the table.
  */
  useEffect(() => {
    let cancelled = false;

    const loadFoods = async () => {
      try {
        console.log(
          "🍽️ Loading foods for restaurant:",
          restaurantId
        );

        const response = await fetch(
          `${API_URL}/api/foods?restaurantId=${restaurantId}`
        );

        const data = await response.json();

        console.log(
          "🍽️ Foods API response:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch menu"
          );
        }

        if (!cancelled) {
          setFoods(data.foods || []);
          setError("");
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "❌ Failed to load menu:",
          error
        );

        if (!cancelled) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    if (restaurantId) {
      loadFoods();
    }

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  /*
    Only show categories from available foods.
  */
  const categories = [
    "All",
    ...new Set(
      foods
        .filter((food) => food.available)
        .map((food) => food.category)
    ),
  ];

  /*
    Only available foods can be ordered.
  */
  const availableFoods = foods.filter(
    (food) => food.available
  );

  const filteredFood =
    selectedCategory === "All"
      ? availableFoods
      : availableFoods.filter(
          (food) =>
            food.category === selectedCategory
        );

  /*
    Loading screen
  */
  if (loading) {
    return (
      <div className="menu-page">
        <header>
          <h1>My Restaurant</h1>

          <p>
            Table:{" "}
            {tableNumber !== null
              ? tableNumber
              : tableId || "Not selected"}
          </p>
        </header>

        <div className="menu-loading">
          <h2>Loading menu... 🍽️</h2>
        </div>
      </div>
    );
  }

  /*
    Error screen
  */
  if (error) {
    return (
      <div className="menu-page">
        <header>
          <h1>My Restaurant</h1>

          <p>
            Table:{" "}
            {tableNumber !== null
              ? tableNumber
              : tableId || "Not selected"}
          </p>
        </header>

        <div className="menu-error">
          <h2>Unable to load menu</h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }

  /*
    Main menu
  */
  return (
    <div className="menu-page">
      <header>
        <h1>My Restaurant</h1>

        <p>
          Table:{" "}
          {tableNumber !== null
            ? tableNumber
            : tableId || "Not selected"}
        </p>
      </header>

      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {filteredFood.length === 0 ? (
        <div className="no-food-message">
          <h2>No food available 🍽️</h2>

          <p>
            There are currently no available
            items in this category.
          </p>
        </div>
      ) : (
        <div className="food-grid">
          {filteredFood.map((food) => (
            <FoodCard
              key={food._id}
              food={{
                ...food,
                id: food._id,
              }}
              onAdd={addToCart}
            />
          ))}
        </div>
      )}

      <Cart />
    </div>
  );
}

export default Menu;