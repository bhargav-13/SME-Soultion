import React from "react";
import PackingCard from "../components/PackingCard";

const PackingDetailsSection = ({ packings, onPackingsChange, disabled = false }) => {
  const removePacking = (index) => {
    if (packings.length > 1) {
      const updatedPackings = packings.filter((_, i) => i !== index);
      onPackingsChange(updatedPackings);
    }
  };

  const handlePackingChange = (index, e) => {
    const { name, value } = e.target;
    const updatedPackings = [...packings];
    updatedPackings[index] = {
      ...updatedPackings[index],
      [name.split("_")[0]]: value,
    };
    onPackingsChange(updatedPackings);
  };

  return (
    <>
      {packings.map((packing, index) => (
        <div key={index} className="mb-4">
          <PackingCard
            item={packing}
            index={index}
            onChange={handlePackingChange}
            onRemove={removePacking}
            canRemove={packings.length > 1}
            disabled={disabled}
          />
        </div>
      ))}
    </>
  );
};

export default PackingDetailsSection;

