// Importa função para criar raiz do React
import { createRoot } from "react-dom/client";
// Importa o componente raiz da aplicação
import App from "./App.tsx";
// Importa estilos globais
import "./index.css";

// Renderiza o componente App na raiz do DOM
createRoot(document.getElementById("root")!).render(<App />);
