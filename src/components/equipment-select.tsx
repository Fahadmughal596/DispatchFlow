"use client";

import { useMemo, useState } from "react";

export type EquipmentOption = {
  id: number;
  name: string;
  commissionBps: number;
};

export function EquipmentSelect({
  options,
  defaultValue,
  name = "equipmentCategoryId",
  required = true
}: {
  options: EquipmentOption[];
  defaultValue?: number | null;
  name?: string;
  required?: boolean;
}) {
  const [selected, setSelected] = useState(defaultValue ? String(defaultValue) : "");
  const selectedOption = useMemo(
    () => options.find((option) => String(option.id) === selected),
    [options, selected]
  );

  return (
    <div className="equipment-select-wrap">
      <select name={name} value={selected} onChange={(event) => setSelected(event.target.value)} required={required}>
        <option value="">Select equipment</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} — {(option.commissionBps / 100).toFixed(2)}% commission
          </option>
        ))}
      </select>
      <div className={`commission-preview ${selectedOption ? "visible" : ""}`} aria-live="polite">
        <span>Applicable commission</span>
        <strong>{selectedOption ? `${(selectedOption.commissionBps / 100).toFixed(2)}%` : "Select equipment"}</strong>
      </div>
    </div>
  );
}
