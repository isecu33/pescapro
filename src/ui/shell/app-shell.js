/* <pp-app-shell> -- shell de la app: ion-app + ion-header/ion-toolbar
   (logo, selector de spot, favorito/refrescar) + banner de seguridad +
   contenedor de contenido + ion-tab-bar (una vista por pestaña).

   Sustituye el header/nav estaticos de www/index.html. No se usa
   ion-tabs/router de Ionic (decision del plan de migracion): la vista
   activa se controla a mano via la propiedad `vistaActiva`, igual que
   hoy hace app.js con `.pp-vista.activa`. Usa Light DOM (sin Shadow
   Root) para que los componentes Ionic (que si tienen su propio Shadow
   DOM) participen del layout global sin fricciones de estilos.

   API publica:
   - .contenido            -> elemento <main> donde montar la vista activa
   - .vistaActiva (get/set) -> id de la vista visible; el set dispara pp-cambiar-vista
   - .spot = {nombre}       -> texto del selector de spot
   - .actualizado = string  -> "hace 5 min" etc., junto al spot
   - .seguridad = {nivel, motivos} | null -> banner de seguridad
   - .refrescando = bool    -> anima el icono de refrescar
   Eventos emitidos: pp-cambiar-vista, pp-cambiar-spot, pp-favorito, pp-refrescar */

import { svg } from '../../domain/iconos.js';

const VISTAS = [
  { id: 'ahora', nombre: 'Ahora', icono: 'speedometer-outline' },
  { id: 'prevision', nombre: 'Previsión', icono: 'trending-up-outline' },
  { id: 'mapa', nombre: 'Mapa', icono: 'map-outline' },
  { id: 'especies', nombre: 'Especies', icono: 'fish-outline' },
  { id: 'cuaderno', nombre: 'Cuaderno', icono: 'book-outline' },
  { id: 'trofeos', nombre: 'Trofeos', icono: 'trophy-outline' }
];

export class PpAppShell extends HTMLElement {
  constructor() {
    super();
    this._vistaActiva = 'ahora';
    this._botones = {};
    // El spec de Custom Elements prohibe anadir hijos de luz (light DOM)
    // dentro del constructor -- los navegadores reales lo hacen cumplir
    // (Chrome: "NotSupportedError: ... must not have children"; happy-dom,
    // usado en los tests, NO lo valida, asi que este bug paso los tests
    // pero rompia la app real). _build() se difiere a connectedCallback(),
    // que si permite mutar el propio elemento.
  }

  connectedCallback() {
    if (!this._construido) {
      this._construido = true;
      this._build();
    }
    this._actualizarTabSeleccionado();
  }

  _build() {
    this.textContent = '';
    const app = document.createElement('ion-app');

    const header = document.createElement('ion-header');
    header.setAttribute('translucent', 'true');
    const toolbar = document.createElement('ion-toolbar');

    const logo = document.createElement('div');
    logo.slot = 'start';
    logo.className = 'pp-logo';
    const logoImg = document.createElement('img');
    logoImg.src = './img/logo-marante.png';
    logoImg.alt = 'Marante';
    logo.appendChild(logoImg);
    toolbar.appendChild(logo);

    const selector = document.createElement('div');
    selector.className = 'pp-spot-selector';

    const pinIco = svg('pin');
    if (pinIco) {
      pinIco.style.cssText = 'width:16px;height:16px;flex:none;color:var(--pp-accion-color,rgba(255,255,255,0.54))';
      selector.appendChild(pinIco);
    }

    const spotTextos = document.createElement('div');
    spotTextos.className = 'pp-spot-textos';
    this._spotNombreEl = document.createElement('span');
    this._spotNombreEl.className = 'pp-spot-nombre';
    this._spotNombreEl.textContent = '—';
    spotTextos.append(this._spotNombreEl);
    selector.appendChild(spotTextos);

    selector.addEventListener('click', () => this._emit('pp-cambiar-spot'));
    toolbar.appendChild(selector);

    const acciones = document.createElement('div');
    acciones.slot = 'end';
    const btnFav = document.createElement('ion-button');
    btnFav.setAttribute('fill', 'clear');
    btnFav.className = 'pp-accion-btn';
    const icoFav = document.createElement('ion-icon');
    icoFav.setAttribute('name', 'star-outline');
    icoFav.slot = 'icon-only';
    btnFav.appendChild(icoFav);
    btnFav.addEventListener('click', () => this._emit('pp-favorito'));

    const btnRef = document.createElement('ion-button');
    btnRef.setAttribute('fill', 'clear');
    btnRef.className = 'pp-accion-btn';
    this._icoRefEl = document.createElement('ion-icon');
    this._icoRefEl.setAttribute('name', 'refresh-outline');
    this._icoRefEl.slot = 'icon-only';
    btnRef.appendChild(this._icoRefEl);
    btnRef.addEventListener('click', () => this._emit('pp-refrescar'));

    const btnMenu = document.createElement('ion-button');
    btnMenu.setAttribute('fill', 'clear');
    btnMenu.className = 'pp-accion-btn';
    const icoMenu = document.createElement('ion-icon');
    icoMenu.setAttribute('name', 'menu-outline');
    icoMenu.slot = 'icon-only';
    btnMenu.appendChild(icoMenu);
    btnMenu.addEventListener('click', () => {
      const m = this.querySelector('ion-menu');
      if (m) m.toggle();
    });

    acciones.append(btnFav, btnRef, btnMenu);
    toolbar.appendChild(acciones);
    header.appendChild(toolbar);

    this._contenido = document.createElement('main');
    this._contenido.className = 'pp-contenido';
    this._contenido.id = 'pp-contenido';

    const tabBar = document.createElement('ion-tab-bar');
    VISTAS.forEach(v => {
      const btn = document.createElement('ion-tab-button');
      btn.setAttribute('tab', v.id);
      const ico = document.createElement('ion-icon');
      ico.setAttribute('name', v.icono);
      const lbl = document.createElement('ion-label');
      lbl.textContent = v.nombre;
      btn.append(ico, lbl);
      btn.addEventListener('click', () => { this.vistaActiva = v.id; });
      tabBar.appendChild(btn);
      this._botones[v.id] = btn;
    });

    const menuLateral = this._buildMenu();
    app.append(menuLateral, header, this._contenido, tabBar);
    this.appendChild(app);
    this._actualizarTabSeleccionado();
  }

  _buildMenu() {
    const menu = document.createElement('ion-menu');
    menu.setAttribute('side', 'end');
    menu.setAttribute('menu-id', 'pp-menu-lateral');
    menu.setAttribute('content-id', 'pp-contenido');

    // Cabecera del drawer
    const mHeader = document.createElement('ion-header');
    const mToolbar = document.createElement('ion-toolbar');
    const mTitle = document.createElement('ion-title');
    mTitle.textContent = 'Marante';
    mToolbar.appendChild(mTitle);
    mHeader.appendChild(mToolbar);

    const mContent = document.createElement('ion-content');

    // Sección perfil
    const perfil = document.createElement('div');
    perfil.className = 'pp-menu-perfil';
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'pp-menu-avatar';
    const avatarIco = document.createElement('ion-icon');
    avatarIco.setAttribute('name', 'person-circle-outline');
    avatarWrap.appendChild(avatarIco);
    const perfilNombre = document.createElement('div');
    perfilNombre.className = 'pp-menu-perfil-nombre';
    perfilNombre.textContent = 'Mi perfil';
    const perfilSub = document.createElement('div');
    perfilSub.className = 'pp-menu-perfil-sub';
    perfilSub.textContent = 'Pescador local';
    perfil.append(avatarWrap, perfilNombre, perfilSub);

    // Sección notificaciones
    const secNotif = this._menuSeccion('Notificaciones');
    const itemNotif = this._menuItem('notifications-outline', 'Alertas de condiciones', () => this._emit('pp-menu-notificaciones'));
    secNotif.appendChild(itemNotif);

    // Sección ajustes
    const secAjustes = this._menuSeccion('Ajustes');
    const ajustesItems = [
      { ico: 'moon-outline', label: 'Tema oscuro / claro', ev: 'pp-menu-tema' },
      { ico: 'cloud-download-outline', label: 'Borrar caché de datos', ev: 'pp-menu-borrar-cache' },
    ];
    ajustesItems.forEach(({ ico, label, ev }) => {
      secAjustes.appendChild(this._menuItem(ico, label, () => this._emit(ev)));
    });

    // Sección información
    const secInfo = this._menuSeccion('Información');
    secInfo.appendChild(this._menuItem('information-circle-outline', 'Acerca de Marante', () => this._emit('pp-menu-acerca')));

    mContent.append(perfil, secNotif, secAjustes, secInfo);
    menu.append(mHeader, mContent);
    return menu;
  }

  _menuSeccion(titulo) {
    const wrap = document.createElement('div');
    wrap.className = 'pp-menu-seccion';
    const label = document.createElement('div');
    label.className = 'pp-menu-seccion-titulo';
    label.textContent = titulo.toUpperCase();
    const list = document.createElement('ion-list');
    list.setAttribute('lines', 'none');
    wrap.append(label, list);
    return wrap;
  }

  _menuItem(icono, texto, onClick) {
    const item = document.createElement('ion-item');
    item.setAttribute('button', 'true');
    item.setAttribute('detail', 'false');
    item.className = 'pp-menu-item';
    const ico = document.createElement('ion-icon');
    ico.setAttribute('name', icono);
    ico.slot = 'start';
    const lbl = document.createElement('ion-label');
    lbl.textContent = texto;
    const chevron = document.createElement('ion-icon');
    chevron.setAttribute('name', 'chevron-forward-outline');
    chevron.slot = 'end';
    chevron.className = 'pp-menu-chevron';
    item.append(ico, lbl, chevron);
    item.addEventListener('click', () => {
      const m = this.querySelector('ion-menu');
      if (m) m.close();
      onClick();
    });
    return item;
  }

  get contenido() { return this._contenido; }

  get vistaActiva() { return this._vistaActiva; }
  set vistaActiva(id) {
    if (!VISTAS.some(v => v.id === id) || id === this._vistaActiva) return;
    this._vistaActiva = id;
    this._actualizarTabSeleccionado();
    this._emit('pp-cambiar-vista', { vista: id });
  }

  _actualizarTabSeleccionado() {
    Object.entries(this._botones).forEach(([id, btn]) => {
      if (id === this._vistaActiva) btn.setAttribute('selected', 'true');
      else btn.removeAttribute('selected');
    });
  }

  set spot(info) {
    this._spotNombreEl.textContent = (info && info.nombre) ? info.nombre : '—';
  }

  set actualizado(_texto) { /* eliminado: timestamp no aporta info útil */ }

  set refrescando(activo) {
    this._icoRefEl.classList.toggle('girando', !!activo);
  }

  /* seguridad = {nivel: 'ok'|'amarillo'|'rojo', motivos: [...]} | null.
     Los motivos vienen de PP.indice.seguridad() (texto fijo del propio
     dominio, no input de usuario), pero se usa textContent igualmente
     por consistencia con el resto de componentes. */
  set seguridad(_info) {
    // El banner de seguridad se renderiza dentro de cada vista, no en el shell
  }

  _emit(nombre, detail) {
    this.dispatchEvent(new CustomEvent(nombre, { detail: detail || {}, bubbles: true, composed: true }));
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-app-shell')) {
  customElements.define('pp-app-shell', PpAppShell);
}
