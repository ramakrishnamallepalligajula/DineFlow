import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

function FoodCard({ food, onAdd }) {
  const [added, setAdded] = useState(false);

  const animateFoodToCart = () => {
  const cartTarget =
        document.querySelector(".floating-cart-icon") ||
        document.querySelector(".cart-icon-wrapper");

    const imageElement = document.querySelector(
      `[data-food-id="${food.id}"]`
    );

    if (!cartTarget || !imageElement) {
      return;
    }

    const start = imageElement.getBoundingClientRect();
    const end = cartTarget.getBoundingClientRect();

    const clone = imageElement.cloneNode(true);

    const size = Math.min(
      start.width,
      start.height,
      110
    );

    clone.className = "food-flying-clone";

    clone.style.width = `${size}px`;
    clone.style.height = `${size}px`;

    clone.style.left = `${
      start.left + (start.width - size) / 2
    }px`;

    clone.style.top = `${
      start.top + (start.height - size) / 2
    }px`;

    document.body.appendChild(clone);

    const startX =
      start.left +
      start.width / 2 -
      size / 2;

    const startY =
      start.top +
      start.height / 2 -
      size / 2;

    const endX =
      end.left +
      end.width / 2 -
      size / 2;

    const endY =
      end.top +
      end.height / 2 -
      size / 2;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const animation = clone.animate(
      [
        {
          transform:
            "translate3d(0, 0, 0) scale(1) rotate(0deg)",
          opacity: 1,
          offset: 0,
        },
        {
          transform:
            `translate3d(${deltaX * 0.35}px, ${
              deltaY * 0.18 - 70
            }px, 0) scale(0.82) rotate(-8deg)`,
          opacity: 0.95,
          offset: 0.35,
        },
        {
          transform:
            `translate3d(${deltaX * 0.72}px, ${
              deltaY * 0.65
            }px, 0) scale(0.58) rotate(12deg)`,
          opacity: 0.7,
          offset: 0.7,
        },
        {
          transform:
            `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.18) rotate(0deg)`,
          opacity: 0.05,
          offset: 1,
        },
      ],
      {
        duration: 650,
        easing:
          "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );

    animation.finished
      .catch(() => {})
      .finally(() => {
        clone.remove();
      });
  };

  const handleAdd = () => {
    onAdd(food);

    setAdded(true);

    animateFoodToCart();

    setTimeout(() => {
      setAdded(false);
    }, 900);
  };

  return (
    <motion.article
      className="food-card"
      layout
      initial={{
        opacity: 0,
        y: 24,
        scale: 0.96,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -6,
        transition: {
          duration: 0.2,
        },
      }}
    >
      {/* =========================
          FOOD IMAGE
      ========================= */}

      <motion.div
        className="food-image-container"
        whileHover={{
          scale: 1.015,
        }}
        transition={{
          duration: 0.25,
        }}
      >
        {food.image ? (
          <motion.img
            data-food-id={food.id}
            src={food.image}
            alt={food.name}
            className="food-image"
            loading="lazy"
            whileHover={{
              scale: 1.08,
            }}
            transition={{
              duration: 0.45,
              ease: "easeOut",
            }}
          />
        ) : (
          <div
            className="food-image-placeholder"
            data-food-id={food.id}
          >
            🍽️
          </div>
        )}

        <div className="food-image-overlay" />

        <div className="food-card-badge">
          🍴
        </div>
      </motion.div>

      {/* =========================
          CONTENT
      ========================= */}

      <div className="food-card-content">
        <div className="food-card-info">
          <motion.h3 layout="position">
            {food.name}
          </motion.h3>

          {food.description && (
            <p className="food-description">
              {food.description}
            </p>
          )}
        </div>

        {/* =========================
            PRICE + ADD
        ========================= */}

        <div className="food-card-bottom">
          <motion.span
            className="price"
            layout="position"
          >
            ₹
            {Number(food.price || 0).toLocaleString(
              "en-IN"
            )}
          </motion.span>

          <motion.button
            type="button"
            className={`food-add-button ${
              added
                ? "food-add-button-added"
                : ""
            }`}
            onClick={handleAdd}
            whileTap={{
              scale: 0.92,
            }}
            whileHover={{
              scale: 1.03,
            }}
          >
            <AnimatePresence
              mode="wait"
              initial={false}
            >
              {added ? (
                <motion.span
                  key="added"
                  className="add-success-content"
                  initial={{
                    opacity: 0,
                    scale: 0.6,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.6,
                  }}
                  transition={{
                    duration: 0.18,
                  }}
                >
                  ✓ Added
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  className="add-button-content"
                  initial={{
                    opacity: 0,
                    y: 4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -4,
                  }}
                  transition={{
                    duration: 0.16,
                  }}
                >
                  <span className="add-plus">
                    +
                  </span>

                  <span>Add</span>
                </motion.span>
              )}
            </AnimatePresence>

            {added && (
              <motion.span
                className="add-ripple"
                initial={{
                  scale: 0.2,
                  opacity: 0.8,
                }}
                animate={{
                  scale: 2.8,
                  opacity: 0,
                }}
                transition={{
                  duration: 0.55,
                  ease: "easeOut",
                }}
              />
            )}
          </motion.button>
        </div>
      </div>

      {/* =========================
          SUCCESS GLOW
      ========================= */}

      <AnimatePresence>
        {added && (
          <motion.div
            className="food-added-glow"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default FoodCard;