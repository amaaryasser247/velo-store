import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { initI18n } from "./i18n";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/cairo/wght.css";
import "./index.css";

// Language, translations and <html lang/dir> are settled before the first
// render, so there is never a flash of the wrong language or direction.
initI18n();

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error('Root element "#root" was not found in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
