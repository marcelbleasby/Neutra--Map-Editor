# Neutra Map Editor

Editor de mapas da plataforma Neutra+ para documentar e operar redes FTTH neutras.
Este glossário fixa o vocabulário do produto; termos ainda em discussão não entram.

## Language

### Organização

**Empresa**:
Organização cadastrada na plataforma, identificada pelo `organization_id`. No editor, é um provedor dono da própria rede, que atende seus assinantes e pode compartilhar parte das portas com outras Empresas.
_Avoid_: Organização (na interface), operadora neutra, cliente, conta, tenant

**Projeto**:
Recorte da rede de uma Empresa, escolhido por ela: uma cidade, várias, ou parte de uma. Um POP e tudo que ele alimenta ficam no mesmo projeto.
_Avoid_: Mapa, rascunho, área

**Topologia**:
Dentro de um projeto, tudo que um mesmo POP alimenta. Não é cadastrada: decorre das ligações da rede.
_Avoid_: Rede (para este sentido), malha, árvore

### Rede física

**CTO**:
Caixa de terminação óptica: o ponto da rede onde ficam as portas de atendimento.
_Avoid_: Caixa (sozinha), NAP, caixa de atendimento

**CEO**:
Caixa de emenda óptica: o ponto onde cabos são abertos e suas fibras são ligadas entre si ou a um splitter.
_Avoid_: Caixa (sozinha), caixa de emenda

### Rede óptica

**Ligação declarada**:
Ligação que alguém da Empresa registrou. É a que vale como documentação da rede.

**Ligação inferida**:
Ligação que a plataforma deduz da proximidade entre elementos de um arquivo importado. É uma sugestão até alguém aceitá-la.
_Avoid_: Ligação automática

**Ligação**:
União de duas pontas (fibra ou porta) dentro de um POP, de uma CEO ou de uma CTO. Tem três tipos: fusão, conector e cordão.
_Avoid_: Conexão, emenda, fusão (como termo geral)

**Fusão**:
Ligação permanente entre duas fibras, ou entre uma fibra e um splitter.

**Conector**:
Ligação desmontável entre uma fibra e uma posição de DIO ou uma porta de OLT.

**Cordão**:
Ligação entre duas portas de equipamentos no mesmo POP.
_Avoid_: Patch cord, jumper

### Rede neutra

**Porta compartilhada**:
Porta de atendimento específica de uma CTO que a Empresa dona da rede coloca à disposição de outra Empresa. É usada por no máximo uma Empresa por vez.
_Avoid_: Porta cedida, porta alugada

**Compartilhamento**:
Uso de uma porta compartilhada por outra Empresa, em decorrência de um pedido aceito no marketplace da plataforma. Não é criado no editor.
_Avoid_: Cessão, locação, lease

### Atendimento

**Cobertura**:
Um endereço tem cobertura quando está dentro de uma área de cobertura da Empresa. É o que a plataforma chama de *feasibility*, e é tudo que a Empresa compradora enxerga.
_Avoid_: Viabilidade (para este sentido)

**Viabilidade**:
Um endereço tem viabilidade quando há ao menos uma CTO com porta livre a até 250 m dele, em linha reta. Pode haver mais de uma CTO nessa condição. Só a Empresa dona da rede consulta.
_Avoid_: Cobertura (para este sentido), disponibilidade, feasibility

**Assinante**:
Quem é atendido por uma porta de CTO. No editor é apenas um nome ou código anotado na porta; o cadastro pertence ao sistema de gestão da Empresa.
_Avoid_: Cliente, usuário, consumidor

### Edição

**Pendência**:
Algo incompleto ou incorreto no desenho da rede física, que o editor aponta sem impedir o trabalho.
_Avoid_: Erro de validação, bloqueio
