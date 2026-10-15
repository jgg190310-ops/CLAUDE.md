# Como ligar o servidor do Drink (Supabase)

Com o servidor ligado:

- o cadastro de cada motorista (selfie, foto da CNH, certidão e dados) vai para a equipe do Drink;
- o motorista só fica online depois que alguém da equipe aprova no **painel** (`/drink/admin/`);
- os relatos de problema dos passageiros ficam guardados no painel;
- o benefício dos bares parceiros (o chope por conta da casa) só vale para volta confirmada por um motorista aprovado. Quem tem só o QR da mesa não consegue inventar uma volta.

Sem o servidor, o app continua funcionando como antes.

São uns 15 minutos, e o plano grátis do Supabase basta para começar.

## 1. Criar o projeto

1. Entre em <https://supabase.com> e crie uma conta (pode ser com o Gmail `drinksuportemdv@gmail.com`).
2. **New project**:
   - nome `drink`;
   - região **South America (São Paulo)**;
   - anote a senha do banco num lugar seguro.

## 2. Criar as tabelas e as regras

1. No projeto, abra **SQL Editor** > **New query**.
2. Cole todo o conteúdo de `drink/servidor/supabase.sql`.
3. Toque em **Run**. Pode rodar de novo quando quiser: não apaga nada.

Se você já tinha rodado uma versão antiga do arquivo, rode de novo: a versão nova cria as tabelas das voltas dos bares (`voltas_bar` e `bares_segredo`).

O e-mail da equipe que pode aprovar motoristas está no final do arquivo (`drinksuportemdv@gmail.com`). Para pôr mais gente, rode:
`insert into admins values ('outro@email.com');`

## 3. Criar o login da equipe

1. Abra **Authentication** > **Users** > **Add user** > **Create new user**.
2. Use o mesmo e-mail da lista da equipe, escolha uma senha forte e marque **Auto Confirm User**.

## 4. Ligar no app

1. Abra **Project Settings** > **API**.
2. Copie:
   - **Project URL**, algo como `https://abcd.supabase.co`;
   - a chave **anon public**.
3. Mande os dois para o Claude, ou cole em `drink/app/config-servidor.js`:

```js
window.DRINK_SERVIDOR = {
  url: 'https://abcd.supabase.co',
  chave: 'eyJ...',
};
```

A chave **anon** pode ficar no código. O banco só deixa o app *enviar* cadastros e relatos: ler, ver documentos e aprovar só com o login da equipe.

**Nunca** coloque a chave `service_role` no app.

## 5. Usar o painel

1. Abra `https://jgg190310-ops.github.io/CLAUDE.md/drink/admin/` e entre com o e-mail e a senha do passo 3.
2. Em cada cadastro aparecem:
   - as conferências automáticas: idade, tempo de CNH, validade, CPF e certidão;
   - os documentos.
3. **Aprovar** libera o motorista. **Recusar** pede um motivo, que o motorista lê no app para corrigir e enviar de novo.

## O que fica onde

| Dado | Onde | Quem vê |
| --- | --- | --- |
| Cadastro do motorista (nome, CPF, CNH, Pix) | tabela `motoristas_cadastro` | só a equipe |
| Selfie, foto da CNH, certidão | bucket fechado `documentos` | só a equipe, por link que vale 10 minutos |
| Relatos de problema | tabela `relatos` | só a equipe |
| Voltas dos bares (bar, corrida, código do recibo, motorista) | tabela `voltas_bar` | só a equipe; o bar só confere um código por vez, com o segredo dele |
| Passageiros, corridas, mensagens | continuam no celular e no canal cifrado | ninguém no servidor |

## Autorizar motoristas (vale com ou sem o Supabase)

Desde a versão 75, **nenhum motorista fica online sem a autorização do Drink**, e o app do passageiro recusa o aceite
de quem não tem. A autorização é uma assinatura digital feita com a **chave do Drink** (o arquivo `chave-do-drink.json`,
que fica só com o dono do Drink — não mande para ninguém e guarde uma cópia).

1. O motorista abre o app, toca em **Pedir autorização** e manda o link pelo WhatsApp.
2. Você abre o link no celular ou no computador: cai em `drink/admin/autorizar.html`. Na primeira vez, a página pede
   o arquivo da chave; depois ela fica guardada naquele aparelho.
3. Confira os documentos do motorista, ajuste o nome e o celular, escolha por quanto tempo vale e toque em **Autorizar**.
4. Mande o link que aparece (o botão já abre o WhatsApp dele). Ele toca no link e já pode ficar online. Se ele usa o
   app instalado na tela de início, ele cola o link na caixa da autorização, dentro do app.

**Bloquear um motorista antes do prazo:** na mesma página, em **Bloquear motorista**, toque em Bloquear (ou cole o
link da autorização que você mandou para ele). A página monta a lista nova: toque em **Copiar a lista**, depois em
**Abrir no GitHub**, apague o que está lá, cole e toque em **Commit changes**. Em 1 ou 2 minutos, o motorista não fica
mais online e nenhum passageiro aceita o aceite dele.

**Com o Supabase ligado:** se a chave do Drink estiver guardada no aparelho do painel, aprovar o cadastro já autoriza o
motorista por 6 meses: não precisa do link.

## Evento já preenchido (para mandar a quem organiza)

Este link abre o app na aba Eventos com o formulário preenchido; quem organiza só escolhe o lugar e toca em Criar:

`https://jgg190310-ops.github.io/CLAUDE.md/drink/app/?aba=eventos&ev-nome=Maison%20Rouge&ev-data=2026-10-31&ev-ini=23:00&ev-fim=05:00&ev-conv=300&ev-tipo=festa&ev-paga=convidado`

Depois de criar, em **Convite** o app mostra o link do convite: com ele no QR da festa, o embarque já vem no lugar do
evento. Na página da Maison Rouge, é só pôr o link em `CONVITE` no arquivo `drink/maison-rouge/mr.js`.

## Carro de apoio

Quem dirige o carro de apoio abre `https://jgg190310-ops.github.io/CLAUDE.md/drink/apoio/`, toca em **Criar um código
novo**, coloca o nome do carro e entra. Em **Mandar o código para os motoristas**, manda o link pelo WhatsApp: cada
motorista toca nele uma vez. Depois, quando o motorista deixa o cliente longe, ele toca em **Me busca** no app; o
celular do carro de apoio toca e mostra quem está esperando, onde e há quanto tempo. **Estou indo** avisa o motorista;
**Peguei** tira ele da lista. A posição vai cifrada com o código da equipe.

## Servidor próprio de mensagens (ntfy) — para eventos grandes

As mensagens do app passam pelo ntfy.sh, que é gratuito mas tem limite **por internet**: 60 envios de uma vez (depois
1 a cada 5 segundos) e 30 conexões abertas. Numa festa com dezenas de convidados no mesmo Wi-Fi, esse limite estoura.
O app já espera e tenta de novo, mas o certo para eventos grandes é ter um ntfy só do Drink:

1. Contrate um servidor pequeno (qualquer VPS de 1 GB, uns R$ 25 a R$ 40 por mês) com um domínio, por exemplo
   `avisos.seudominio.com.br`.
2. Instale o ntfy (https://docs.ntfy.sh/install/) e, no arquivo de configuração, aumente os limites:
   `visitor-request-limit-burst: 1000`, `visitor-request-limit-replenish: "1s"`, `visitor-subscription-limit: 500`
   e `behind-proxy: true` se ele estiver atrás de um proxy.
3. No app, troque `ntfy: 'https://ntfy.sh'` em `drink/app/servicos.js` pelo endereço novo e publique.

Enquanto isso não existe, peça aos convidados para usar o **4G** na hora de pedir a volta.
