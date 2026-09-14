/* PescaPro - Vista Trofeos: récords personales, logros y competiciones.
   UI autocontenida; usa PP.ui.modal para los diálogos. */
window.PP = window.PP || {};

PP.uiTrofeos = (function () {
  const $ = (s) => document.querySelector(s);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============ RENDER PRINCIPAL ============ */

  function render(st) {
    const cont = $('#vista-trofeos');
    cont.innerHTML = '';
    const capturas = PP.cuaderno.leer();
    cont.appendChild(cardRecords(capturas));
    cont.appendChild(cardLogros(capturas));
    cont.appendChild(cardLigas(st));
  }

  /* ============ RÉCORDS ============ */

  function cardRecords(capturas) {
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, '🏅 Récords personales'));
    const r = PP.records.calcular(capturas);
    const grid = el('div', 'pp-cond-grid');
    const items = [
      ['cana', 'Capturas totales', r.total],
      ['pez', 'Especies distintas', r.especiesDistintas],
      ['llama', 'Mejor día', r.mejorDia ? r.mejorDia.n + ' (' + fmtDia(r.mejorDia.dia) + ')' : '—'],
      ['brujula', 'Spots con capturas', r.spotsDistintos]
    ];
    items.forEach(([ic, lbl, val]) => {
      const it = el('div', 'pp-cond');
      it.appendChild(el('div', 'pp-cond-ico', PP.iconos.svg(ic)));
      it.appendChild(el('div', 'pp-cond-lbl', lbl));
      it.appendChild(el('div', 'pp-cond-val', String(val)));
      grid.appendChild(it);
    });
    card.appendChild(grid);

    // Mejores piezas por especie
    const ids = Object.keys(r.porEspecie);
    if (ids.length) {
      card.appendChild(el('div', 'pp-stats-titulo pp-mt', 'Mejores piezas'));
      ids.sort((a, b) => {
        const ta = r.porEspecie[a].talla ? r.porEspecie[a].talla.valor : 0;
        const tb = r.porEspecie[b].talla ? r.porEspecie[b].talla.valor : 0;
        return tb - ta;
      }).forEach(id => {
        const e = PP.especiePorId(id);
        const d = r.porEspecie[id];
        const partes = [];
        if (d.talla) partes.push('<b>' + d.talla.valor + ' cm</b>' + (d.talla.fecha ? ' (' + fmtDia(d.talla.fecha.slice(0, 10)) + ')' : ''));
        if (d.peso) partes.push(d.peso.valor + ' kg');
        card.appendChild(el('div', 'pp-record-fila',
          (e ? e.icono + ' ' + e.nombre : esc(id)) + ' · ' + d.n + ' uds' +
          (partes.length ? ' · ' + partes.join(' · ') : '')));
      });
    } else {
      card.appendChild(el('p', 'pp-nota', 'Registra capturas en el Cuaderno (con talla y peso) y aquí aparecerán tus récords.'));
    }
    return card;
  }

  function fmtDia(iso) {
    const d = new Date(iso + 'T12:00');
    return isNaN(d) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  /* ============ LOGROS ============ */

  function cardLogros(capturas) {
    const card = el('div', 'pp-card');
    const logros = PP.logros.evaluar(capturas);
    const n = logros.filter(l => l.conseguido).length;
    card.appendChild(el('h3', null, '🎖️ Logros (' + n + '/' + logros.length + ')'));
    const grid = el('div', 'pp-logros');
    logros.forEach(l => {
      const c = el('div', 'pp-logro' + (l.conseguido ? ' conseguido' : ''));
      c.appendChild(el('div', 'pp-logro-ico', l.icono));
      c.appendChild(el('div', 'pp-logro-nombre', l.nombre));
      if (!l.conseguido && l.progreso) c.appendChild(el('div', 'pp-logro-prog', l.progreso[0] + '/' + l.progreso[1]));
      c.addEventListener('click', () => {
        const cuerpo = el('div');
        cuerpo.appendChild(el('h3', null, l.icono + ' ' + l.nombre));
        cuerpo.appendChild(el('p', null, l.desc));
        cuerpo.appendChild(el('p', 'pp-nota', l.conseguido ? '✅ Conseguido' :
          (l.progreso ? 'Progreso: ' + l.progreso[0] + ' de ' + l.progreso[1] : 'Aún pendiente')));
        PP.ui.modal(cuerpo);
      });
      grid.appendChild(c);
    });
    card.appendChild(grid);
    return card;
  }

  /* ============ COMPETICIONES ============ */

  function cardLigas(st) {
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, '⚔️ Competiciones con amigos'));

    const fila = el('div', 'pp-modos');
    const bCrear = el('button', 'pp-chip', PP.iconos.html('anadir') + 'Crear');
    bCrear.addEventListener('click', () => conNombre(st, () => modalCrear(st)));
    const bUnirse = el('button', 'pp-chip', PP.iconos.html('bandeja') + 'Unirse / añadir código');
    bUnirse.addEventListener('click', () => conNombre(st, () => modalImportar(st)));
    fila.appendChild(bCrear); fila.appendChild(bUnirse);
    card.appendChild(fila);

    const ligas = PP.liga.listar();
    if (!ligas.length) {
      card.appendChild(el('p', 'pp-nota',
        'Crea una competición (p. ej. "Liga de agosto"), comparte el código de invitación por WhatsApp y que cada amigo envíe su código de resultado. El ranking se calcula aquí, sin cuentas ni servidores.'));
      return card;
    }
    ligas.forEach(liga => {
      const estadoL = PP.liga.estado(liga);
      const rank = PP.liga.ranking(liga);
      const lider = rank[0];
      const item = el('div', 'pp-liga-item');
      item.innerHTML =
        '<div class="pp-liga-cab"><b>' + esc(liga.nombre) + '</b>' +
        '<span class="pp-tag pp-liga-' + estadoL + '">' + estadoL + '</span></div>' +
        '<div class="pp-captura-sub">' + fmtDia(liga.desde) + ' → ' + fmtDia(liga.hasta) + ' · ' +
        PP.liga.MODOS[liga.modo].nombre + ' · ' + liga.participantes.length + ' participante' + (liga.participantes.length !== 1 ? 's' : '') + '</div>' +
        (lider && lider.metrica > 0 ? '<div class="pp-captura-cond">🥇 ' + esc(lider.nombre) + (lider.esYo ? ' (tú)' : '') + ' — ' + esc(lider.detalle) + '</div>' : '');
      item.addEventListener('click', () => modalLiga(liga.id, st));
      card.appendChild(item);
    });
    return card;
  }

  /* Pide el nombre de pescador si aún no existe y luego continúa */
  function conNombre(st, sigue) {
    if (PP.liga.perfil() && PP.liga.perfil().nombre) return sigue();
    const cuerpo = el('div');
    cuerpo.appendChild(el('h3', null, PP.iconos.html('tarjeta') + 'Tu nombre de pescador'));
    cuerpo.appendChild(el('p', 'pp-nota', 'Aparecerá en los rankings que compartas con tus amigos.'));
    const input = el('input', 'pp-input'); input.placeholder = 'P. ej. Iker';
    input.maxLength = 24;
    const b = el('button', 'pp-boton-principal pp-mt', 'Guardar');
    b.addEventListener('click', () => {
      if (!input.value.trim()) { input.focus(); return; }
      PP.liga.setNombre(input.value);
      PP.ui.cerrarModal();
      sigue();
    });
    cuerpo.appendChild(input); cuerpo.appendChild(b);
    PP.ui.modal(cuerpo);
  }

  function modalCrear(st) {
    const cuerpo = el('div');
    cuerpo.appendChild(el('h3', null, '➕ Nueva competición'));
    const form = el('div', 'pp-form');
    const nombre = el('input', 'pp-input'); nombre.placeholder = 'Nombre (p. ej. Liga de agosto)'; nombre.maxLength = 40;
    const desde = el('input', 'pp-input'); desde.type = 'date';
    const hasta = el('input', 'pp-input'); hasta.type = 'date';
    const hoy = new Date(), fin = new Date(Date.now() + 14 * 86400e3);
    desde.value = hoy.toISOString().slice(0, 10);
    hasta.value = fin.toISOString().slice(0, 10);
    const modo = el('select', 'pp-input');
    Object.values(PP.liga.MODOS).forEach(m => {
      const o = el('option', null, m.nombre); o.value = m.id; modo.appendChild(o);
    });
    modo.value = 'puntos';
    form.appendChild(el('label', 'pp-nota', 'Nombre')); form.appendChild(nombre);
    form.appendChild(el('label', 'pp-nota', 'Desde / hasta')); form.appendChild(desde); form.appendChild(hasta);
    form.appendChild(el('label', 'pp-nota', 'Cómo se gana')); form.appendChild(modo);
    const b = el('button', 'pp-boton-principal', 'Crear y compartir invitación');
    b.addEventListener('click', () => {
      try {
        const liga = PP.liga.crear({ nombre: nombre.value.trim(), desde: desde.value, hasta: hasta.value, modo: modo.value });
        PP.liga.actualizarMiResultado(liga.id);
        PP.ui.cerrarModal();
        render(st);
        compartirInvitacion(liga);
      } catch (e) { alert(e.message); }
    });
    form.appendChild(b);
    form.appendChild(el('p', 'pp-nota', 'Puntos por talla: cada cm cuenta 1 punto (captura sin medir: 10 pts). Así una buena pieza vale más que muchas pequeñas, pero la constancia también suma.'));
    cuerpo.appendChild(form);
    PP.ui.modal(cuerpo);
  }

  function modalImportar(st) {
    const cuerpo = el('div');
    cuerpo.appendChild(el('h3', null, '📥 Pegar código'));
    cuerpo.appendChild(el('p', 'pp-nota', 'Vale tanto un código de invitación (para unirte) como un código de resultado de un amigo (para actualizar el ranking).'));
    const area = el('textarea', 'pp-input pp-area'); area.placeholder = 'PESCAPRO1:…'; area.rows = 4;
    const b = el('button', 'pp-boton-principal pp-mt', 'Importar');
    const msg = el('p', 'pp-nota', '');
    b.addEventListener('click', () => {
      try {
        const r = PP.liga.importar(area.value);
        PP.ui.cerrarModal();
        render(st);
        modalLiga(r.liga.id, st);
      } catch (e) { msg.textContent = '⚠️ ' + e.message; }
    });
    cuerpo.appendChild(area); cuerpo.appendChild(b); cuerpo.appendChild(msg);
    PP.ui.modal(cuerpo);
  }

  function modalLiga(id, st) {
    const liga = PP.liga.actualizarMiResultado(id) || PP.liga.porId(id);
    if (!liga) return;
    const cuerpo = el('div');
    const estadoL = PP.liga.estado(liga);
    cuerpo.appendChild(el('h3', null, '⚔️ ' + esc(liga.nombre) + ' <span class="pp-tag pp-liga-' + estadoL + '">' + estadoL + '</span>'));
    cuerpo.appendChild(el('p', 'pp-captura-sub', fmtDia(liga.desde) + ' → ' + fmtDia(liga.hasta) + ' · ' + PP.liga.MODOS[liga.modo].nombre));

    // Ranking
    const rank = PP.liga.ranking(liga);
    const medallas = ['🥇', '🥈', '🥉'];
    rank.forEach((p, i) => {
      const fila = el('div', 'pp-rank-fila' + (p.esYo ? ' yo' : ''));
      fila.innerHTML =
        '<span class="pp-rank-pos">' + (medallas[i] || (i + 1) + 'º') + '</span>' +
        '<span class="pp-rank-nombre">' + esc(p.nombre) + (p.esYo ? ' (tú)' : '') + '</span>' +
        '<span class="pp-rank-detalle">' + esc(p.detalle) + '</span>';
      cuerpo.appendChild(fila);
    });
    if (rank.length === 1) cuerpo.appendChild(el('p', 'pp-nota', 'De momento estás solo: comparte la invitación y pide a tus amigos su código de resultado.'));

    // Acciones
    const acciones = el('div', 'pp-form pp-mt');
    const bInv = el('button', 'pp-chip', PP.iconos.html('compartir') + 'Compartir invitación');
    bInv.addEventListener('click', () => compartirInvitacion(liga));
    const bRes = el('button', 'pp-chip', PP.iconos.html('compartir') + 'Enviar mi resultado');
    bRes.addEventListener('click', () => {
      try {
        const codigo = PP.liga.codigoResultado(liga.id);
        const yo = PP.liga.ranking(PP.liga.porId(liga.id)).find(p => p.esYo);
        compartir('🏆 Mi resultado en «' + liga.nombre + '» (PescaPro): ' + (yo ? yo.detalle : '') +
          '\nPega este código en Trofeos → Unirse/añadir código:\n' + codigo);
      } catch (e) { alert(e.message); }
    });
    const bAdd = el('button', 'pp-chip', PP.iconos.html('bandeja') + 'Añadir resultado de un amigo');
    bAdd.addEventListener('click', () => { PP.ui.cerrarModal(); modalImportar(st); });
    const bDel = el('button', 'pp-chip', PP.iconos.html('papelera') + 'Borrar competición');
    bDel.addEventListener('click', () => {
      if (confirm('¿Borrar «' + liga.nombre + '» de tu móvil? (a tus amigos no les afecta)')) {
        PP.liga.borrar(liga.id); PP.ui.cerrarModal(); render(st);
      }
    });
    [bInv, bRes, bAdd, bDel].forEach(x => acciones.appendChild(x));
    cuerpo.appendChild(acciones);
    cuerpo.appendChild(el('p', 'pp-nota', 'Tu resultado se calcula solo, con las capturas del Cuaderno dentro del periodo. Sistema de confianza: aquí no hay árbitro, hay cuadrilla 😄'));
    PP.ui.modal(cuerpo);
  }

  function compartirInvitacion(liga) {
    compartir('🎣 Te reto en PescaPro: «' + liga.nombre + '» del ' + fmtDia(liga.desde) + ' al ' + fmtDia(liga.hasta) +
      ' (' + PP.liga.MODOS[liga.modo].nombre + ').\nInstala PescaPro, registra tus capturas y pega este código en Trofeos → Unirse:\n' +
      PP.liga.codigoInvitacion(liga));
  }

  async function compartir(texto) {
    if (navigator.share) {
      try { await navigator.share({ text: texto }); return; } catch (e) { /* cancelado → fallback */ }
    }
    try { await navigator.clipboard.writeText(texto); alert('Copiado al portapapeles: pégalo en WhatsApp o donde quieras.'); }
    catch (e) { prompt('Copia el texto:', texto); }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PP;
