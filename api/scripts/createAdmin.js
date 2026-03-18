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

async function criarAdmin() {
  try {
    const nome = await perguntar("Nome do admin: ");
    const email = await perguntar("Email: ");
    const senha = await perguntar("Senha: ");

    const user = await auth_firebase.createUser({
      email,
      password: senha,
      displayName: nome,
    });

    await auth_firebase.setCustomUserClaims(user.uid, {
      role: "admin",
    });

    await db.collection("users").doc(user.uid).set({
      nome,
      email,
      role: "admin",
      createdAt: Date.now(),
    });

    console.log("\n✅ Admin criado com sucesso!");
    console.log("UID:", user.uid);

    rl.close();
  } catch (error) {
    console.error("\nErro:", error.message);
    rl.close();
  }
}

criarAdmin();