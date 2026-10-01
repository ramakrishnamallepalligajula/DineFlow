import { useEffect, useState } from "react";
import { useCart } from "../context/useCart";
import { useNavigate, useParams } from "react-router-dom";

function Checkout() {
  const {
    cart,
    totalItems,
    totalPrice,
  } = useCart();

  const navigate = useNavigate();
  const { tableId } = useParams();

  const tableNumber = tableId?.replace("table-", "");

  // NEW: Store restaurant ID
  const [restaurantId, setRestaurantId] = useState(null);

  // NEW: Get restaurant ID from the table
  useEffect(() => {
    const loadTable = async () => {
      try {
        const API_URL = `http://${window.location.hostname}:3000`;

        const response = await fetch(
          `${API_URL}/api/tables/public/${tableId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load table"
          );
        }

        console.log("Table information:", data);

        setRestaurantId(data.table.restaurantId);
      } catch (error) {
        console.error(
          "❌ Failed to load restaurant:",
          error
        );

        alert(
          `Failed to load restaurant: ${error.message}`
        );
      }
    };

    if (tableId) {
      loadTable();
    }
  }, [tableId]);

  const placeOrder = async () => {

    // NEW: Don't place order before restaurant is loaded
    if (!restaurantId) {
      alert(
        "Restaurant information is still loading. Please try again."
      );
      return;
    }

    const order = {
      id: Date.now(),

      // NEW
      restaurantId: restaurantId,

      tableId: tableId,
      tableNumber: Number(tableNumber),

      items: cart.map((item) => ({
        ...item,
        category: item.category || "Other",
      })),

      totalItems: totalItems,
      totalPrice: totalPrice,
      status: "Order Received",
      createdAt: new Date().toISOString(),
    };

    const API_URL = `http://${window.location.hostname}:3000`;

    console.log("Sending order:", order);

    try {
      const response = await fetch(
        `${API_URL}/api/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(order),
        }
      );

      const data = await response.json();

      console.log("Backend response:", data);
      console.log("MongoDB order:", data.order);
      console.log("MongoDB _id:", data.order?._id);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to place order"
        );
      }

      // Make sure the MongoDB order contains an _id
      if (!data.order?._id) {
        throw new Error(
          "Order was created but MongoDB ID was not returned."
        );
      }

      // Save the MongoDB order
      localStorage.setItem(
        "currentOrder",
        JSON.stringify(data.order)
      );

      console.log(
        "Saved currentOrder:",
        localStorage.getItem("currentOrder")
      );

      navigate("/order-status");

    } catch (error) {
      console.error("Order failed:", error);

      alert(
        `Failed to place order: ${error.message}`
      );
    }
  };

  return (
    <div className="checkout-page">

      <h1>Checkout</h1>

      <div className="table-info">
        <h3>Table {tableNumber}</h3>

        <p>
          Your order will be served to this table.
          Thanks for ordering!
        </p>
      </div>

      <div className="checkout-items">

        {cart.map((item) => (
          <div
            className="checkout-item"
            key={item.id}
          >
            <div>
              <h3>{item.name}</h3>

              <p>
                ₹{item.price} × {item.quantity}
              </p>
            </div>

            <strong>
              ₹{item.price * item.quantity}
            </strong>
          </div>
        ))}

      </div>

      <div className="checkout-summary">

        <p>
          Total Items: {totalItems}
        </p>

        <h2>
          Total: ₹{totalPrice}
        </h2>

      </div>

      <button
        className="place-order-button"
        onClick={placeOrder}
      >
        Place Order
      </button>

    </div>
  );
}

export default Checkout;