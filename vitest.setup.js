/* Zona horaria fija para los tests: la del usuario objetivo (costa
   espanola, con horario de verano). Sin esto, los tests que razonan en
   horas locales (logro nocturno, dias de calendario...) pasan o fallan
   segun la maquina que los ejecute (p.ej. CI en UTC). */
process.env.TZ = 'Europe/Madrid';
