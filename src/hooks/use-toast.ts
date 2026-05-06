// Importações do React
import * as React from "react";

// Importações de tipos do componente Toast
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// Limite máximo de toasts exibidos simultaneamente
const TOAST_LIMIT = 1;
// Tempo de espera antes de remover o toast (em ms)
const TOAST_REMOVE_DELAY = 1000000;

/**
 * Type para um toast (notificação) customizado
 */
type ToasterToast = ToastProps & {
  // ID único do toast
  id: string;
  // Título do toast
  title?: React.ReactNode;
  // Descrição/conteúdo do toast
  description?: React.ReactNode;
  // Ação opcional (botão) do toast
  action?: ToastActionElement;
};

/**
 * Tipos de ações que podem ser disparadas no reducer
 */
const actionTypes = {
  // Ação para adicionar novo toast
  ADD_TOAST: "ADD_TOAST",
  // Ação para atualizar toast existente
  UPDATE_TOAST: "UPDATE_TOAST",
  // Ação para descartar/fechar toast
  DISMISS_TOAST: "DISMISS_TOAST",
  // Ação para remover toast da memória
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

// Contador para gerar IDs únicos para toasts
let count = 0;

/**
 * Gera ID único para cada toast
 * @returns String com ID único
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// Type para os tipos de ação
type ActionType = typeof actionTypes;

/**
 * Type para as diferentes ações que podem ser despachadas
 */
type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

/**
 * Interface para o estado dos toasts
 */
interface State {
  // Array de toasts ativos
  toasts: ToasterToast[];
}

// Map para armazenar timeouts de remoção de toasts
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Adiciona toast à fila de remoção
 * Agenda a remoção do toast após o tempo de espera
 * @param toastId - ID do toast a remover
 */
const addToRemoveQueue = (toastId: string) => {
  // Verifica se já está agendado
  if (toastTimeouts.has(toastId)) {
    return;
  }

  // Cria timeout para remover toast
  const timeout = setTimeout(() => {
    // Remove do map de timeouts
    toastTimeouts.delete(toastId);
    // Dispara ação de remover
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  // Armazena timeout para referência futura
  toastTimeouts.set(toastId, timeout);
};

/**
 * Reducer para gerenciar estado dos toasts
 * @param state - Estado atual
 * @param action - Ação a executar
 * @returns Novo estado
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    // Adiciona novo toast ao topo do array (limita a 1)
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    // Atualiza toast existente
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    // Descarta/fecha toast(s)
    case "DISMISS_TOAST": {
      const { toastId } = action;

      // Se toastId foi informado, remove apenas esse
      // Caso contrário, remove todos
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      // Atualiza estado dos toasts para closed
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    
    // Remove toast da memória
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

// Array de listeners que serão chamados quando estado mudar
const listeners: Array<(state: State) => void> = [];

// Estado em memória dos toasts (não vinculado a nenhum componente)
let memoryState: State = { toasts: [] };

/**
 * Dispara uma ação no reducer
 * Atualiza estado em memória e notifica todos os listeners
 * @param action - Ação a executar
 */
function dispatch(action: Action) {
  // Executa reducer e atualiza estado em memória
  memoryState = reducer(memoryState, action);
  // Notifica todos os listeners do novo estado
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// Type para um toast (sem ID, pois será gerado)
type Toast = Omit<ToasterToast, "id">;

/**
 * Função para criar e exibir um toast
 * @param props - Props do toast (título, descrição, etc)
 * @returns Objeto com id, dismiss e update
 */
function toast({ ...props }: Toast) {
  // Gera ID único
  const id = genId();

  /**
   * Função para atualizar o toast
   */
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  
  /**
   * Função para descartar o toast
   */
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  // Dispara ação para adicionar novo toast
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      // Quando o toast for fechado, chama dismiss
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

/**
 * Hook customizado para gerenciar toasts
 * Sincroniza estado local com estado global em memória
 * @returns Objeto com estado, função toast e dismiss
 */
function useToast() {
  // Estado local que sincroniza com memoryState
  const [state, setState] = React.useState<State>(memoryState);

  /**
   * Effect que registra listener para atualizações de memoryState
   */
  React.useEffect(() => {
    // Adiciona setState como listener
    listeners.push(setState);
    
    // Cleanup: remove listener ao desmontar
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    // Spread do estado (toasts)
    ...state,
    // Função para criar novo toast
    toast,
    // Função para descartar toast(s)
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

// Exporta hook e função toast
export { useToast, toast };
