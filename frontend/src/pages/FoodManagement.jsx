import { useEffect, useMemo, useState } from "react";

import AdminNavigation from "../components/AdminNavigation";

import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  image: "",
  available: true,
};

function FoodManagement() {
  const { restaurant } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeFilter, setActiveFilter] = useState("All");

  /* =========================================
     LOAD FOODS
  ========================================= */

  useEffect(() => {
    let cancelled = false;

    const loadFoods = async () => {
      try {
        const response = await apiFetch(
          `/api/foods?restaurantId=${restaurant?.id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch foods"
          );
        }

        if (!cancelled) {
          setFoods(data.foods || []);
        }
      } catch (error) {
        console.error("Failed to fetch foods:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFoods();

    return () => {
      cancelled = true;
    };
  }, [restaurant?.id]);

  /* =========================================
     DERIVED DATA
  ========================================= */

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        foods
          .map((food) => food.category)
          .filter(Boolean)
      ),
    ];

    return uniqueCategories.sort();
  }, [foods]);

  const availableCount = foods.filter(
    (food) => food.available
  ).length;

  const unavailableCount = foods.filter(
    (food) => !food.available
  ).length;

  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return foods.filter((food) => {
      const matchesSearch =
        !query ||
        food.name?.toLowerCase().includes(query) ||
        food.category?.toLowerCase().includes(query) ||
        food.description?.toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === "All" ||
        food.category === activeCategory;

      const matchesAvailability =
        activeFilter === "All" ||
        (activeFilter === "Available" && food.available) ||
        (activeFilter === "Unavailable" && !food.available);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [
    foods,
    searchQuery,
    activeCategory,
    activeFilter,
  ]);

  /* =========================================
     FORM CHANGE
  ========================================= */

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  /* =========================================
     SELECT IMAGE
  ========================================= */

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setPreview(previewUrl);
  };

  /* =========================================
     UPLOAD IMAGE
  ========================================= */

  const uploadImage = async () => {
    if (!selectedImage) {
      return "";
    }

    const formData = new FormData();

    formData.append(
      "image",
      selectedImage
    );

    setUploading(true);

    try {
      const response = await apiFetch(
        "/api/uploads/food-image",
        {
          method: "POST",
          body: formData,
        }
      );

      const contentType =
        response.headers.get("content-type");

      let data;

      if (
        contentType?.includes(
          "application/json"
        )
      ) {
        data = await response.json();
      } else {
        const text = await response.text();

        throw new Error(
          text ||
            `Upload failed with status ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Image upload failed"
        );
      }

      return data.imageUrl;
    } finally {
      setUploading(false);
    }
  };

  /* =========================================
     RESET FORM
  ========================================= */

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedImage(null);
    setPreview("");

    const imageInput =
      document.getElementById(
        "food-image-input"
      );

    if (imageInput) {
      imageInput.value = "";
    }
  };

  /* =========================================
     SAVE FOOD
  ========================================= */

  const saveFood = async (event) => {
    event.preventDefault();

    if (
      !form.name ||
      !form.price ||
      !form.category
    ) {
      alert(
        "Name, price and category are required."
      );

      return;
    }

    try {
      setSaving(true);

      const imageUrl =
        await uploadImage();

      const foodData = {
        ...form,
        price: Number(form.price),
        image:
          imageUrl || form.image,
      };

      const url = editingId
        ? `http://localhost:3000/api/foods/${editingId}`
        : "http://localhost:3000/api/foods";

      const method = editingId
        ? "PUT"
        : "POST";

      const response =
  await apiFetch(
    url.replace("http://localhost:3000", ""),
    {
      method,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(foodData),
    }
  );
        

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save food"
        );
      }

      if (editingId) {
        setFoods(
          (currentFoods) =>
            currentFoods.map(
              (food) =>
                food._id === editingId
                  ? data.food
                  : food
            )
        );
      } else {
        setFoods(
          (currentFoods) => [
            data.food,
            ...currentFoods,
          ]
        );
      }

      resetForm();
    } catch (error) {
      console.error(
        "Failed to save food:",
        error
      );

      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     EDIT FOOD
  ========================================= */

  const startEditing = (food) => {
    setEditingId(food._id);

    setForm({
      name: food.name,

      description:
        food.description || "",

      price: food.price,

      category:
        food.category,

      image:
        food.image || "",

      available:
        food.available,
    });

    setSelectedImage(null);

    setPreview(
      food.image || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================
     TOGGLE AVAILABILITY
  ========================================= */

  const toggleAvailability =
    async (food) => {
      try {
        const response =
          await apiFetch(
            `/api/foods/${food._id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                available:
                  !food.available,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to update availability"
          );
        }

        setFoods(
          (currentFoods) =>
            currentFoods.map(
              (item) =>
                item._id === food._id
                  ? data.food
                  : item
            )
        );
      } catch (error) {
        console.error(
          "Failed to update availability:",
          error
        );

        alert(error.message);
      }
    };

  /* =========================================
     DELETE FOOD
  ========================================= */

  const deleteFood = async (foodId) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this food?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await apiFetch(
          `/api/foods/${foodId}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete food"
        );
      }

      setFoods(
        (currentFoods) =>
          currentFoods.filter(
            (food) =>
              food._id !== foodId
          )
      );

      if (editingId === foodId) {
        resetForm();
      }
    } catch (error) {
      console.error(
        "Failed to delete food:",
        error
      );

      alert(error.message);
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="food-management-page">
          <AdminNavigation />

          <main className="food-page-content">
            <div className="food-loading-state">
              <div className="loading-spinner">
                🍔
              </div>

              <h2>
                Loading your menu
              </h2>

              <p>
                Getting your restaurant
                menu ready...
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  /* =========================================
     PAGE
  ========================================= */

  return (
    <>
      <style>{styles}</style>

      <div className="food-management-page">

        <AdminNavigation />

        <main className="food-page-content">

          {/* =================================
              PAGE HEADER
          ================================= */}

          <header className="food-page-header">

            <div className="food-header-left">

              <div className="food-eyebrow">
                MENU MANAGEMENT
              </div>

              <h1>
                Your menu, your way.
              </h1>

              <p>
                Manage dishes, prices and
                availability from one place.
              </p>

            </div>

            <div className="food-header-actions">

              <div className="header-mini-stat">
                <span>Total items</span>
                <strong>
                  {foods.length}
                </strong>
              </div>

              <div className="header-mini-stat">
                <span>Available</span>
                <strong className="green-text">
                  {availableCount}
                </strong>
              </div>

              <div className="header-mini-stat">
                <span>Unavailable</span>
                <strong className="red-text">
                  {unavailableCount}
                </strong>
              </div>

            </div>

          </header>

          {/* =================================
              BUSINESS SNAPSHOT
          ================================= */}

          <section className="menu-snapshot">

            <div className="snapshot-card">

              <div className="snapshot-icon orange">
                🍽️
              </div>

              <div>
                <span>Menu Items</span>
                <strong>
                  {foods.length}
                </strong>
              </div>

            </div>

            <div className="snapshot-card">

              <div className="snapshot-icon green">
                ✓
              </div>

              <div>
                <span>Available Now</span>
                <strong>
                  {availableCount}
                </strong>
              </div>

            </div>

            <div className="snapshot-card">

              <div className="snapshot-icon red">
                !
              </div>

              <div>
                <span>Out of Stock</span>
                <strong>
                  {unavailableCount}
                </strong>
              </div>

            </div>

            <div className="snapshot-card">

              <div className="snapshot-icon blue">
                ₹
              </div>

              <div>
                <span>Categories</span>
                <strong>
                  {categories.length}
                </strong>
              </div>

            </div>

          </section>

          {/* =================================
              ADD / EDIT FOOD
          ================================= */}

          <section
            className={`food-editor ${
              editingId
                ? "editing"
                : ""
            }`}
          >

            <div className="editor-heading">

              <div className="editor-heading-icon">
                {editingId
                  ? "✏️"
                  : "+"}
              </div>

              <div>
                <span>
                  {editingId
                    ? "EDIT MENU ITEM"
                    : "ADD MENU ITEM"}
                </span>

                <h2>
                  {editingId
                    ? "Update this dish"
                    : "Add a new dish"}
                </h2>

                <p>
                  Keep your customer menu
                  accurate and up to date.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}

            </div>

            <form
              className="food-editor-form"
              onSubmit={saveFood}
            >

              <div className="form-main">

                <div className="form-section-title">
                  BASIC INFORMATION
                </div>

                <div className="input-group">
                  <label>
                    Food name
                    <span>*</span>
                  </label>

                  <input
                    name="name"
                    type="text"
                    placeholder="Chicken Biryani"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="input-group">
                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    placeholder="Describe the dish, ingredients or what makes it special..."
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>

                <div className="form-two-columns">

                  <div className="input-group">
                    <label>
                      Price
                      <span>*</span>
                    </label>

                    <div className="price-input">
                      <span>₹</span>

                      <input
                        name="price"
                        type="number"
                        min="0"
                        placeholder="220"
                        value={form.price}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>
                      Category
                      <span>*</span>
                    </label>

                    <input
                      name="category"
                      type="text"
                      placeholder="Biryani"
                      value={form.category}
                      onChange={handleChange}
                    />
                  </div>

                </div>

                <label className="availability-control">

                  <input
                    name="available"
                    type="checkbox"
                    checked={
                      form.available
                    }
                    onChange={handleChange}
                  />

                  <span className="custom-checkbox">
                    {form.available
                      ? "✓"
                      : ""}
                  </span>

                  <span className="availability-copy">
                    <strong>
                      Available for customers
                    </strong>

                    <small>
                      Customers can order
                      this item from the
                      QR menu.
                    </small>
                  </span>

                </label>

              </div>

              {/* IMAGE UPLOAD */}

              <div className="image-upload-section">

                <div className="form-section-title">
                  FOOD IMAGE
                </div>

                <label
                  htmlFor="food-image-input"
                  className="image-upload-box"
                >

                  {preview ? (
                    <img
                      src={preview}
                      alt="Food preview"
                    />
                  ) : (
                    <div className="image-placeholder">

                      <div className="upload-icon">
                        📷
                      </div>

                      <strong>
                        Add food image
                      </strong>

                      <span>
                        Click to upload
                      </span>

                      <small>
                        JPG, PNG or WebP
                      </small>

                    </div>
                  )}

                  {preview && (
                    <div className="image-overlay">
                      <span>
                        Change image
                      </span>
                    </div>
                  )}

                </label>

                <input
                  id="food-image-input"
                  className="hidden-file-input"
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageChange
                  }
                />

              </div>

              <div className="editor-footer">

                <div className="editor-hint">
                  <span>💡</span>
                  <p>
                    Clear food images help
                    customers choose faster.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    uploading
                  }
                  className="save-food-button"
                >
                  {uploading
                    ? "Uploading image..."
                    : saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Add Food"}
                  <span>→</span>
                </button>

              </div>

            </form>

          </section>

          {/* =================================
              MENU LIST HEADER
          ================================= */}

          <section className="menu-items-section">

            <div className="menu-section-header">

              <div>
                <span className="section-eyebrow">
                  RESTAURANT MENU
                </span>

                <h2>
                  Menu items
                </h2>

                <p>
                  Control what your customers
                  see and order.
                </p>
              </div>

              <div className="menu-total">
                <strong>
                  {filteredFoods.length}
                </strong>

                <span>
                  of {foods.length} items
                </span>
              </div>

            </div>

            {/* =================================
                SEARCH + FILTERS
            ================================= */}

            <div className="menu-toolbar">

              <div className="search-wrapper">

                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() =>
                      setSearchQuery("")
                    }
                  >
                    ×
                  </button>
                )}

              </div>

              <div className="availability-filters">

                {[
                  "All",
                  "Available",
                  "Unavailable",
                ].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={
                      activeFilter === filter
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() =>
                      setActiveFilter(
                        filter
                      )
                    }
                  >
                    {filter}
                  </button>
                ))}

              </div>

            </div>

            {/* =================================
                CATEGORY FILTERS
            ================================= */}

            {categories.length > 0 && (
              <div className="category-filter-row">

                <button
                  type="button"
                  className={
                    activeCategory === "All"
                      ? "category-chip active"
                      : "category-chip"
                  }
                  onClick={() =>
                    setActiveCategory("All")
                  }
                >
                  All categories
                </button>

                {categories.map(
                  (category) => (
                    <button
                      type="button"
                      key={category}
                      className={
                        activeCategory ===
                        category
                          ? "category-chip active"
                          : "category-chip"
                      }
                      onClick={() =>
                        setActiveCategory(
                          category
                        )
                      }
                    >
                      {category}
                    </button>
                  )
                )}

              </div>
            )}

            {/* =================================
                NO RESULTS
            ================================= */}

            {filteredFoods.length === 0 ? (

              <div className="empty-menu">

                <div className="empty-menu-icon">
                  {foods.length === 0
                    ? "🍽️"
                    : "🔎"}
                </div>

                <h3>
                  {foods.length === 0
                    ? "Your menu is empty"
                    : "No menu items found"}
                </h3>

                <p>
                  {foods.length === 0
                    ? "Add your first dish above to start building your digital menu."
                    : "Try changing your search or filters."}
                </p>

                {foods.length === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      window.scrollTo({
                        top: 0,
                        behavior:
                          "smooth",
                      })
                    }
                    className="empty-action"
                  >
                    + Add your first food
                  </button>
                )}

              </div>

            ) : (

              /* =================================
                 FOOD GRID
              ================================= */

              <div className="professional-food-grid">

                {filteredFoods.map(
                  (food) => (

                    <article
                      className="professional-food-card"
                      key={food._id}
                    >

                      {/* IMAGE */}

                      <div className="professional-food-image">

                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                          />
                        ) : (
                          <div className="no-image">
                            🍽️
                          </div>
                        )}

                        <div
                          className={
                            food.available
                              ? "status-pill available"
                              : "status-pill unavailable"
                          }
                        >
                          <span />
                          {food.available
                            ? "Available"
                            : "Out of stock"}
                        </div>

                        <div className="category-overlay">
                          {food.category}
                        </div>

                      </div>

                      {/* INFO */}

                      <div className="professional-food-content">

                        <div className="food-name-price">

                          <h3>
                            {food.name}
                          </h3>

                          <strong>
                            ₹{food.price}
                          </strong>

                        </div>

                        <p className="food-description">
                          {food.description ||
                            "No description available."}
                        </p>

                        <div className="food-card-divider" />

                        <div className="food-card-actions">

                          <button
                            type="button"
                            className="card-edit-button"
                            onClick={() =>
                              startEditing(
                                food
                              )
                            }
                          >
                            <span>✏</span>
                            Edit
                          </button>

                          <button
                            type="button"
                            className={
                              food.available
                                ? "card-stock-button out"
                                : "card-stock-button in"
                            }
                            onClick={() =>
                              toggleAvailability(
                                food
                              )
                            }
                          >
                            {food.available
                              ? "Mark unavailable"
                              : "Make available"}
                          </button>

                          <button
                            type="button"
                            className="card-delete-button"
                            onClick={() =>
                              deleteFood(
                                food._id
                              )
                            }
                            title="Delete item"
                          >
                            🗑
                          </button>

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

          </section>

        </main>
      </div>
    </>
  );
}

/* =====================================================
   DINEFLOW MENU MANAGEMENT STYLES
   No external CSS file required.
===================================================== */

const styles = `
  * {
    box-sizing: border-box;
  }

  .food-management-page {
    min-height: 100vh;
    background: #f6f7f9;
    color: #171717;
    font-family:
      Inter,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .food-page-content {
    margin-left: 250px;
    padding: 42px 42px 70px;
    max-width: 1600px;
  }

  /* =============================================
     HEADER
  ============================================= */

  .food-page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 30px;
    margin-bottom: 28px;
  }

  .food-eyebrow,
  .section-eyebrow,
  .form-section-title {
    color: #f15a24;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
  }

  .food-page-header h1 {
    margin: 7px 0 8px;
    font-size: 34px;
    line-height: 1.1;
    letter-spacing: -1px;
    font-weight: 750;
  }

  .food-page-header p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .food-header-actions {
    display: flex;
    gap: 12px;
  }

  .header-mini-stat {
    min-width: 105px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 13px 16px;
  }

  .header-mini-stat span {
    display: block;
    color: #6b7280;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 5px;
  }

  .header-mini-stat strong {
    display: block;
    font-size: 20px;
    font-weight: 750;
  }

  .green-text {
    color: #16a34a;
  }

  .red-text {
    color: #dc2626;
  }

  /* =============================================
     SNAPSHOT
  ============================================= */

  .menu-snapshot {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 28px;
  }

  .snapshot-card {
    display: flex;
    align-items: center;
    gap: 13px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 17px;
  }

  .snapshot-icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    font-weight: 800;
  }

  .snapshot-icon.orange {
    background: #fff1eb;
    color: #f15a24;
  }

  .snapshot-icon.green {
    background: #ecfdf3;
    color: #16a34a;
  }

  .snapshot-icon.red {
    background: #fef2f2;
    color: #dc2626;
  }

  .snapshot-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .snapshot-card span {
    display: block;
    color: #6b7280;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .snapshot-card strong {
    display: block;
    font-size: 21px;
    font-weight: 750;
  }

  /* =============================================
     EDITOR
  ============================================= */

  .food-editor {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 36px;
  }

  .food-editor.editing {
    border-color: #f15a24;
    box-shadow:
      0 0 0 1px rgba(241, 90, 36, 0.08);
  }

  .editor-heading {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 24px;
    border-bottom: 1px solid #eef0f2;
  }

  .editor-heading-icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: #fff1eb;
    color: #f15a24;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .editor-heading span {
    display: block;
    color: #f15a24;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.4px;
    margin-bottom: 4px;
  }

  .editor-heading h2 {
    margin: 0 0 3px;
    font-size: 19px;
    font-weight: 750;
  }

  .editor-heading p {
    margin: 0;
    color: #737983;
    font-size: 12px;
  }

  .cancel-button {
    margin-left: auto;
    border: 1px solid #e1e4e8;
    background: #ffffff;
    color: #555b64;
    border-radius: 9px;
    padding: 9px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .cancel-button:hover {
    background: #f6f7f9;
  }

  .food-editor-form {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) 300px;
    gap: 28px;
    padding: 25px;
  }

  .form-main {
    min-width: 0;
  }

  .form-section-title {
    color: #737983;
    font-size: 10px;
    margin-bottom: 17px;
  }

  .input-group {
    margin-bottom: 17px;
  }

  .input-group label {
    display: block;
    margin-bottom: 7px;
    color: #272a2f;
    font-size: 12px;
    font-weight: 700;
  }

  .input-group label span {
    color: #f15a24;
    margin-left: 3px;
  }

  .input-group input,
  .input-group textarea {
    width: 100%;
    border: 1px solid #dfe2e6;
    background: #fbfcfd;
    color: #171717;
    border-radius: 9px;
    outline: none;
    font-family: inherit;
    font-size: 13px;
    transition:
      border-color 0.18s,
      box-shadow 0.18s,
      background 0.18s;
  }

  .input-group input {
    height: 43px;
    padding: 0 13px;
  }

  .input-group textarea {
    min-height: 92px;
    padding: 12px 13px;
    resize: vertical;
  }

  .input-group input:focus,
  .input-group textarea:focus {
    background: #ffffff;
    border-color: #f15a24;
    box-shadow:
      0 0 0 3px rgba(241, 90, 36, 0.09);
  }

  .input-group input::placeholder,
  .input-group textarea::placeholder {
    color: #a2a7ae;
  }

  .form-two-columns {
    display: grid;
    grid-template-columns:
      1fr 1fr;
    gap: 14px;
  }

  .price-input {
    position: relative;
  }

  .price-input > span {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    font-size: 13px;
    font-weight: 700;
    z-index: 1;
  }

  .price-input input {
    padding-left: 30px;
  }

  /* =============================================
     AVAILABILITY
  ============================================= */

  .availability-control {
    display: flex;
    align-items: center;
    gap: 11px;
    border: 1px solid #e3e6e9;
    background: #fafbfc;
    border-radius: 10px;
    padding: 13px;
    cursor: pointer;
    margin-top: 4px;
  }

  .availability-control input {
    display: none;
  }

  .custom-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    background: #ffffff;
    border: 1px solid #cdd2d8;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    background: #ffffff;
    font-size: 13px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .availability-control input:checked
    + .custom-checkbox {
    background: #16a34a;
    border-color: #16a34a;
  }

  .availability-copy strong {
    display: block;
    font-size: 12px;
    color: #292d32;
  }

  .availability-copy small {
    display: block;
    margin-top: 3px;
    color: #818791;
    font-size: 10px;
  }

  /* =============================================
     IMAGE
  ============================================= */

  .image-upload-section {
    min-width: 0;
  }

  .image-upload-box {
    position: relative;
    display: block;
    width: 100%;
    height: 238px;
    border: 1.5px dashed #d5d9de;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    background: #fafbfc;
  }

  .image-upload-box:hover {
    border-color: #f15a24;
    background: #fffaf7;
  }

  .image-upload-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .image-placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .upload-icon {
    width: 48px;
    height: 48px;
    border-radius: 13px;
    background: #fff1eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
    margin-bottom: 12px;
  }

  .image-placeholder strong {
    font-size: 13px;
    color: #30343a;
    margin-bottom: 4px;
  }

  .image-placeholder span {
    color: #f15a24;
    font-size: 11px;
    font-weight: 700;
  }

  .image-placeholder small {
    color: #a0a5ac;
    font-size: 10px;
    margin-top: 5px;
  }

  .image-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.42);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .image-upload-box:hover
    .image-overlay {
    opacity: 1;
  }

  .image-overlay span {
    color: #ffffff;
    background: rgba(0, 0, 0, 0.5);
    padding: 8px 12px;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 700;
  }

  .hidden-file-input {
    display: none;
  }

  /* =============================================
     EDITOR FOOTER
  ============================================= */

  .editor-footer {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    border-top: 1px solid #eef0f2;
    padding-top: 21px;
  }

  .editor-hint {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .editor-hint span {
    font-size: 16px;
  }

  .editor-hint p {
    margin: 0;
    color: #7a8088;
    font-size: 11px;
  }

  .save-food-button {
    border: 0;
    border-radius: 9px;
    background: #f15a24;
    color: #ffffff;
    padding: 12px 18px;
    min-width: 145px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
    box-shadow:
      0 5px 14px rgba(241, 90, 36, 0.18);
  }

  .save-food-button:hover:not(:disabled) {
    background: #dc4f1d;
    transform: translateY(-1px);
  }

  .save-food-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* =============================================
     MENU SECTION
  ============================================= */

  .menu-items-section {
    margin-top: 10px;
  }

  .menu-section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 20px;
  }

  .section-eyebrow {
    color: #f15a24;
    font-size: 10px;
  }

  .menu-section-header h2 {
    margin: 5px 0 4px;
    font-size: 23px;
    letter-spacing: -0.4px;
  }

  .menu-section-header p {
    margin: 0;
    color: #737983;
    font-size: 12px;
  }

  .menu-total {
    text-align: right;
  }

  .menu-total strong {
    display: block;
    font-size: 22px;
    font-weight: 750;
  }

  .menu-total span {
    color: #858b93;
    font-size: 10px;
  }

  /* =============================================
     TOOLBAR
  ============================================= */

  .menu-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 12px;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
    max-width: 430px;
  }

  .search-wrapper input {
    width: 100%;
    height: 42px;
    border: 1px solid #e1e4e8;
    background: #ffffff;
    border-radius: 9px;
    padding: 0 38px;
    outline: none;
    color: #171717;
    font-family: inherit;
    font-size: 12px;
  }

  .search-wrapper input:focus {
    border-color: #f15a24;
    box-shadow:
      0 0 0 3px rgba(241, 90, 36, 0.08);
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #8c9299;
    font-size: 19px;
  }

  .clear-search {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    border: 0;
    background: #eef0f2;
    color: #626870;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
  }

  .availability-filters {
    display: flex;
    gap: 4px;
    background: #ffffff;
    border: 1px solid #e1e4e8;
    border-radius: 9px;
    padding: 4px;
  }

  .filter-button {
    border: 0;
    background: transparent;
    color: #727881;
    border-radius: 6px;
    padding: 7px 12px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 650;
    cursor: pointer;
  }

  .filter-button:hover {
    color: #171717;
  }

  .filter-button.active {
    background: #171717;
    color: #ffffff;
  }

  /* =============================================
     CATEGORY CHIPS
  ============================================= */

  .category-filter-row {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    padding: 2px 0 18px;
    scrollbar-width: none;
  }

  .category-filter-row::-webkit-scrollbar {
    display: none;
  }

  .category-chip {
    flex-shrink: 0;
    border: 1px solid #e1e4e8;
    background: #ffffff;
    color: #666d75;
    border-radius: 20px;
    padding: 7px 12px;
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }

  .category-chip:hover {
    border-color: #f15a24;
    color: #f15a24;
  }

  .category-chip.active {
    border-color: #f15a24;
    background: #fff1eb;
    color: #e64e18;
  }

  /* =============================================
     FOOD GRID
  ============================================= */

  .professional-food-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 17px;
  }

  .professional-food-card {
    background: #ffffff;
    border: 1px solid #e4e7ea;
    border-radius: 14px;
    overflow: hidden;
    transition:
      transform 0.2s,
      box-shadow 0.2s,
      border-color 0.2s;
  }

  .professional-food-card:hover {
    transform: translateY(-2px);
    border-color: #d8dce0;
    box-shadow:
      0 10px 25px rgba(20, 24, 30, 0.07);
  }

  .professional-food-image {
    position: relative;
    height: 185px;
    background: #f1f3f5;
    overflow: hidden;
  }

  .professional-food-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s;
  }

  .professional-food-card:hover
    .professional-food-image img {
    transform: scale(1.035);
  }

  .no-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 43px;
    background: #f3f4f6;
  }

  .status-pill {
    position: absolute;
    top: 11px;
    left: 11px;
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 20px;
    padding: 5px 9px;
    font-size: 9px;
    font-weight: 800;
    backdrop-filter: blur(8px);
  }

  .status-pill span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-pill.available {
    background: rgba(236, 253, 243, 0.94);
    color: #15803d;
  }

  .status-pill.available span {
    background: #16a34a;
  }

  .status-pill.unavailable {
    background: rgba(254, 242, 242, 0.94);
    color: #b91c1c;
  }

  .status-pill.unavailable span {
    background: #dc2626;
  }

  .category-overlay {
    position: absolute;
    right: 11px;
    bottom: 11px;
    background: rgba(23, 23, 23, 0.72);
    color: #ffffff;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 9px;
    font-weight: 700;
    backdrop-filter: blur(5px);
  }

  .professional-food-content {
    padding: 15px;
  }

  .food-name-price {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .food-name-price h3 {
    margin: 0;
    color: #171717;
    font-size: 15px;
    line-height: 1.25;
    font-weight: 750;
  }

  .food-name-price strong {
    color: #f15a24;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 800;
  }

  .food-description {
    margin: 8px 0 0;
    min-height: 34px;
    color: #777e86;
    font-size: 11px;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .food-card-divider {
    height: 1px;
    background: #eef0f2;
    margin: 13px 0;
  }

  .food-card-actions {
    display: grid;
    grid-template-columns:
      1fr 1fr 34px;
    gap: 6px;
  }

  .card-edit-button,
  .card-stock-button,
  .card-delete-button {
    height: 33px;
    border-radius: 7px;
    font-family: inherit;
    font-size: 9px;
    font-weight: 750;
    cursor: pointer;
  }

  .card-edit-button {
    border: 1px solid #e0e3e7;
    background: #ffffff;
    color: #555b63;
  }

  .card-edit-button:hover {
    border-color: #f15a24;
    color: #f15a24;
  }

  .card-stock-button {
    border: 1px solid transparent;
  }

  .card-stock-button.out {
    background: #fff7ed;
    border-color: #fed7aa;
    color: #c2410c;
  }

  .card-stock-button.in {
    background: #ecfdf3;
    border-color: #bbf7d0;
    color: #15803d;
  }

  .card-delete-button {
    border: 1px solid #fee2e2;
    background: #fef2f2;
    color: #dc2626;
  }

  .card-delete-button:hover {
    background: #fee2e2;
  }

  /* =============================================
     EMPTY STATE
  ============================================= */

  .empty-menu {
    background: #ffffff;
    border: 1px dashed #d7dbe0;
    border-radius: 16px;
    padding: 65px 20px;
    text-align: center;
  }

  .empty-menu-icon {
    width: 62px;
    height: 62px;
    margin: 0 auto 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff1eb;
    border-radius: 17px;
    font-size: 27px;
  }

  .empty-menu h3 {
    margin: 0 0 6px;
    font-size: 16px;
  }

  .empty-menu p {
    margin: 0;
    color: #7d838b;
    font-size: 12px;
  }

  .empty-action {
    margin-top: 17px;
    border: 0;
    background: #f15a24;
    color: #ffffff;
    border-radius: 8px;
    padding: 10px 15px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  /* =============================================
     LOADING
  ============================================= */

  .food-loading-state {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .loading-spinner {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff1eb;
    font-size: 28px;
    margin-bottom: 18px;
  }

  .food-loading-state h2 {
    margin: 0 0 7px;
    font-size: 20px;
  }

  .food-loading-state p {
    margin: 0;
    color: #7b8189;
    font-size: 12px;
  }

  /* =============================================
     RESPONSIVE
  ============================================= */

  @media (max-width: 1200px) {
    .professional-food-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .food-editor-form {
      grid-template-columns:
        minmax(0, 1fr) 260px;
    }
  }

  @media (max-width: 1000px) {
    .food-page-content {
      padding: 32px 25px 60px;
    }

    .menu-snapshot {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .food-page-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .food-header-actions {
      width: 100%;
    }

    .header-mini-stat {
      flex: 1;
    }
  }

  @media (max-width: 800px) {
    .food-page-content {
      margin-left: 0;
      padding: 25px 18px 50px;
    }

    .food-editor-form {
      grid-template-columns: 1fr;
    }

    .image-upload-box {
      height: 220px;
    }

    .editor-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .save-food-button {
      width: 100%;
    }
  }

  @media (max-width: 650px) {
    .food-page-header h1 {
      font-size: 27px;
    }

    .food-header-actions {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
    }

    .header-mini-stat {
      min-width: 0;
      padding: 11px;
    }

    .header-mini-stat strong {
      font-size: 17px;
    }

    .menu-snapshot {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .snapshot-card {
      padding: 13px;
    }

    .menu-toolbar {
      flex-direction: column;
    }

    .search-wrapper {
      max-width: none;
    }

    .availability-filters {
      width: 100%;
    }

    .filter-button {
      flex: 1;
    }

    .professional-food-grid {
      grid-template-columns: 1fr;
    }

    .form-two-columns {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .menu-section-header {
      align-items: flex-start;
    }
  }

  @media (max-width: 480px) {
    .food-page-content {
      padding: 20px 13px 40px;
    }

    .food-page-header h1 {
      font-size: 24px;
    }

    .food-header-actions {
      gap: 6px;
    }

    .header-mini-stat {
      padding: 9px;
    }

    .header-mini-stat span {
      font-size: 9px;
    }

    .header-mini-stat strong {
      font-size: 16px;
    }

    .menu-snapshot {
      gap: 8px;
    }

    .snapshot-card {
      gap: 9px;
      padding: 11px;
    }

    .snapshot-icon {
      width: 35px;
      height: 35px;
      font-size: 14px;
    }

    .snapshot-card span {
      font-size: 9px;
    }

    .snapshot-card strong {
      font-size: 17px;
    }

    .editor-heading {
      padding: 17px;
    }

    .food-editor-form {
      padding: 17px;
    }

    .editor-heading p {
      display: none;
    }

    .cancel-button {
      padding: 7px 9px;
    }

    .professional-food-image {
      height: 200px;
    }

    .food-card-actions {
      grid-template-columns:
        1fr 1fr 34px;
    }
  }
`;

export default FoodManagement;