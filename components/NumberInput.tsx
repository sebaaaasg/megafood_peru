// components/NumberInputSimple.tsx
"use client";
import { useState, useEffect } from "react";

interface NumberInputSimpleProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function NumberInputSimple({ 
  value, 
  onChange, 
  placeholder = "0", 
  className = "",
  disabled = false
}: NumberInputSimpleProps) {
  const [textValue, setTextValue] = useState<string>(() => {
    if (value === 0) return "";
    return value.toString();
  });

  useEffect(() => {
    // Solo actualizar si el valor externo cambió y es diferente
    const currentNum = textValue === "" ? 0 : parseFloat(textValue);
    if (value !== currentNum && !isNaN(value)) {
      if (value === 0) {
        setTextValue("");
      } else {
        setTextValue(value.toString());
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Validar que solo contenga números y punto decimal
    if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
      setTextValue(newValue);
      
      // Convertir a número
      let num = 0;
      if (newValue !== "" && newValue !== ".") {
        num = parseFloat(newValue);
        if (isNaN(num)) num = 0;
      }
      
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={textValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}