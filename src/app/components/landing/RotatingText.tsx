"use client";

import { useState, useEffect } from "react";

const words = [
  { text: "Multi-Agent AI", color: "text-solana-purple" },
  { text: "104 Patterns", color: "text-solana-green" },
  { text: "Zero-Day Ready", color: "text-solana-blue" },
  { text: "Lightning Fast", color: "text-solana-purple" },
];

export default function RotatingText() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setVisible(true);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const currentWord = words[index];

  return (
    <span
      className={`inline-block font-bold transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      } ${currentWord.color}`}
    >
      {currentWord.text}
    </span>
  );
}
