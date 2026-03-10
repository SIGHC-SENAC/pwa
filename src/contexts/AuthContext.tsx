import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserData {
  nome: string;
  email: string;
  role: string;
  createdAt: number;
  createdBy: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAluno: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAluno: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Force token refresh to get latest custom claims
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const claimRole = tokenResult.claims.role as string | undefined;

          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            // Fallback: build userData from Auth + claims
            setUserData({
              nome: firebaseUser.displayName || "",
              email: firebaseUser.email || "",
              role: claimRole || "",
              createdAt: 0,
              createdBy: "",
            });
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          // Fallback on error: use custom claims
          try {
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
            setUserData(null);
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAluno = userData?.role === "aluno";

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAluno }}>
      {children}
    </AuthContext.Provider>
  );
};
