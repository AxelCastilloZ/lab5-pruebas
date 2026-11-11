-- Paso 8. dashboard_is_member tiene que ser false.

select pg_has_role(current_user, 'una_chat_backend', 'member') as dashboard_is_member;
