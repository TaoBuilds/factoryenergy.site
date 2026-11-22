# Repository Guide

FactoryEnergy is a Chinese-language Hexo site about facility energy efficiency in semiconductor manufacturing. The site is available at <https://factoryenergy.site/>.

- Follow the repository conventions in [AGENTS.md](AGENTS.md).
- Write articles in `source/_posts/` and standalone pages under `source/`.
- Site settings live in `_config.yml`. Butterfly theme settings live in `_config.butterfly.yml`.
- Run `npm ci` to install dependencies and `npm run server` for local development.
- Run `npm run build` before committing. Hexo generates the static site in `public/`.
- The existing Vercel deployment builds the `main` branch using `vercel.json`.
