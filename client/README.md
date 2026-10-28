# React + Vite

## Running the app

Start the API in one terminal:

```sh
cd server
npm run dev
```

Start the client in another terminal:

```sh
cd client
npm run dev
```

Before starting the API, copy `server/.env.example` to `server/.env` and fill in
the Supabase project URL and anon key from your Supabase project's API settings.
Keep `server/.env` private; never put a service-role key in the client.

The Vite development server proxies `/api` requests to the API at
`http://127.0.0.1:3000`. The client displays the API and Supabase connection
statuses. Supabase must be configured before its status can show as connected.

The API can also be started without nodemon using `npm start` in the `server`
directory.

## Vite template notes

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
