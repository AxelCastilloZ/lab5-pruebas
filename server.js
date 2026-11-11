// UNA Chat - servidor con login de Auth0 y secreto en Supabase Vault.
// El chat (socket.io) se sirve en /sala, protegido por sesion de Auth0.
// El Client Secret se lee de Vault al arrancar; nunca viaja en .env ni al cliente.

require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const validation = require('./libs/unalib');
const { getAuth0ClientSecret } = require('./server/vault');
const { createAuthRouter } = require('./server/auth');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

const config = {
  domain: process.env.AUTH0_DOMAIN || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:' + port,
};
const authEnabled = Boolean(config.domain && config.clientId);

// Secreto cacheado: se lee de Vault una vez al arrancar y se reutiliza.
let cachedSecret = null;
async function getSecret() {
  if (cachedSecret) return cachedSecret;
  cachedSecret = await getAuth0ClientSecret();
  return cachedSecret;
}

// Detras del proxy de Render para que la cookie "secure" funcione.
app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'una-chat-dev-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: /^https:/i.test(config.baseUrl),
    },
  })
);

// Rutas de autenticacion: /auth/config, /auth/login, /auth/callback, /auth/logout, /auth/me
const { router: authRouter, requireAuth } = createAuthRouter({ getSecret, config });
app.use(authRouter);

// Pagina publica original del chat (compatibilidad con el lab anterior).
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Sala del chat: protegida. Sin sesion responde 401.
app.get('/sala', requireAuth, function (req, res) {
  res.sendFile(path.join(__dirname, 'sala.html'));
});

// Socket.io: retransmite mensajes validados/sanitizados.
io.on('connection', function (socket) {
  socket.on('Evento-Mensaje-Server', function (msg) {
    msg = validation.validateMessage(msg);
    io.emit('Evento-Mensaje-Server', msg);
  });
});

// Prueba de arranque: confirma que el secreto de Vault sirve contra Auth0.
async function startupProbe() {
  if (!authEnabled) {
    console.log(
      '[arranque] Auth0 deshabilitado (AUTH0_DOMAIN/CLIENT_ID vacios). El chat queda abierto para pruebas.'
    );
    return;
  }
  let secret;
  try {
    secret = await getSecret();
    console.log('[arranque] Secreto leido de Vault (longitud ' + secret.length + ').');
  } catch (e) {
    console.error('[arranque] No se pudo leer el secreto de Vault: ' + e.message);
    return;
  }
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: secret,
      code: 'vault-startup-probe',
      redirect_uri: config.baseUrl.replace(/\/$/, '') + '/auth/callback',
    });
    const r = await fetch('https://' + config.domain + '/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await r.json().catch(() => ({}));
    if (data.error === 'invalid_grant') {
      console.log(
        '[arranque] Prueba OK: invalid_grant (el secreto es valido; el code de prueba es falso).'
      );
    } else if (data.error === 'invalid_client') {
      console.error(
        '[arranque] invalid_client: el secreto de Vault no corresponde a esta aplicacion de Auth0.'
      );
    } else {
      console.log('[arranque] Respuesta de prueba:', r.status, data.error || data);
    }
  } catch (e) {
    console.error('[arranque] No se pudo contactar a Auth0: ' + e.message);
  }
}

http.listen(port, async function () {
  console.log('listening on *:' + port);
  await startupProbe();
});
