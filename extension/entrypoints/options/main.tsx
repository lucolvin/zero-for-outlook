import React from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./OptionsApp";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element for options app");
}

createRoot(root).render(<OptionsApp />);
