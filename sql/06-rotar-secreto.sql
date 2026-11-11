-- Paso 14.
-- 1. Ejecuta solo el select y copia el id.
-- 2. Sustituye los dos marcadores, ejecuta el update y borra el editor.
-- No captures esta consulta cuando el secreto nuevo esté escrito.

select id
from vault.secrets
where name = 'una_chat_auth0_client_secret';

select vault.update_secret(
  'UUID-DEL-SELECT'::uuid,
  'PEGA-AQUI-EL-SECRETO-NUEVO'
);
