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
      afterSignOutUrl="/"
      afterSignInUrl="/app.html"
      afterSignUpUrl="/app.html"
      signInFallbackRedirectUrl="/app.html"
      signUpFallbackRedirectUrl="/app.html"
    >
      <App />
    </ClerkProvider>
  </StrictMode>
);
