# Menú diario (Angular + Material)

## Requisitos
- Node.js LTS recomendado
- Angular CLI 21.x (`npm i -g @angular/cli@^21`)

## Instalación
```bash
npm install
npm start
```

Abre: http://localhost:4200

## Rutas
- `/editor` Editor del menú por día (L-V)
- `/print` Vista imprimible + exportación PDF/JPG

## Persistencia
- Google Sheets (Apps Script).

## Export
- PDF A4 y JPG (captura del layout).

## Despliegue en GitHub Pages (manual)
1) Compila con el base-href del repo:
```bash
npm run build -- --configuration production --base-href /kedi-admin/
```
2) Copia el build a `docs` (Angular deja el `index.html` en `browser/`):
```bash
rm -rf docs
cp -R dist/menu-diario/browser docs
```
3) Sube a `main`:
```bash
git add docs
git commit -m "Deploy to GitHub Pages"
git push
```
4) En GitHub: Settings -> Pages -> Source: "Deploy from a branch", Branch: `main`, Folder: `/docs`.
