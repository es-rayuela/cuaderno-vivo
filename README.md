# Cuaderno Vivo · Rayuela

Cuaderno de repaso personalizado de español. Ahora funciona publicado en
**GitHub Pages** con **Firebase (Authentication + Firestore)**, con login por
usuario y contraseña. Cada login tiene su propio ambiente, sus cadernos y su
historial de repaso.

## Cómo funciona

- **Profesora**: crea su cuenta con un código secreto, gestiona a sus alumnas
  (crea el login de cada una), importa/edita las frases de cada clase y puede
  previsualizar el cuaderno de cada alumna. Todo se sincroniza en la nube.
- **Alumna**: entra con el usuario y la contraseña que le dio su profesora, y ve
  solo su propio cuaderno con su historial. También puede añadir frases por
  archivo/código (compatibilidad con el flujo anterior).

El **código de profesora** por defecto es `unicornica1411` (se puede cambiar en
`src/CuadernoVivo.jsx`, constante `TEACHER_CODE`).

---

## 1. Crear el proyecto de Firebase

1. Entra en <https://console.firebase.google.com> y crea un proyecto (plan
   gratuito **Spark** es suficiente).
2. **Authentication** -> *Get started* -> pestaña **Sign-in method** -> habilita
   **Email/Password**.
3. **Firestore Database** -> *Create database* -> modo *Producción* -> elige la
   región más cercana.
4. En **Firestore -> pestaña Reglas**, pega el contenido de
   [`firestore.rules`](./firestore.rules) y pulsa **Publicar**.
5. **Configuración del proyecto** (ícono ⚙️) -> sección *Tus apps* -> icono web
   `</>` -> registra una app web y copia el objeto `firebaseConfig`.

## 2. Pegar la configuración

Abre [`src/firebase.js`](./src/firebase.js) y reemplaza el objeto
`firebaseConfig` con el que copiaste (apiKey, authDomain, projectId, etc.).

> Estas claves son públicas por diseño: van al navegador. La seguridad real la
> dan las reglas de Firestore del paso 1.4.

## 3. Ejecutar en local

```bash
npm install
npm run dev
```

Abre la URL que indica Vite (por defecto <http://localhost:5173>).

La primera vez, entra con **"Soy profesora · crear cuenta"**, usa el código
`unicornica1411`, y crea tu cuenta. Luego, desde *Alumnas*, crea el login de
cada alumna.

## 4. Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub (rama `main`).
2. En el repo: **Settings -> Pages -> Build and deployment -> Source: GitHub
   Actions**.
3. Cada `push` a `main` construye y publica automáticamente (ver
   [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)).
4. Cuando termine, la app queda en `https://TU_USUARIO.github.io/TU_REPO/`.

### Autorizar el dominio en Firebase

En **Authentication -> Settings -> Authorized domains**, añade
`TU_USUARIO.github.io` para que el login funcione desde GitHub Pages.

---

## Estructura

```
src/
  main.jsx          punto de entrada de React
  App.jsx           enrutado por autenticación y rol (login/alumna/profesora)
  firebase.js       inicialización de Firebase + helpers de auth
  store.js          capa de datos sobre Firestore
  CuadernoVivo.jsx  toda la interfaz (alumna, profesora, login) y la lógica
firestore.rules     reglas de seguridad de Firestore
```

## Notas

- La cuenta de Auth de una alumna no puede borrarse desde el navegador; al
  eliminarla del roster se borra su documento (y sus datos), pero el usuario de
  Auth queda inactivo. Para borrarlo del todo, hazlo desde la consola de
  Firebase (Authentication -> Users).
- Modelo de datos y sincronización pensados para uso 1-a-1 profesora/alumna; en
  caso de edición simultánea del mismo cuaderno, gana la última escritura.
