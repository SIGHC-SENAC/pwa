// Importações para obtér informações de rota e efeitos
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * Página NotFound (404)
 * Exibida quando usuário tenta acessar rota inexistente
 */
const NotFound = () => {
  // Obtém informação da localização atual (rota tentada)
  const location = useLocation();

  /**
   * Effect que loga erro quando página não é encontrada
   */
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        {/* Número do erro 404 */}
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        {/* Mensagem de erro */}
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        {/* Link para voltar ao home */}
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

// Exporta componente NotFound como padrão
export default NotFound;
