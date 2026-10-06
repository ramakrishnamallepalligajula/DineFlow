import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import FoodCard from "../components/FoodCard";
import CategoryTabs from "../components/CategoryTabs";
import Cart from "../components/Cart";
import { useCart } from "../context/useCart";

import "./Menu.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

function Menu() {
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subscriptionBlocked, setSubscriptionBlocked] =
    useState(false);

  const [restaurantId, setRestaurantId] =
    useState(null);

  const [tableNumber, setTableNumber] =
    useState(null);

  const { tableId } = useParams();

  const { addToCart } = useCart();

  /*
  ========================================================
  STEP 1
  GET RESTAURANT INFORMATION FROM TABLE
  ========================================================
  */

  useEffect(() => {
    let cancelled = false;

    const loadTable = async () => {
      try {
        console.log(
          "🔍 Loading table:",
          tableId
        );

        const response = await fetch(
          `${API_URL}/api/tables/public/${tableId}`
        );

        const data = await response.json();

        console.log(
          "🏪 Table API response:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load table"
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
          setError(
            error.message ||
              "Failed to load table"
          );

          setLoading(false);
        }
      }
    };

    if (tableId) {
      loadTable();
    } else {
      setError("Table ID is missing.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  /*
  ========================================================
  STEP 2
  FETCH CUSTOMER MENU
  ========================================================
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
          `${API_URL}/api/foods/public?restaurantId=${encodeURIComponent(
            restaurantId
          )}`
        );

        const data = await response.json();

        console.log(
          "🍽️ Foods API response:",
          data
        );

        /*
        ==================================================
        HANDLE API ERRORS
        ==================================================
        */

        if (!response.ok) {
          const apiError = new Error(
            data.message ||
              "Failed to fetch menu"
          );

          apiError.code = data.code;

          throw apiError;
        }

        /*
        ==================================================
        SUCCESS
        ==================================================
        */

        if (!cancelled) {
          setFoods(
            Array.isArray(data.foods)
              ? data.foods
              : []
          );

          setError("");
          setSubscriptionBlocked(false);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "❌ Failed to load menu:",
          error
        );

        if (cancelled) {
          return;
        }

        /*
        ==================================================
        SUBSCRIPTION BLOCK
        ==================================================
        */

        if (
          error.code ===
            "SUBSCRIPTION_EXPIRED" ||
          error.code ===
            "TRIAL_EXPIRED" ||
          error.code ===
            "SUBSCRIPTION_CANCELLED" ||
          error.code ===
            "SUBSCRIPTION_REQUIRED"
        ) {
          setSubscriptionBlocked(true);
          setError("");
          setLoading(false);

          return;
        }

        /*
        ==================================================
        NORMAL ERROR
        ==================================================
        */

        setError(
          error.message ||
            "Failed to load menu"
        );

        setLoading(false);
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
  ========================================================
  AVAILABLE CATEGORIES
  ========================================================
  */

  const categories = [
    "All",
    ...new Set(
      foods
        .filter(
          (food) => food.available
        )
        .map(
          (food) => food.category
        )
        .filter(Boolean)
    ),
  ];

  /*
  ========================================================
  AVAILABLE FOODS
  ========================================================
  */

  const availableFoods =
    foods.filter(
      (food) => food.available
    );

  const filteredFood =
    selectedCategory === "All"
      ? availableFoods
      : availableFoods.filter(
          (food) =>
            food.category ===
            selectedCategory
        );

  /*
  ========================================================
  LOADING SCREEN
  ========================================================
  */

  if (loading) {
    return (
      <div className="menu-page">
        <div className="menu-loading">
          <div className="menu-loading-icon">
            🍽️
          </div>

          <h2>
            Loading menu...
          </h2>

          <p>
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

  /*
  ========================================================
  SUBSCRIPTION BLOCKED
  ========================================================
  */

  if (subscriptionBlocked) {
    return (
      <div className="subscription-blocked-page">
        <div className="subscription-blocked-overlay">
          <div className="subscription-blocked-card">

            <div className="subscription-blocked-icon">
              🔒
            </div>

            <div className="subscription-blocked-badge">
              ORDERING UNAVAILABLE
            </div>

            <h1>
              Restaurant Temporarily Unavailable
            </h1>

            <p className="subscription-main-message">
              Online ordering is currently
              unavailable for this restaurant.
            </p>

            <p className="subscription-contact-message">
              Please contact the restaurant
              manager to renew their DineFlow plan.
            </p>

            <button
              type="button"
              className="subscription-retry-button"
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again
            </button>

          </div>
        </div>
      </div>
    );
  }

  /*
  ========================================================
  ERROR SCREEN
  ========================================================
  */

  if (error) {
    return (
      <div className="menu-page">

        <header className="menu-header">
          <div>
            <h1>
              My Restaurant
            </h1>

            <p>
              Table:{" "}
              {tableNumber !== null
                ? tableNumber
                : tableId ||
                  "Not selected"}
            </p>
          </div>
        </header>

        <div className="menu-error">
          <div className="menu-error-icon">
            ⚠️
          </div>

          <h2>
            Unable to load menu
          </h2>

          <p>
            {error}
          </p>
        </div>

      </div>
    );
  }

  /*
  ========================================================
  MAIN MENU
  ========================================================
  */

  return (
    <div className="menu-page">

      <header className="menu-header">
        <div>
          <h1>
            My Restaurant
          </h1>

          <p>
            Table:{" "}
            {tableNumber !== null
              ? tableNumber
              : tableId ||
                "Not selected"}
          </p>
        </div>
      </header>

      <CategoryTabs
        categories={categories}
        selectedCategory={
          selectedCategory
        }
        onSelect={
          setSelectedCategory
        }
      />

      {filteredFood.length === 0 ? (
        <div className="no-food-message">

          <div className="no-food-icon">
            🍽️
          </div>

          <h2>
            No food available
          </h2>

          <p>
            There are currently no
            available items in this
            category.
          </p>

        </div>
      ) : (
        <div className="food-grid">

          {filteredFood.map(
            (food) => (
              <FoodCard
                key={food._id}
                food={{
                  ...food,
                  id: food._id,
                }}
                onAdd={addToCart}
              />
            )
          )}

        </div>
      )}

      <Cart />

    </div>
  );
}

export default Menu;