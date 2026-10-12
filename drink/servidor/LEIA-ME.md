# Como ligar o servidor do Drink (Supabase)

Com o servidor ligado:

- o cadastro de cada motorista (selfie, foto da CNH, certidão e dados) vai para a equipe do Drink;
- o motorista só fica online depois que alguém da equipe aprova no **painel** (`/drink/admin/`);
- os relatos de problema dos passageiros ficam guardados no painel.

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
| Passageiros, corridas, mensagens | continuam no celular e no canal cifrado | ninguém no servidor |
