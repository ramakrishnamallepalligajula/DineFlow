import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../context/useCart";

function FloatingCart() {
  const { cart, totalItems, totalPrice } = useCart();
  const [isPressed, setIsPressed] = useState(false);

  const scrollToCart = () => {
    setIsPressed(true);

    setTimeout(() => {
      setIsPressed(false);
    }, 250);

    const cartElement = document.getElementById("full-cart");

    if (cartElement) {
      cartElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <AnimatePresence>
      {cart.length > 0 && (
        <motion.div
          className="floating-cart-wrapper"
          initial={{
            opacity: 0,
            y: 100,
            scale: 0.92,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: 100,
            scale: 0.92,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 28,
          }}
        >
          <motion.button
            type="button"
            className={`floating-cart ${isPressed ? "floating-cart-pressed" : ""}`}
            onClick={scrollToCart}
            whileTap={{
              scale: 0.96,
            }}
          >
            {/* LEFT */}
            <div className="floating-cart-left">
              <motion.div
                className="floating-cart-icon"
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                🛒

                <motion.span
                  key={totalItems}
                  className="floating-cart-count"
                  initial={{
                    scale: 0,
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
                  {totalItems}
                </motion.span>
              </motion.div>

              <div className="floating-cart-info">
                <span className="floating-cart-label">
                  YOUR ORDER
                </span>

                <motion.strong
                  key={totalItems}
                  initial={{
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                >
                  {totalItems}{" "}
                  {totalItems === 1 ? "item" : "items"}
                </motion.strong>
              </div>
            </div>

            {/* RIGHT */}
            <div className="floating-cart-right">
              <motion.span
                key={totalPrice}
                className="floating-cart-price"
                initial={{
                  opacity: 0,
                  scale: 0.85,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 22,
                }}
              >
                ₹{Number(totalPrice || 0).toLocaleString("en-IN")}
              </motion.span>

              <motion.span
                className="floating-cart-arrow"
                animate={{
                  x: [0, 3, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                →
              </motion.span>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FloatingCart;