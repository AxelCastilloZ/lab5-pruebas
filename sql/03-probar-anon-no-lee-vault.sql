-- Paso 8. Debe fallar con 42501. Después vuelve al rol del dashboard.

set role anon;
select name from vault.decrypted_secrets;

reset role;
