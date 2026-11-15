# Neutra Map Editor

Editor de mapas da plataforma Neutra+ para documentar e operar redes FTTH neutras.
Este glossário fixa o vocabulário do produto; termos ainda em discussão não entram.

## Language

### Organização

**Empresa**:
Organização cadastrada na plataforma, identificada pelo `organization_id`. No editor, é um provedor dono da própria rede, que atende seus assinantes e pode compartilhar parte das portas com outras Empresas.
_Avoid_: Organização (na interface), operadora neutra, cliente, conta, tenant

### Rede física

**CTO**:
Caixa de terminação óptica: o ponto da rede onde ficam as portas de atendimento.
_Avoid_: Caixa (sozinha), NAP, caixa de atendimento

**CEO**:
Caixa de emenda óptica: o ponto onde cabos são abertos e suas fibras são ligadas entre si ou a um splitter.
_Avoid_: Caixa (sozinha), caixa de emenda

### Rede óptica

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
Porta de atendimento de uma CTO que a Empresa dona da rede coloca à disposição de outra Empresa.
_Avoid_: Porta cedida, porta alugada

**Compartilhamento**:
Uso de uma porta compartilhada por outra Empresa cadastrada na plataforma.
_Avoid_: Cessão, locação, lease

### Atendimento

**Cobertura**:
Um endereço tem cobertura quando está dentro de uma área de cobertura da Empresa.
_Avoid_: Viabilidade (para este sentido)

**Viabilidade**:
Um endereço tem viabilidade quando há ao menos uma CTO com porta livre a até 250 m dele. Pode haver mais de uma CTO nessa condição.
_Avoid_: Cobertura (para este sentido), disponibilidade

### Edição

**Pendência**:
Algo incompleto ou incorreto no desenho da rede física, que o editor aponta sem impedir o trabalho.
_Avoid_: Erro de validação, bloqueio
