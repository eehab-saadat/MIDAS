"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  delay?: number;
  minLength?: number;
  className?: string;
  isLoading?: boolean;
}

export function SearchInput({
  placeholder = "Search...",
  onSearch,
  delay = 300,
  minLength = 1,
  className = "",
  isLoading = false,
}: SearchInputProps) {
  const [value, setValue] = useState("");
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    if (debouncedValue.length >= minLength || debouncedValue.length === 0) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, minLength, onSearch]);

  return (
    <label className={`input ${className}`}>
      <svg
        className="h-4 w-4 opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {isLoading && <span className="loading loading-spinner loading-xs" />}
    </label>
  );
}
