// Entry point for the modular content script when built with Vite.
// This initializes all features and wires them together.

import { initialize } from "./core/initialization.js";

// Initialize the extension
initialize();
