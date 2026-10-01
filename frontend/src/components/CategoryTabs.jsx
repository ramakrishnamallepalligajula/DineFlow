function CategoryTabs({ categories, selectedCategory, onSelect }) {
  return (
    <div className="category-tabs">
      {categories.map((category) => (
        <button
          key={category}
          className={
            selectedCategory === category ? "active" : ""
          }
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;