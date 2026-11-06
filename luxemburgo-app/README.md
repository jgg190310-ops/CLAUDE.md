# Apto Luxemburgo · app

App em Expo (SDK 58) que apresenta o Apto Luxemburgo pronto, com o vidro nativo do iOS 26 (`expo-glass-effect`).

- **Abertura:** passa pela sala, suíte, cozinha e quarto. A troca de ambiente fica num controle de vidro (`GlassContainer` + `GlassView` interativos).
- **Síntese:** planta humanizada e os números do book.
- **Ambientes:** as fotos abrem em tela cheia, com legenda em vidro.
- **Bairro:** distâncias, Parque Tom Jobim e a história do Luxemburgo.
- **Ficha e Visita:** dados de quem apresenta o imóvel, em `src/content.ts` (`BRAND`).
- **Atalhos:** a barra de vidro no rodapé aparece depois da abertura.

No iPhone com iOS 26 o vidro é o Liquid Glass da Apple. Em aparelhos sem Liquid Glass (Android, iOS antigo, web), o mesmo desenho usa um desfoque do `expo-blur` (ver `src/Glass.tsx`).

## Rodar

```
cd luxemburgo-app
npm install
npx expo start
```

Abra o QR code no app Expo Go do iPhone. Se o Expo Go não carregar o módulo de vidro, gere um build de desenvolvimento:

```
npx eas-cli@latest build --profile development --platform ios
```

Para ver no navegador: `npx expo start --web`.

## Editar

- Textos, números e contato: `src/content.ts`.
- Fotos: `assets/img/`.
- Para o botão "Agendar visita", preencha `whatsapp` em `BRAND`.
