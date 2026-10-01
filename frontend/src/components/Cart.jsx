import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/useCart";

function Cart() {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    totalItems,
    totalPrice,
  } = useCart();

  const navigate = useNavigate();
  const { tableId } = useParams();

  return (
    <div className="cart">
      <h2>🛒 Your Cart</h2>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div className="cart-item" key={item.id}>

              <div>
                <h3>{item.name}</h3>
                <p>₹{item.price}</p>
              </div>

              <div className="quantity">
                <button
                  onClick={() => decreaseQuantity(item.id)}
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  onClick={() => increaseQuantity(item.id)}
                >
                  +
                </button>
              </div>

            </div>
          ))}

          <hr />

          <div className="cart-total">
            <span>
              Items: {totalItems}
            </span>

            <strong>
              Total: ₹{totalPrice}
            </strong>
          </div>

          <button
            className="checkout-button"
            onClick={() => navigate(`/checkout/${tableId}`)}
          >
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
}

export default Cart;