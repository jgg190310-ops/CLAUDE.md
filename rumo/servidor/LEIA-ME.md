# Conexão automática do Rumo com o banco

O Rumo busca o saldo e o extrato das suas contas pelo **Open Finance**, através da **Pluggy**.
Este servidor (um Cloudflare Worker) fica no meio: guarda as chaves da Pluggy com segurança
e entrega os lançamentos para o app. Ele só **lê**: não faz Pix, pagamento nem transferência.

São 4 passos. Leva uns 15 minutos.

## 1. Conecte seus bancos no Meu Pluggy

1. Entre em **https://meu.pluggy.ai** e crie sua conta.
2. Toque em conectar um banco, escolha o seu (Nubank, Itaú, Inter…) e autorize no app do banco.
   Repita para cada banco.

## 2. Pegue as chaves da Pluggy

1. Entre em **https://dashboard.pluggy.ai** com a mesma conta.
2. Crie uma aplicação (Applications → New) e copie o **Client ID** e o **Client Secret**.
   Não mande essas chaves para ninguém e não cole no código.

## 3. Coloque o servidor no ar (Cloudflare, grátis)

Você já usa a Cloudflare no `whoop-worker`. Pelo site, sem instalar nada:

1. Entre em **https://dash.cloudflare.com** → **Workers & Pages** → **Create** → **Create Worker**.
2. Dê o nome **rumo-banco** e toque em **Deploy**.
3. Toque em **Edit code**, apague o que estiver lá, cole o conteúdo de `rumo/servidor/worker.js`
   e toque em **Deploy** de novo.
4. Volte ao worker → **Settings** → **Variables and Secrets** → **Add**, escolha o tipo **Secret** e crie os três:

   | Nome | Valor |
   |---|---|
   | `PLUGGY_CLIENT_ID` | o Client ID do passo 2 |
   | `PLUGGY_CLIENT_SECRET` | o Client Secret do passo 2 |
   | `RUMO_CHAVE` | uma senha só sua, com pelo menos 16 letras e números (ex.: gerada pelo gerenciador de senhas) |

5. Anote o endereço do worker. Ele fica parecido com `https://rumo-banco.SEU-USUARIO.workers.dev`.

Pelo terminal, se preferir: dentro de `rumo/servidor/`, rode `npx wrangler deploy` e depois
`npx wrangler secret put PLUGGY_CLIENT_ID` (e o mesmo para `PLUGGY_CLIENT_SECRET` e `RUMO_CHAVE`).

## 4. Ligue no Rumo

1. No Rumo: **Dinheiro → Contas → Ligar a conexão automática** (ou Ajustes → Conexão automática).
2. Cole o endereço do worker e a `RUMO_CHAVE`, e toque em **Salvar e testar**.
3. Toque em **Conectar meu banco**. No botão da Pluggy, escolha **Meu Pluggy** e entre com a sua conta.
   Se o botão não abrir, copie o ID do item no painel da Pluggy (Items) e cole em
   **Já tenho o ID da conexão**.

Pronto. Toda vez que você abre o Rumo (no máximo a cada 30 minutos), ele busca o que entrou e saiu.
Na primeira vez, ele traz os últimos 90 dias.

## Bom saber

- **Saldo:** nas contas ligadas, o saldo do Rumo passa a ser o saldo do banco.
- **Sem repetir:** gastos que você já tinha anotado à mão (mesmo valor, mesma conta, até 2 dias de diferença)
  não entram de novo.
- **Cartão de crédito:** a compra entra como gasto no cartão; o pagamento da fatura na conta vira
  transferência para o cartão, para o gasto não contar duas vezes.
- **Compras ainda pendentes** só entram quando o banco confirma.
- **A autorização vence**, em geral em até 12 meses. Quando vencer, o Rumo avisa; renove no Meu Pluggy.
- **A senha do servidor** fica só no seu aparelho e não vai no backup. Se trocar de celular, digite de novo.
- **Para desligar de vez:** no Rumo, Conexão automática → Desligar; e revogue a autorização no app
  do banco (área de Open Finance) ou no Meu Pluggy.
