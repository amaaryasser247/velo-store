import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Set BASE_PATH (for example "/velo-store/") when deploying under a sub-path
// such as GitHub Pages project sites. Defaults to the domain root.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
});
