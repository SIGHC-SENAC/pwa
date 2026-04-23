import readline from "readline";
import { auth_firebase, db } from "../config/firebase.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function perguntar(pergunta) {
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => resolve(resposta));
  });
}

async function criarAluno() {
  try {
    const nome = await perguntar("Nome do aluno: ");
    const email = await perguntar("Email: ");
    const senha = await perguntar("Senha: ");

    // cria no Firebase Auth
    const user = await auth_firebase.createUser({
      email,
      password: senha,
      displayName: nome,
    });

    try {
      // define custom claim
      await auth_firebase.setCustomUserClaims(user.uid, {
        role: "aluno",
      });

      // salva no Firestore
      await db.collection("users").doc(user.uid).set({
        nome,
        email,
        role: "aluno",
        createdAt: Date.now(),
      });

      console.log("\n✅ Aluno criado com sucesso!");
      console.log("UID:", user.uid);

    } catch (firestoreError) {
      // rollback se falhar firestore
      await auth_firebase.deleteUser(user.uid);

      console.error("\nErro Firestore:", firestoreError.message);
    }

    rl.close();

  } catch (error) {
    console.error("\nErro Auth:", error.message);
    rl.close();
  }
}

criarAluno();