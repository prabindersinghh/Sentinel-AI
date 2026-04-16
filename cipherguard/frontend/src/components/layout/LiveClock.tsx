"use client";
import React, { useEffect, useState } from "react";

export default function LiveClock() {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return <span className="font-mono text-blue-900 text-lg" id="live-clock">{clock}</span>;
}
