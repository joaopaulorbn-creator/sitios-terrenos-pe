# Sítios e Terrenos PE — catálogo público

Site estático do catálogo de imóveis do @sitios.terrenos.pe, publicado no GitHub Pages:
https://joaopaulorbn-creator.github.io/sitios-terrenos-pe/

Cada push na branch `main` roda `.github/workflows/pages.yml`, que gera o site e publica (1 a 2 minutos).

## Área de gestão

`/admin/` lista as mídias de cada imóvel e exclui uma por vez. Entra-se com um token fine-grained do GitHub
com "Contents: Read and write" só neste repositório; cada exclusão vira um commit e o site é republicado.

## Como está organizado

- `data/imoveis.json`: a lista de imóveis (título, tipo, cidade, área, preço, características, descrição, fotos e vídeos).
- `data/config.json`: nome, @ do Instagram e WhatsApp de visitas.
- `media/<id-do-imovel>/`: fotos e vídeos de cada imóvel.
- `src/`: estilo, ícone e imagem de compartilhamento.
- `build.js`: gera o site em `dist/` (`SITE_URL` e `BASE_PATH` vêm do GitHub Pages).

## Campos de cada imóvel

- `status`: `disponivel`, `reservado`, `vendido` ou `oculto` (oculto não aparece no site).
- `preco`: número em reais, ou `null` para "Preço sob consulta".
- `fotos` / `videos`: caminhos dentro de `media/`. A primeira foto é a capa e a imagem do link no WhatsApp.
- `instagram`: link do post do vídeo. `maps`: link do Google Maps.

Página de cada imóvel: `/imovel/<id>/`.

## Testar localmente

```bash
node build.js && npx serve dist
```
