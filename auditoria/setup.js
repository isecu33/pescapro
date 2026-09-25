/* Entorno comun de la auditoria.
   Zona horaria fija Europe/Madrid: es la del usuario objetivo (costa
   espanola) y tiene horario de verano, que es donde aparecen los errores de
   "dia local vs dia UTC". Sin esto, los tests pasarian o fallarian segun la
   maquina que los ejecute. */
process.env.TZ = 'Europe/Madrid';
