const Privacidade = () => {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: junho de 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Introdução</h2>
          <p className="text-muted-foreground leading-relaxed">
            O aplicativo <strong>SIGHC</strong> (Sistema de Gerenciamento de Horas Complementares) foi
            desenvolvido pelo grupo <strong>JLLTY</strong> da turma <strong>TADS049</strong>, 
            do curso de Análise e Desenvolvimento de Sistemas da <strong>Faculdade SENAC</strong>. Esta
            Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as
            informações dos usuários ao utilizar o aplicativo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Dados Coletados</h2>
          <p className="text-muted-foreground leading-relaxed">Coletamos os seguintes dados para o funcionamento do sistema:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Nome completo</strong> — identificação do aluno ou servidor.</li>
            <li><strong>Endereço de e-mail institucional</strong> — utilizado para autenticação e comunicação.</li>
            <li><strong>Dados de horas complementares</strong> — certificados, atividades e comprovantes enviados pelo aluno.</li>
            <li><strong>Token de notificação push (FCM)</strong> — para envio de notificações sobre o status das atividades.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Finalidade do Uso dos Dados</h2>
          <p className="text-muted-foreground leading-relaxed">Os dados são utilizados exclusivamente para:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Autenticação e controle de acesso ao sistema.</li>
            <li>Registro, validação e acompanhamento das horas complementares dos alunos.</li>
            <li>Envio de notificações sobre atualizações no status de atividades submetidas.</li>
            <li>Geração de relatórios administrativos internos para coordenadores e administradores.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Compartilhamento de Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Não compartilhamos dados pessoais dos usuários com terceiros para fins comerciais. Os dados
            podem ser acessados por servidores do IFSP com permissão administrativa para fins de
            gerenciamento acadêmico. Utilizamos serviços do Google (Firebase) para autenticação,
            armazenamento e notificações, em conformidade com a política de privacidade do Google.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Armazenamento e Segurança</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os dados são armazenados nos servidores do Firebase (Google Cloud), que adota medidas de
            segurança técnicas e organizacionais para proteger as informações contra acesso não
            autorizado, alteração, divulgação ou destruição.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Direitos dos Usuários</h2>
          <p className="text-muted-foreground leading-relaxed">Em conformidade com a LGPD (Lei nº 13.709/2018), o usuário tem direito a:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Acessar os dados pessoais armazenados sobre si.</li>
            <li>Solicitar a correção de dados incompletos ou incorretos.</li>
            <li>Solicitar a exclusão de dados, observados os prazos legais.</li>
            <li>Revogar o consentimento para uso dos dados a qualquer momento.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato com
            o grupo responsável pelo desenvolvimento do SIGHC — grupo JLLTY, turma TADS049, Faculdade SENAC.
          </p>
        </section>

        <p className="text-xs text-muted-foreground border-t pt-4">
          Esta política pode ser atualizada periodicamente. Recomendamos que os usuários a consultem
          regularmente.
        </p>
      </div>
    </div>
  );
};

export default Privacidade;
