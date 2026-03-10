import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Firebase Messaging SW
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((reg) => console.info("[SW] Firebase Messaging SW registrado:", reg.scope))
    .catch((err) => console.warn("[SW] Falha ao registrar Firebase Messaging SW:", err));
}

createRoot(document.getElementById("root")!).render(<App />);
