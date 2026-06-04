// Esta página é um placeholder padrão
// Substitua o conteúdo com sua própria aplicação

/**
 * Página Index (página inicial de fallback)
 * Exibida como placeholder se a aplicação não for atualizada
 */
const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center p-4">
        {/* Título de boas-vindas */}
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        {/* Aviso de teste */}
        <p className="text-lg font-semibold text-red-600 mb-6">
          ESSE SITE É PARA TESTES E NÃO ESTÁ RELACIONADO À INSTITUIÇÃO SENAC
        </p>
        {/* Subtítulo com instrução */}
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

// Exporta componente Index como padrão
export default Index;
