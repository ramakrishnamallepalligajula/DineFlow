import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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

  const previousTotalItems = useRef(totalItems);

  const [cartBumped, setCartBumped] = useState(false);

  /*
   * Trigger cart animation whenever
   * the number of items changes.
   */
  useEffect(() => {
    if (totalItems > previousTotalItems.current) {
      setCartBumped(true);

      const timer = setTimeout(() => {
        setCartBumped(false);
      }, 500);

      previousTotalItems.current = totalItems;

      return () => clearTimeout(timer);
    }

    previousTotalItems.current = totalItems;
  }, [totalItems]);

  return (
    <motion.section
      id="full-cart"
      className={`cart ${cartBumped ? "cart-bumped" : ""}`}
      layout
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* =================================================
          CART HEADER
      ================================================= */}

      <div className="cart-header">
        <div className="cart-title-area">
          <motion.div
            className="cart-icon-wrapper"
            animate={
              cartBumped
                ? {
                    scale: [1, 1.25, 0.95, 1.08, 1],
                    rotate: [0, -8, 8, -4, 0],
                  }
                : {
                    scale: 1,
                    rotate: 0,
                  }
            }
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            <span className="cart-icon">🛒</span>

            <AnimatePresence mode="popLayout">
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  className="cart-count-badge"
                  initial={{
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  exit={{
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 20,
                  }}
                >
                  {totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <div>
            <span className="cart-eyebrow">
              YOUR ORDER
            </span>

            <h2>
              {cart.length === 0
                ? "Your Cart"
                : "Your Treasure"}
            </h2>
          </div>
        </div>

        {cart.length > 0 && (
          <motion.div
            className="cart-total-mini"
            key={totalPrice}
            initial={{
              scale: 0.85,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 22,
            }}
          >
            ₹{Number(totalPrice || 0).toLocaleString("en-IN")}
          </motion.div>
        )}
      </div>

      {/* =================================================
          EMPTY CART
      ================================================= */}

      {cart.length === 0 ? (
        <motion.div
          className="cart-empty"
          initial={{
            opacity: 0,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <motion.div
            className="cart-empty-icon"
            animate={{
              y: [0, -5, 0],
              rotate: [-3, 3, -3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            🏝️
          </motion.div>

          <h3>
            Your treasure chest is empty
          </h3>

          <p>
            Add some delicious food to your order.
          </p>
        </motion.div>
      ) : (
        <>
          {/* =================================================
              CART ITEMS
          ================================================= */}

          <motion.div
            className="cart-items"
            layout
          >
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  className="cart-item"
                  key={item.id}
                  layout
                  initial={{
                    opacity: 0,
                    x: -25,
                    height: 0,
                    marginBottom: 0,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    height: "auto",
                    marginBottom: 10,
                  }}
                  exit={{
                    opacity: 0,
                    x: 25,
                    scale: 0.92,
                    height: 0,
                    marginBottom: 0,
                  }}
                  transition={{
                    duration: 0.25,
                    ease: "easeOut",
                  }}
                >
                  {/* FOOD ICON */}

                  <div className="cart-item-food-icon">
                    🍽️
                  </div>

                  {/* ITEM INFO */}

                  <div className="cart-item-info">
                    <h3>
                      {item.name}
                    </h3>

                    <span>
                      ₹
                      {Number(
                        item.price || 0
                      ).toLocaleString("en-IN")}{" "}
                      each
                    </span>

                    <strong>
                      ₹
                      {Number(
                        item.price * item.quantity
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  {/* QUANTITY */}

                  <div className="quantity">
                    <motion.button
                      type="button"
                      aria-label={`Decrease ${item.name}`}
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                      whileTap={{
                        scale: 0.82,
                      }}
                    >
                      −
                    </motion.button>

                    <motion.span
                      key={item.quantity}
                      initial={{
                        scale: 0.65,
                        opacity: 0,
                      }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 20,
                      }}
                    >
                      {item.quantity}
                    </motion.span>

                    <motion.button
                      type="button"
                      aria-label={`Increase ${item.name}`}
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                      whileTap={{
                        scale: 0.82,
                      }}
                    >
                      +
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* =================================================
              ORDER SUMMARY
          ================================================= */}

          <motion.div
            className="cart-summary"
            layout
          >
            <div className="cart-summary-row">
              <span>
                Items
              </span>

              <strong>
                {totalItems}
              </strong>
            </div>

            <div className="cart-summary-row">
              <span>
                Subtotal
              </span>

              <strong>
                ₹
                {Number(
                  totalPrice || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="cart-summary-divider" />

            <div className="cart-grand-total">
              <div>
                <span>
                  TOTAL
                </span>

                <small>
                  Table {tableId}
                </small>
              </div>

              <strong>
                ₹
                {Number(
                  totalPrice || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>
          </motion.div>

          {/* =================================================
              CHECKOUT
          ================================================= */}

          <motion.button
            type="button"
            className="checkout-button"
            onClick={() =>
              navigate(`/checkout/${tableId}`)
            }
            whileHover={{
              scale: 1.015,
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <span className="checkout-icon">
              ⚓
            </span>

            <span>
              Proceed to Checkout
            </span>

            <span className="checkout-arrow">
              →
            </span>
          </motion.button>

          <p className="cart-secure-text">
            ✦ Review your order before placing it
          </p>
        </>
      )}
    </motion.section>
  );
}

export default Cart;