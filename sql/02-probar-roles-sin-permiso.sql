-- Paso 8. Cada bloque debe fallar con 42501.
-- Ejecuta un bloque, anota el error y pasa al siguiente.
-- Termina en reset role.

set role anon;
select una_chat_private.get_auth0_client_secret();

reset role;

set role authenticated;
select una_chat_private.get_auth0_client_secret();

reset role;
