/* Tarjeta publica de perfil: banner + avatar + nombre + @usuario + clan +
   insignias favoritas (+ bio en la variante completa). Es lo que vera otro
   pescador cuando te encuentre o aparezcas junto a una captura; se usa en
   la cabecera del menu lateral (variante compacta) y en la vista Perfil.

   Todo con createElement/textContent: nombre, bio y clan pueden venir de
   un codigo de otro dispositivo, nunca se meten en innerHTML. */
import { bannerCss, FOTO_BANNER, FOTO_AVATAR } from '../../domain/perfil.js';
import { obtener as obtenerFoto } from '../../domain/fotos.js';

/* Icono de un logro: PNG si existe (con fallback al emoji), si no emoji. */
export function crearIcoLogro(l, cls) {
  const clase = cls || 'pp-logro-ico';
  if (l.img) {
    const img = document.createElement('img');
    img.className = clase + ' pp-logro-ico-png';
    img.src = l.img;
    img.alt = l.nombre;
    img.onerror = () => {
      img.onerror = null;
      const fb = document.createElement('span');
      fb.className = clase;
      fb.textContent = l.icono;
      img.replaceWith(fb);
    };
    return img;
  }
  const span = document.createElement('span');
  span.className = clase;
  span.textContent = l.icono;
  return span;
}

export function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '🎣';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/* datos = perfil.publico() (+ opcional bannerSrc/avatarSrc)
   opts  = { logros: evaluar(...), compacta: bool, onClick: fn } */
export function crearTarjetaPerfil(datos, opts) {
  opts = opts || {};
  const tarjeta = document.createElement('div');
  tarjeta.className = 'pp-perfil-tarjeta' + (opts.compacta ? ' compacta' : '');

  const banner = document.createElement('div');
  banner.className = 'pp-perfil-banner';
  banner.style.background = bannerCss(datos.banner);
  tarjeta.appendChild(banner);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-cuerpo';

  const avatar = document.createElement('div');
  avatar.className = 'pp-perfil-avatar';
  avatar.textContent = iniciales(datos.nombre);
  cuerpo.appendChild(avatar);

  const nombre = document.createElement('div');
  nombre.className = 'pp-perfil-nombre';
  nombre.textContent = datos.nombre;
  if (datos.clan) {
    const tag = document.createElement('span');
    tag.className = 'pp-perfil-clan-tag';
    tag.textContent = '[' + datos.clan.etiqueta + ']';
    tag.title = datos.clan.nombre;
    nombre.appendChild(tag);
  }
  cuerpo.appendChild(nombre);

  const usuario = document.createElement('div');
  usuario.className = 'pp-perfil-usuario';
  usuario.textContent = datos.usuario ? '@' + datos.usuario : 'Sin nombre de usuario';
  cuerpo.appendChild(usuario);

  if (!opts.compacta && datos.bio) {
    const bio = document.createElement('p');
    bio.className = 'pp-perfil-bio';
    bio.textContent = datos.bio;
    cuerpo.appendChild(bio);
  }

  if (!opts.compacta && datos.clan) {
    const clan = document.createElement('div');
    clan.className = 'pp-perfil-clan';
    clan.textContent = '⚓ ' + datos.clan.nombre;
    cuerpo.appendChild(clan);
  }

  const logros = opts.logros || [];
  const insignias = (datos.insignias || [])
    .map(id => logros.find(l => l.id === id && l.conseguido))
    .filter(Boolean);
  if (insignias.length) {
    const fila = document.createElement('div');
    fila.className = 'pp-perfil-insignias';
    insignias.forEach(l => {
      const ins = document.createElement('div');
      ins.className = 'pp-perfil-insignia';
      ins.title = l.nombre;
      ins.appendChild(crearIcoLogro(l, 'pp-perfil-insignia-ico'));
      fila.appendChild(ins);
    });
    cuerpo.appendChild(fila);
  }

  tarjeta.appendChild(cuerpo);
  if (opts.onClick) {
    tarjeta.classList.add('pulsable');
    tarjeta.setAttribute('role', 'button');
    tarjeta.tabIndex = 0;
    tarjeta.addEventListener('click', opts.onClick);
  }

  aplicarImagenes(tarjeta, datos);
  return tarjeta;
}

/* Pinta imagenes de banner/avatar sobre una tarjeta ya creada. */
export function aplicarImagenes(tarjeta, { bannerSrc, avatarSrc }) {
  if (bannerSrc) {
    const b = tarjeta.querySelector('.pp-perfil-banner');
    if (b) {
      b.style.backgroundImage = 'url("' + String(bannerSrc).replace(/"/g, '%22') + '")';
      b.style.backgroundSize = 'cover';
      b.style.backgroundPosition = 'center';
    }
  }
  if (avatarSrc) {
    const a = tarjeta.querySelector('.pp-perfil-avatar');
    if (a) {
      const img = document.createElement('img');
      img.src = avatarSrc;
      img.alt = '';
      a.replaceChildren(img);
    }
  }
}

/* Carga (async) las imagenes propias del perfil local desde IndexedDB. */
export function cargarImagenesPropias(perfil, tarjeta) {
  const pBanner = perfil.bannerFoto ? obtenerFoto(FOTO_BANNER) : Promise.resolve(null);
  const pAvatar = perfil.avatarFoto ? obtenerFoto(FOTO_AVATAR) : Promise.resolve(null);
  return Promise.all([pBanner, pAvatar]).then(([bannerSrc, avatarSrc]) => {
    if (tarjeta) aplicarImagenes(tarjeta, { bannerSrc, avatarSrc });
    return { bannerSrc, avatarSrc };
  });
}
