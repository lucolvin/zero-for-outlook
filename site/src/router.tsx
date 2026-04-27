import { Link } from "@tanstack/react-router";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from "@tanstack/react-router";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
  useAuth
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

type ExtensionFlowStatus = {
  ok: boolean;
  state?: string;
  extensionToken?: string;
  expiresAt?: number;
  error?: string;
};

async function completeExtensionFlow(deviceCode: string, getToken: () => Promise<string | null>) {
  const token = await getToken();
  if (!token) {
    throw new Error("You must be signed in to link this extension.");
  }

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/extension-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ deviceCode })
  });

  const payload = (await res.json()) as ExtensionFlowStatus;
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || "Could not issue extension token.");
  }
  return payload;
}

function Layout() {
  return (
    <div className="app">
      <header className="header">
        <h1>Account</h1>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <div className="card">
      <h2>Cloud Sync</h2>
      <p>Sign in to enable account-backed settings sync for the browser extension.</p>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="button">Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <p>You are signed in. Go back to the extension and click "Sync now".</p>
        <div className="signout-actions">
          <p className="help-muted">End your session in this browser, or leave it active for quicker sign-in.</p>
          <div className="button-row">
            <SignOutButton redirectUrl="/">
              <button type="button" className="button button-secondary">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}

function ExtensionLinkPage() {
  const { getToken } = useAuth();
  const search = new URLSearchParams(window.location.search);
  const deviceCode = search.get("device_code") || "";

  const query = useQuery({
    queryKey: ["extension-link", deviceCode],
    enabled: Boolean(deviceCode),
    queryFn: () => completeExtensionFlow(deviceCode, getToken)
  });

  if (!deviceCode) {
    return (
      <div className="card">
        <h2>Invalid link</h2>
        <p>This extension-link URL is missing a device code.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Link extension</h2>
      <SignedOut>
        <p>Please sign in first. After sign in, this page will complete linking automatically.</p>
        <SignInButton mode="modal">
          <button className="button">Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        {query.isPending && <p>Linking your extension session...</p>}
        {query.isError && <p className="error">{(query.error as Error).message}</p>}
        {query.isSuccess && (
          <>
            <p>
              Extension linked. You can return to the extension and continue.
            </p>
            <div className="signout-actions">
              <div className="button-row">
                <SignOutButton redirectUrl="/">
                  <button type="button" className="button button-secondary">
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            </div>
          </>
        )}
      </SignedIn>
    </div>
  );
}

/**
 * Optional Clerk sign-out after the extension has already cleared its own session locally.
 */
function ExtensionClerkLogoutPage() {
  return (
    <div className="card">
      <h2>Browser web session</h2>
      <p>
        The extension is already disconnected on this browser. If you previously signed in here, you may still have a
        valid session. Use the button below to end that session, or close this window if you want to
        stay signed in.
      </p>
      <SignedIn>
        <div className="button-row">
          <SignOutButton redirectUrl="/">
            <button type="button" className="button">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </SignedIn>
      <SignedOut>
        <p className="help-muted">
          You do not appear to have an active session in this browser. You can close this window.
        </p>
      </SignedOut>
      <p className="help-muted logout-page-footer-link">
        <Link to="/" className="logout-page-link">
          Back to account home
        </Link>
      </p>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: Layout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage
});

const extensionLinkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/extension-link",
  component: ExtensionLinkPage
});

const extensionClerkLogoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logout",
  component: ExtensionClerkLogoutPage
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  extensionLinkRoute,
  extensionClerkLogoutRoute
]);

export const router = createRouter({
  routeTree
});
