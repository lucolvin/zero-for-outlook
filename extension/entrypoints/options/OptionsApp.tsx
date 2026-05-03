import { useEffect, useRef } from "react";
import "../../src/options/style.css";
import optionsTemplate from "../../src/options/index.html?raw";

function getLegacyOptionsMarkup() {
  return optionsTemplate
    .replace(/<!doctype html>/i, "")
    .replace(/<html[\s\S]*?<body>/i, "")
    .replace(/<\/body>[\s\S]*<\/html>/i, "")
    .replace(/<script[^>]*src=["']main\.js["'][^>]*><\/script>/i, "");
}

export function OptionsApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = getLegacyOptionsMarkup();
    import("../../src/options/main.ts");
  }, []);

  return <div ref={containerRef} />;
}
