import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme before render to avoid flash
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(<App />);

// The registration is handled automatically by vite-plugin-pwa via injectRegister: 'auto'
// or by importing the virtual module if you want more control.
// We'll let Vite PWA handle it to ensure the service worker name and path are correct.
