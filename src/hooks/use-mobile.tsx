// Importações do React
import * as React from "react";

// Breakpoint para considerar como mobile (em pixels)
const MOBILE_BREAKPOINT = 768;

/**
 * Hook customizado que detecta se a tela é mobile
 * Monitora mudanças no tamanho da tela e atualiza automaticamente
 * @returns true se a largura da tela é menor que o breakpoint, false caso contrário
 */
export function useIsMobile() {
  // Estado para armazenar se é mobile
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  /**
   * Effect que configura media query para detectar mudanças de tamanho
   * Listeners são registrados para atualizar estado quando tela muda
   */
  React.useEffect(() => {
    // Cria media query para detectar telas menores que 768px
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Callback chamado quando media query muda
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Registra listener para mudanças
    mql.addEventListener("change", onChange);
    // Define valor inicial
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Cleanup: remove listener ao desmontar
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Retorna booleano (false se undefined)
  return !!isMobile;
}
