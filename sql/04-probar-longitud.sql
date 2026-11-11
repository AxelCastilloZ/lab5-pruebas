-- Paso 8. Pide solo la longitud. El revoke final es obligatorio.

grant una_chat_backend to current_user;
set role una_chat_backend;
select length(una_chat_private.get_auth0_client_secret()) as secret_length;
reset role;
revoke una_chat_backend from current_user;
