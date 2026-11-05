# Casa na Feiticeira · Tour virtual

Tour da casa do Airbnb (Ilhabela, Condomínio São Mathias): fotos em tela cheia e um modelo 3D que dá para percorrer.

- `index.html`: abertura, ambientes, destaques, 3D e "Sobre a casa"; o tour de fotos com planta e tour automático.
- `3d.html`: o modelo 3D (three.js r128), com os modos Andar, Tour guiado e Maquete, a hora do dia e os pontos com as fotos reais.
- `fotos/`: as 37 fotos do anúncio e `p3d.jpg`, a prévia do 3D.
- `tex/`: texturas tiradas das fotos (tijolo, cimento queimado verde, forro de madeira).

Os controles que flutuam sobre as fotos e o 3D usam um efeito de vidro (Liquid Glass) feito em CSS, porque é uma página web.

## Como o `3d.html` é gerado

`3d.html` sai de `src/build3d.py`, que junta:

1. `src/3d_head.html`: o estilo e a interface;
2. o modelo da casa de `orig/3d.html` (a primeira versão), com as correções aplicadas pelo script;
3. `src/3d_partC.js`: luzes, céu, câmera, modos, toque e o laço de desenho.

```
python3 feiticeira/src/build3d.py
```
