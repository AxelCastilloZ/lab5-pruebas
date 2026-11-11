// server/vault.js
// Lee el Client Secret de Auth0 desde Supabase Vault a traves de la funcion
// una_chat_private.get_auth0_client_secret(), conectando como el rol
// una_chat_backend por Postgres con TLS (verify-full).
//
// No guarda el secreto, la contrasena ni la URI en el codigo: todo viene de
// las variables de entorno VAULT_DATABASE_URL y del certificado de Supabase.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Ruta al certificado raiz de Supabase. Descargalo desde Supabase > Connect
// y colocalo en server/supabase-root-2021-ca.pem (o apunta SUPABASE_CA_CERT_PATH).
const CA_PATH =
  process.env.SUPABASE_CA_CERT_PATH ||
  path.join(__dirname, 'supabase-root-2021-ca.pem');

function buildSsl() {
  try {
    const ca = fs.readFileSync(CA_PATH, 'utf8');
    // verify-full: valida la cadena y el hostname contra la CA de Supabase.
    return { ca, rejectUnauthorized: true };
  } catch (e) {
    console.warn(
      '[vault] No se encontro el certificado en ' +
        CA_PATH +
        '. Descargalo desde Supabase > Connect y colocalo ahi. ' +
        'Mientras tanto se usan las CA del sistema (puede fallar con el host directo).'
    );
    return { rejectUnauthorized: true };
  }
}

async function getAuth0ClientSecret() {
  const connectionString = process.env.VAULT_DATABASE_URL;
  if (!connectionString) {
    throw new Error('VAULT_DATABASE_URL no esta configurada.');
  }

  // Quitamos sslmode de la URL: node-postgres armaria su propia config TLS a
  // partir de ese parametro e ignoraria la CA que pasamos en el objeto ssl.
  // La verificacion (verify-full) la aplicamos nosotros con { ca, rejectUnauthorized }.
  const cleanConnectionString = connectionString.replace(
    /([?&])sslmode=[^&]*/i,
    (m, sep) => (sep === '?' ? '?' : '')
  ).replace(/\?$/, '');

  const client = new Client({
    connectionString: cleanConnectionString,
    ssl: buildSsl(),
    // El rol tiene search_path = una_chat_private, pg_catalog, pero igual
    // calificamos el esquema para no depender de eso.
    statement_timeout: 10000,
  });

  await client.connect();
  try {
    const { rows } = await client.query(
      'select una_chat_private.get_auth0_client_secret() as secret'
    );
    const secret = rows && rows[0] && rows[0].secret;
    if (!secret || secret.length === 0) {
      throw new Error('Vault devolvio un secreto vacio.');
    }
    return secret;
  } finally {
    await client.end();
  }
}

module.exports = { getAuth0ClientSecret };
