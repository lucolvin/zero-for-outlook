import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import {
  RouterProvider,
  createRouter
} from "@tanstack/react-router";
import { routeTree } from "./router";
import { firebaseApp } from "./lib/firebase";
import "./styles.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient
  }
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set");
}

// Ensure web Firebase config is valid at startup.
void firebaseApp;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
);
