import http from 'node:http';

const port = Number(process.env.PORT) || 3000;

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dev Metrics Login</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f8fb;
        color: #172033;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background:
          linear-gradient(135deg, rgba(35, 125, 174, 0.16), transparent 36%),
          linear-gradient(315deg, rgba(242, 176, 91, 0.2), transparent 34%),
          #f6f8fb;
      }

      main {
        width: min(92vw, 380px);
        display: grid;
        gap: 24px;
        justify-items: center;
        text-align: center;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 8vw, 3rem);
        line-height: 1;
      }

      p {
        margin: 0;
        max-width: 32ch;
        color: #546178;
        line-height: 1.6;
      }

      .login-button {
        width: min(100%, 240px);
        min-height: 52px;
        border: 0;
        border-radius: 8px;
        background: #126b8f;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-size: 1rem;
        font-weight: 700;
        transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
      }

      .login-button:hover {
        background: #0e5a78;
        box-shadow: 0 14px 26px rgba(18, 107, 143, 0.24);
        transform: translateY(-1px);
      }

      .login-button:focus-visible {
        outline: 3px solid #f2b05b;
        outline-offset: 3px;
      }

      .login-button:active {
        transform: translateY(0);
      }

      .status {
        min-height: 1.5rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: #126b8f;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Dev Metrics</h1>
      <p>Sign in to continue to your dashboard.</p>
      <button class="login-button" type="button" aria-describedby="login-status">Login</button>
      <div class="status" id="login-status" aria-live="polite"></div>
    </main>
    <script>
      const button = document.querySelector('.login-button');
      const status = document.querySelector('#login-status');

      button.addEventListener('click', () => {
        status.textContent = 'Login button clicked';
      });
    </script>
  </body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url !== '/' && request.url !== '/index.html') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(page);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Dev Metrics login page is running on http://localhost:${port}`);
});
