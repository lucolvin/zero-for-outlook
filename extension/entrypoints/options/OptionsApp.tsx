import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SnippetsManagerApp } from "../../src/options/SnippetsManagerApp";
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
  const snippetsRootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = getLegacyOptionsMarkup();
    void import("../../src/options/main.ts");

    const mountSnippets = () => {
      const el = document.getElementById("oz-snippets-react-root");
      if (!el || snippetsRootRef.current) return;
      snippetsRootRef.current = createRoot(el);
      snippetsRootRef.current.render(<SnippetsManagerApp />);
    };

    const t = window.setTimeout(mountSnippets, 0);
    return () => {
      window.clearTimeout(t);
      snippetsRootRef.current?.unmount();
      snippetsRootRef.current = null;
    };
  }, []);

  return <div ref={containerRef} />;
}
