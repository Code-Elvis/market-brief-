import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk publishable key");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      afterSignInUrl="https://marketdebriefs.com/app.html"
      afterSignUpUrl="https://marketdebriefs.com/app.html"
      afterSignOutUrl="https://marketdebriefs.com"
      isSatellite={false}
      domain={import.meta.env.VITE_CLERK_DOMAIN}
    >
      <App />
    </ClerkProvider>
  </StrictMode>
);
