# A sessão fica no servidor do editor, não no navegador

O navegador fala só com o servidor do editor (Route Handlers do Next), que guarda os
tokens em cookie `httpOnly`, renova a sessão e repassa as chamadas ao nginx da
plataforma. Decidimos assim porque a identidade não tem CORS e porque seu token de
renovação é de uso único: duas abas renovando ao mesmo tempo revogam a sessão
inteira, então a renovação precisa acontecer em um lugar só.

## Considered Options

- **Pedir CORS no nginx e guardar o token no navegador.** A documentação da identidade
  cita essa saída. Não resolve a corrida entre abas e expõe o token a qualquer script
  da página.

## Consequences

- O servidor do editor preenche a organização a partir do token, nunca do que o
  navegador envia.
- O editor precisa de um processo Node em produção; não pode ser publicado como site
  estático.
