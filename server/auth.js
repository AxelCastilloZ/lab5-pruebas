// server/auth.js
// Rutas de autenticacion con Auth0 (Authorization Code + Client Secret Post).
// El secreto NUNCA sale al cliente: se usa solo del lado del servidor para
// canjear el code en /oauth/token. El valor viene de Vault (getSecret()).

const express = require('express');
const crypto = require('crypto');

function base64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Decodifica el payload del id_token para obtener nombre/email.
// Suficiente para mostrar el usuario en la sala del laboratorio.
function decodeJwtPayload(idToken) {
  try {
    const part = String(idToken).split('.')[1];
    const json = Buffer.from(
      part.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return {};
  }
}

function createAuthRouter({ getSecret, config }) {
  const router = express.Router();
  const domain = config.domain || '';
  const clientId = config.clientId || '';
  const baseUrl = (config.baseUrl || '').replace(/\/$/, '');
  const enabled = Boolean(domain && clientId);
  const redirectUri = baseUrl + '/auth/callback';

  // GET /auth/config -> 200. enabled, domain y clientId. El secreto queda fuera.
  router.get('/auth/config', (req, res) => {
    res.json({
      enabled,
      domain: domain || null,
      clientId: clientId || null,
    });
  });

  // GET /auth/me -> datos del usuario en sesion (para la cabecera de /sala).
  router.get('/auth/me', (req, res) => {
    if (!enabled) return res.json({ enabled: false, user: null });
    if (req.session && req.session.user) {
      return res.json({ enabled: true, user: req.session.user });
    }
    return res.status(401).json({ enabled: true, user: null });
  });

  // GET /auth/login -> 302 al dominio de Auth0.
  router.get('/auth/login', (req, res) => {
    if (!enabled) return res.redirect('/sala');
    const state = base64url(crypto.randomBytes(16));
    req.session.state = state;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
    });
    res.redirect(302, 'https://' + domain + '/authorize?' + params.toString());
  });

  // GET /auth/callback -> canjea el code por tokens con client_secret_post.
  router.get('/auth/callback', async (req, res) => {
    if (!enabled) return res.redirect('/sala');
    const { code, state, error, error_description } = req.query;
    if (error) {
      return res
        .status(400)
        .send('Auth0 devolvio error: ' + error + ' ' + (error_description || ''));
    }
    if (!code) return res.status(400).send('Falta el parametro code.');
    if (!state || state !== (req.session && req.session.state)) {
      return res.status(400).send('State invalido (posible CSRF).');
    }
    if (req.session) delete req.session.state;

    let secret;
    try {
      secret = await getSecret();
    } catch (e) {
      return res
        .status(500)
        .send('No se pudo leer el secreto de Vault: ' + e.message);
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: secret,
        code: String(code),
        redirect_uri: redirectUri,
      });
      const r = await fetch('https://' + domain + '/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res
          .status(401)
          .send('Error al canjear el token: ' + (data.error || r.status));
      }
      const claims = decodeJwtPayload(data.id_token || '');
      req.session.user = {
        name: claims.name || claims.nickname || claims.email || 'Usuario',
        email: claims.email || null,
      };
      return res.redirect('/sala');
    } catch (e) {
      return res.status(500).send('Fallo el intercambio de token: ' + e.message);
    }
  });

  // GET /auth/logout -> cierra la sesion local y la de Auth0.
  router.get('/auth/logout', (req, res) => {
    const finish = () => {
      if (!enabled) return res.redirect('/');
      const params = new URLSearchParams({
        client_id: clientId,
        returnTo: baseUrl,
      });
      res.redirect(302, 'https://' + domain + '/v2/logout?' + params.toString());
    };
    if (req.session) {
      req.session.destroy(finish);
    } else {
      finish();
    }
  });

  // Middleware para proteger rutas (p. ej. /sala).
  function requireAuth(req, res, next) {
    if (!enabled) return next(); // chat abierto si Auth0 no esta configurado
    if (req.session && req.session.user) return next();
    return res
      .status(401)
      .send('No autorizado. Inicia sesion en /auth/login');
  }

  return { router, requireAuth, enabled };
}

module.exports = { createAuthRouter };
