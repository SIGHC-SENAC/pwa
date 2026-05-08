// Importações do React para criar contexto
import React, { createContext, useContext, useEffect, useState } from "react";
// Importações do Firebase Authentication
import { User, onAuthStateChanged } from "firebase/auth";
// Importações do Firestore para buscar dados do usuário
import { doc, getDoc } from "firebase/firestore";
// Importa instâncias do Firebase
import { auth, db } from "@/lib/firebase";
import { requestPermissionAndGetToken } from "@/services/fcmService";

/**
 * Interface que define a estrutura dos dados do usuário no banco de dados
 */
interface UserData {
  // Nome completo do usuário
  nome: string;
  // Email do usuário
  email: string;
  // Papel/função do usuário (aluno, admin, superAdmin)
  role: string;
  // ID do curso (para alunos)
  cursoId?: string;
  // Nome do curso
  cursoNome?: string;
  // Código do curso
  cursoCodigo?: string;
  // Array de IDs de cursos (para usuários com múltiplos cursos)
  cursoIds?: string[];
  // Array de objetos com informações dos cursos
  cursos?: Array<{ id: string; nome: string; codigo?: string; turno?: string }>;
  // Timestamp de criação da conta
  createdAt: number;
  // ID do usuário que criou a conta (admin)
  createdBy: string;
}

/**
 * Interface que define o tipo do contexto de autenticação
 */
interface AuthContextType {
  // Usuário autenticado do Firebase
  user: User | null;
  // Dados adicionais do usuário armazenados no Firestore
  userData: UserData | null;
  // Status de carregamento dos dados
  loading: boolean;
  // Booleano indicando se o usuário é aluno
  isAluno: boolean;
  // Booleano indicando se o usuário é super admin
  isSuperAdmin: boolean;
}

/**
 * Cria o contexto de autenticação com valores padrão
 */
const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAluno: false,
  isSuperAdmin: false,
});

/**
 * Hook customizado para acessar o contexto de autenticação
 * Deve ser usado dentro do AuthProvider
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Provider de autenticação
 * Gerencia o estado de autenticação e dados do usuário
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado para armazenar o usuário autenticado do Firebase
  const [user, setUser] = useState<User | null>(null);
  // Estado para armazenar os dados do usuário
  const [userData, setUserData] = useState<UserData | null>(null);
  // Estado para controlar o status de carregamento
  const [loading, setLoading] = useState(true);

  /**
   * Effect que observa mudanças de autenticação
   * Se o usuário fizer login, busca seus dados do Firestore
   * Se fizer logout, limpa os dados
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Atualiza o usuário autenticado
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Força atualização do token para obter claims customizadas mais recentes
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          // Extrai o papel (role) das claims customizadas
          const claimRole = tokenResult.claims.role as string | undefined;

          // Busca documento do usuário no Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            // Se o documento existe, usa os dados do Firestore
            setUserData(userDoc.data() as UserData);
          } else {
            // Fallback: monta userData a partir do Auth + claims
            setUserData({
              nome: firebaseUser.displayName || "",
              email: firebaseUser.email || "",
              role: claimRole || "",
              createdAt: 0,
              createdBy: "",
            });
          }
        } catch (error) {
          // Se houver erro ao buscar documento
          console.error("Erro ao buscar dados do usuário:", error);
          
          try {
            // Tenta fallback com claims do token
            const tokenResult = await firebaseUser.getIdTokenResult();
            const claimRole = tokenResult.claims.role as string | undefined;
            setUserData({
              nome: firebaseUser.displayName || "",
              email: firebaseUser.email || "",
              role: claimRole || "",
              createdAt: 0,
              createdBy: "",
            });
          } catch {
            // Se falhar, deixa userData como nulo
            setUserData(null);
          }
        }
      } else {
        // Se não há usuário autenticado, limpa os dados
        setUserData(null);
      }
      
      // Finaliza o carregamento
      setLoading(false);
    });

    // Retorna função para desinscrever do listener
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid || !userData?.role) return;

    requestPermissionAndGetToken(user.uid).catch(() => {});
  }, [user?.uid, userData?.role]);

  /**
   * Calcula se o usuário é aluno
   * Baseado no papel (role) do usuário
   */
  const isAluno = userData?.role === "aluno";
  
  /**
   * Calcula se o usuário é super admin
   * Baseado no papel (role) do usuário
   */
  const isSuperAdmin = userData?.role === "superAdmin";

  /**
   * Fornece o contexto com todos os valores para os filhos
   */
  return (
    <AuthContext.Provider value={{ user, userData, loading, isAluno, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
