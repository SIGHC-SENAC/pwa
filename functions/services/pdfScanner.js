import fs from "fs/promises";

const MAX_BYTES = 10 * 1024 * 1024;

export async function validarCabecalhoPdf(filePath) {
  const file = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(5);
    await file.read(buffer, 0, 5, 0);
    return buffer.toString() === "%PDF-";
  } finally {
    await file.close();
  }
}

export async function validarTamanho(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size <= MAX_BYTES;
}

export async function analisarPdfSuspeito(filePath) {
  const raw = await fs.readFile(filePath);
  const text = raw.toString("latin1");

  const assinaturasSuspeitas = [
    "/JavaScript",
    "/JS",
    "/OpenAction",
    "/Launch",
    "/EmbeddedFile",
    "/RichMedia",
    "/SubmitForm",
    "/ImportData",
  ];

  const encontrados = assinaturasSuspeitas.filter((item) =>
    text.includes(item)
  );

  return {
    suspeito: encontrados.length > 0,
    encontrados,
  };
}