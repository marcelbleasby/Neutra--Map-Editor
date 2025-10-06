Utilize o Mapbox Draw para permitir a edição de geometrias diretamente no mapa.
# AGENT - Especificação de Requisitos
## Visão Geral
AGENT é um editor de mapas interativo focado na visualização e edição de dados geoespaciais, especialmente arquivos KML/KMZ. Construído com React, TypeScript e
Mapbox GL JS, o AGENT oferece uma interface moderna e ferramentas robustas para manipulação de geometrias.
## Objetivos Principais
- Permitir a visualização de mapas vetoriais interativos.
- Facilitar a edição de geometrias (pontos, linhas, polígonos).
- Oferecer uma interface responsiva e intuitiva.
- Suportar formatos geoespaciais comuns (KML, KMZ, GeoJSON).
- Integrar comunicação em tempo real para colaboração.
- Utilizar Mapbox Draw para edição de geometrias.
- Gerenciar estado global com Zustand.
- Realizar operações espaciais com Turf.js.
- Implementar autenticação e controle de acesso.
- Garantir performance e escalabilidade.
- Utilizar o Chakra UI para componentes de interface.
- Implementar animações com Framer Motion.
- Utilizar Axios para comunicação HTTP.
- implementar a autenticação de usuários com o Axios.
- Integrar Socket.io para updates em tempo real.
- Integrar Web Workers para processamento em background.
- Utilizar Biblioteca de ícones com React Icons.
- Utilizar a url do Mapbox a partir de variáveis de ambiente.
- Utilizar a URL da API a partir de variáveis de ambiente.
- A URL da API é https://hom-api.neutramais.com/ para o ambiente de homologação.
- Seguir as histórias de usuário detalhadas abaixo.
- Quaisquer outra funcionalidade relevante para um editor de mapas moderno, deve ser discutida e aprovada.
- Foque na simplicidade e usabilidade.
- Produza código limpo e bem documentado.
- Utilize boas práticas de desenvolvimento.



## Funcionalidades Detalhadas

User Story 01 - Listar e abrir arquivos KML/KMZ existentes

Como usuário, quero visualizar e abrir apenas os arquivos KML/KMZ já cadastrados na aplicação, para garantir que estou trabalhando sempre com a versão oficial da planta.

Critérios de Aceitação
	•	O sistema lista os arquivos cadastrados no backend.
	•	Exibir nome, data de criação, última modificação, tamanho.
	•	Pesquisa por nome do arquivo.
	•	Seleção do arquivo abre a visualização no mapa.
	•	Estado vazio caso não existam arquivos.

Requisitos Funcionais (Design)
	•	Tela inicial com lista paginada de arquivos.
	•	Campo de busca no topo da lista.
	•	Ícones diferenciando arquivos KML e KMZ.
	•	Botão “Abrir” ao lado de cada item.

Requisitos Não Funcionais
	•	Tempo de listagem < 3s para até 1000 arquivos.
	•	Paginação ou scroll infinito.
	•	Responsividade (desktop e mobile).

Dependências
	•	API de listagem e acesso a arquivos (Django DRF + Postgres + PostGIS).
	•	Endpoints REST:
	•	GET /arquivos (lista arquivos).
	•	GET /arquivos/{id} (carrega arquivo selecionado).

⸻

US02 – Visualizar camadas da rede

User Story
Como usuário, quero visualizar as camadas hierárquicas da rede (postes, caixas, fibras), para entender a estrutura da planta carregada.

Critérios de Aceitação
	•	Camadas exibidas em formato de árvore (TOC).
	•	Expandir/colapsar grupos.
	•	Checkbox para ativar/desativar camadas.
	•	Ícones por tipo de elemento.
	•	Alterações no TOC refletem no mapa em tempo real.

Requisitos Funcionais (Design)
	•	Sidebar lateral fixa para exibir a árvore hierárquica.
	•	Ícones representativos (poste, caixa, fibra).
	•	Destaque visual para camada selecionada.

Requisitos Não Funcionais
	•	Resposta < 2s ao ativar/desativar camada.
	•	Renderização incremental para grandes arquivos.
	•	Layout responsivo.

Dependências
	•	Zustand para gerenciamento de estado.
	•	Mapbox GL JS para renderização.
	•	Virtualização da árvore para performance.

⸻

US03 – Editar elementos básicos

User Story
Como usuário, quero editar geometrias (mover, adicionar, excluir) para atualizar a planta da rede conforme a realidade.

Critérios de Aceitação
	•	Edição de pontos, linhas e polígonos.
	•	Confirmação antes de excluir elementos.
	•	Alterações refletem no mapa e no TOC em tempo real.
	•	Undo/Redo disponível.

Requisitos Funcionais (Design)
	•	Barra de ferramentas flutuante com botões: Selecionar, Mover, Adicionar, Excluir.
	•	Ícones inspirados em ferramentas GIS conhecidas.
	•	Destaque em cor diferente para elementos selecionados.
	•	Tooltip com instruções rápidas.

Requisitos Não Funcionais
	•	Latência de interação < 200ms.
	•	Alterações persistem em cache local até exportação/salvamento.
	•	Suporte a operação offline (cache no navegador).

Dependências
	•	Mapbox GL Draw para edição de geometrias.
	•	IndexedDB ou LocalStorage para persistência temporária.


US04 – Simplificação de Geometrias

User Story
Como usuário, quero simplificar as geometrias carregadas no mapa, para visualizar e manipular os dados de forma mais rápida sem perder a precisão necessária.

Critérios de Aceitação
	•	Botão/ação de “Simplificar Geometria” disponível para cada camada.
	•	Sistema aplica algoritmo Douglas-Peucker do Mapbox
	•	Nível de tolerância configurável (slider ou input numérico).
	•	Preview antes de confirmar a simplificação.
	•	Dados originais permanecem armazenados (possibilidade de restaurar versão original).

Requisitos Funcionais (Design)
	•	UI com slider de precisão (% de simplificação).
	•	Indicação visual da redução de vértices no preview.
	•	Camada simplificada destacada (ex.: cor ou borda diferente).
	•	Botão de “Reverter” acessível.

Requisitos Não Funcionais
	•	Operação deve rodar em background para grandes geometrias.
	•	Processamento concluído em até 5s para arquivos médios (< 10MB).
	•	Sem travar o navegador (usar Web Worker quando necessário).

Dependências
	•	Biblioteca Turf.js para simplificação.
	•	Backend com Django + Celery para rodar simplificação em arquivos grandes.

⸻

US05 – Lazy Loading de Camadas

User Story
Como usuário, quero que as camadas do mapa carreguem sob demanda, para que a aplicação seja rápida mesmo com projetos grandes.

Critérios de Aceitação
	•	Apenas camadas visíveis no TOC são carregadas no mapa.
	•	Scroll ou zoom pode disparar carregamento de geometrias adicionais.
	•	Indicador de “carregando” exibido ao ativar uma camada pesada.
	•	Opção de descarregar camadas não utilizadas da memória.

Requisitos Funcionais (Design)
	•	TOC com checkbox de visibilidade por camada.
	•	Ícone/estado de carregamento quando a camada ainda não foi renderizada.
	•	Tooltip informando o tamanho da camada antes de carregar.
	•	Opção “Descarregar camada” no menu de contexto.

Requisitos Não Funcionais
	•	O tempo de carregamento de uma camada não deve ultrapassar 3s em arquivos médios (< 5MB).
	•	Manter uso de memória abaixo de 500MB no navegador.
	•	Carregamento incremental deve ser suportado também em conexões lentas (3G).

Dependências
	•	Zustand para controle de estado do TOC e camadas carregadas.
	•	Mapbox GL JS para renderização condicional.
	•	Django DRF endpoint para servir camadas em “chunks” (paginação ou tiles).


US06 – Exportar arquivos KML/KMZ com Auto-Updating Data do Google Earth

User Story
Como usuário, quero exportar meus arquivos no formato KML/KMZ com auto-atualização via NetworkLink, para que outros sistemas (como Google Earth) possam consumir os dados sempre atualizados sem precisar baixar manualmente cada versão.

⸻

Critérios de Aceitação
	•	Opção de exportar em três modos:
	1.	KML/KMZ estático (download tradicional).
	2.	KML/KMZ com auto-updating data (NetworkLink) apontando para a API do sistema.
	3.	KMZ compactado (com os dados embutidos).
	•	No modo auto-updating, o KML exportado deve conter um NetworkLink com as tags:
	•	<href> apontando para o endpoint público da API.
	•	<refreshMode> configurável (ex.: onInterval).
	•	<refreshInterval> configurável (ex.: 60s, 600s, 3600s).
	•	Sistema deve permitir ao usuário escolher o intervalo de atualização antes da exportação.
	•	Arquivo gerado deve abrir corretamente no Google Earth e atualizar automaticamente de acordo com o intervalo configurado.

⸻

Requisitos Funcionais (Design)
	•	Modal de exportação com três opções: Estático / Auto-Atualizável / Compactado (KMZ).
	•	Campo para escolher intervalo de atualização (em segundos ou minutos).
	•	Exemplo pré-visualizado em XML do NetworkLink antes de exportar.
	•	Feedback visual confirmando a criação do arquivo.

⸻

Requisitos Não Funcionais
	•	Tempo de exportação < 5s em arquivos médios (< 10MB).
	•	Endpoint de dados deve estar disponível publicamente para suportar o refresh do Google Earth.
	•	Garantia de compatibilidade com Google Earth Pro e QGIS.
	•	Sistema deve suportar pelo menos 100 clientes simultâneos consumindo o mesmo KML com auto-update.

⸻

Dependências
	•	Backend (Django DRF) para fornecer endpoint público de dados no formato KML/GeoJSON.
	•	tokml (frontend) ou conversor server-side para gerar KML válido.
	•	Configuração de URLs públicas acessíveis para o Google Earth consumir.
	•	Infraestrutura de cache (Redis/CDN opcional) para evitar sobrecarga em acessos simultâneos.

US07 – Edição colaborativa em tempo real com atualização em NetworkLink

User Story
Como usuário, quero editar os mapas em colaboração com outros usuários em tempo real, e que essas alterações sejam refletidas automaticamente em arquivos KML/KMZ via NetworkLink, para que sistemas externos (como Google Earth) visualizem sempre os dados atualizados sem precisar baixar novamente.

⸻

Critérios de Aceitação
	•	Alterações feitas por um usuário devem refletir para todos os usuários conectados na aplicação em menos de 2s.
	•	Arquivo exportado em modo auto-updating (NetworkLink) deve refletir as mudanças sem necessidade de novo download.
	•	O <href> no NetworkLink deve apontar para o endpoint do backend que sempre retorna a versão atualizada do projeto.
	•	<refreshMode> = onInterval e <refreshInterval> devem ser respeitados (configurável pelo administrador do projeto).
	•	Usuários externos no Google Earth devem ver as atualizações após o refresh configurado.
	•	Destaque visual no mapa quando outro usuário está editando o mesmo elemento.
	•	Lock temporário ou merge inteligente para evitar conflitos de edição.
	•	Lista de usuários conectados exibida na interface.

⸻

Requisitos Funcionais (Design)
	•	Indicador de edição colaborativa no mapa (ex.: “Usuário A está editando esta fibra”).
	•	Notificação ao tentar editar uma camada que está bloqueada por outro usuário.
	•	Lista lateral ou dropdown exibindo todos os usuários ativos.
	•	Logs básicos de atividade (quem editou, quando e o quê).
	•	Interface para configurar o intervalo de refresh usado no NetworkLink exportado.

⸻

Requisitos Não Funcionais
	•	Latência máxima de 2s para propagar edições dentro da aplicação.
	•	Latência máxima de refreshInterval + 1s para refletir alterações em sistemas externos via NetworkLink.
	•	Escalabilidade para até 50 usuários simultâneos editando o mesmo projeto.
	•	Backend deve suportar até 100 clientes externos consumindo o KML dinâmico em paralelo.
	•	Disponibilidade mínima de 99,5% para o endpoint público de dados.

⸻

Dependências
	•	Django Channels + Redis → colaboração em tempo real (WebSocket).
	•	Django DRF → endpoint público para exportação KML dinâmico.
	•	Socket.io-client → sincronização no frontend.
	•	tokml / gerador server-side → converter sempre o estado mais recente para KML válido.
	•	CDN/Cache (opcional) → reduzir latência de entrega para clientes externos (Google Earth/QGIS).
    
US08 – Controle de Permissões por Projeto com Reflexo no NetworkLink

User Story
Como administrador, quero definir permissões de acesso para cada projeto e suas camadas, para que apenas usuários autorizados possam visualizar ou editar os dados — incluindo o acesso aos KML/KMZ auto-atualizáveis via NetworkLink.

⸻

Critérios de Aceitação
	•	Níveis de acesso: Administrador, Editor, Visualizador.
	•	Apenas administradores podem configurar permissões.
	•	Usuários não autenticados não podem acessar o NetworkLink se o projeto estiver marcado como privado.
	•	Para projetos públicos, o endpoint do NetworkLink deve ser acessível por qualquer cliente externo (Google Earth).
	•	Para projetos privados, o NetworkLink deve exigir autenticação (token no parâmetro da URL ou via header).
	•	Tentativas de acesso sem permissão devem retornar erro KML válido com <description> explicando restrição.

⸻

Requisitos Funcionais (Design)
	•	Tela de gerenciamento de permissões por usuário/grupo.
	•	Opção no modal de exportação: Tornar link público ou Manter privado.
	•	Indicador visual no TOC para camadas restritas.
	•	Logs de acesso a endpoints NetworkLink (quem acessou, quando, IP).

⸻

Requisitos Não Funcionais
	•	Resposta do servidor deve ocorrer em < 2s, mesmo validando permissões.
	•	Suporte a pelo menos 500 requisições simultâneas ao endpoint NetworkLink.
	•	Tokens de autenticação expiram em tempo configurável (ex.: 24h).

⸻

Dependências
	•	Django Rest Framework + JWT (ou token estático, se já definido).
	•	Middleware para validar permissões antes de entregar KML dinâmico.
	•	CDN opcional para projetos públicos.

⸻

US09 – Histórico de Versões com Exportação em NetworkLink

User Story
Como usuário, quero acessar versões anteriores do projeto e exportá-las em KML/KMZ, para que eu possa restaurar ou visualizar o estado histórico também em clientes externos (Google Earth/QGIS).

⸻

Critérios de Aceitação
	•	Cada edição relevante gera uma nova versão salva automaticamente.
	•	Usuário pode selecionar uma versão específica e exportar em:
	•	KML estático.
	•	KML/KMZ com auto-update (NetworkLink apontando para aquela versão congelada).
	•	No modo histórico, o NetworkLink deve ser estático (dados não mudam após exportação).
	•	Usuário pode comparar duas versões no frontend (diff visual).
	•	Logs registram: autor da alteração, data, descrição opcional.

⸻

Requisitos Funcionais (Design)
	•	UI com lista de versões (timeline ou tabela).
	•	Botão “Exportar versão” com opções de formato.
	•	Destaque visual das diferenças entre versões (ex.: elementos removidos em vermelho, adicionados em verde).
	•	Indicação clara de que a versão exportada é congelada e não receberá mais atualizações.

⸻

Requisitos Não Funcionais
	•	Suporte a pelo menos 1000 versões por projeto.
	•	Exportação de versão histórica deve ser concluída em até 5s.
	•	Garantia de integridade (nenhuma versão pode ser sobrescrita).

⸻

Dependências
	•	Banco Postgres + PostGIS para armazenar snapshots de geometrias.
	•	Celery + Redis para processar versões em background em projetos grandes.
	•	tokml ou conversor backend para geração de KML válido a partir de snapshots.