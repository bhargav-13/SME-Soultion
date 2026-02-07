import React from "react";
import ItemCard from "../components/ItemCard";

const ItemsDetailsSection = ({ items, onItemsChange, disabled = false }) => {
  const removeItem = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      onItemsChange(updatedItems);
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [name.split("_")[0]]: value,
    };
    onItemsChange(updatedItems);
  };

  return (
    <>
      {items.map((item, index) => (
        <div key={index} className="mb-4">
          <ItemCard
            item={item}
            index={index}
            onChange={handleItemChange}
            onRemove={removeItem}
            canRemove={items.length > 1}
            disabled={disabled}
          />
        </div>
      ))}
    </>
  );
};

export default ItemsDetailsSection;

