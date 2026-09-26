/* Pantalla de login: overlay de pantalla completa antes de arrancar la app.
   Llama onExito(usuario) al autenticar o onOmitir() si el usuario elige
   continuar sin cuenta. Se destruye a sí misma en cualquier caso.

   En modo desarrollador (import.meta.env.DEV) se añade un botón extra para
   saltar el login directamente: mientras firebase-config.js no tenga
   credenciales reales, los botones de Google/Apple fallarán en cuanto se
   pulsen (auth.js atrapa el fallo y no bloquea el arranque, pero el login
   en sí no puede completarse sin proyecto de Firebase configurado). */
import { loginGoogle, loginApple } from '../../domain/auth.js';
import { activo as devActivo } from '../../domain/dev.js';
import { svg } from '../util/icons.js';

const CSS = `
  .pp-login {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0; padding: calc(32px + env(safe-area-inset-top)) 24px calc(28px + env(safe-area-inset-bottom));
    font-family: 'SF Pro Text', 'Helvetica Neue', system-ui, -apple-system, sans-serif;
    color: #dde8f2;
    overflow: hidden;
    background: #0a1420;
  }
  .pp-login__atmosfera {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(60% 42% at 50% 8%, rgba(255,114,0,0.16), transparent 68%),
      radial-gradient(70% 50% at 85% 95%, rgba(20,80,110,0.35), transparent 70%),
      radial-gradient(50% 40% at -5% 100%, rgba(255,114,0,0.06), transparent 70%);
  }
  .pp-login__marca-fondo {
    position: absolute; z-index: 0; pointer-events: none;
    width: 420px; height: 420px; right: -140px; bottom: -120px;
    opacity: 0.07; transform: rotate(-8deg);
  }
  .pp-login__olas {
    position: absolute; z-index: 0; pointer-events: none;
    left: 0; right: 0; bottom: 0;
    display: flex; justify-content: space-evenly;
    padding: 0 4px 14px; opacity: 0.5;
    color: #ff7200;
    mask-image: linear-gradient(to top, black, transparent);
  }
  .pp-login__contenido {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    width: 100%;
  }
  .pp-login__marca {
    display: flex; flex-direction: column; align-items: center;
    margin-bottom: 52px;
  }
  .pp-login__icono {
    width: 76px; height: 76px; margin-bottom: 14px;
    filter: drop-shadow(0 8px 24px rgba(255, 114, 0, 0.35));
  }
  .pp-login__wordmark {
    height: 22px; width: auto; margin-bottom: 10px;
  }
  .pp-login__sub {
    font-size: 14px; color: #7a96aa; margin: 0;
    text-align: center; max-width: 260px; line-height: 1.4;
  }
  .pp-login__titulo {
    font-size: 15px; color: #7a96aa; margin-bottom: 20px;
    text-align: center;
  }
  .pp-login__btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; max-width: 300px; padding: 14px 20px;
    border: none; border-radius: 14px; cursor: pointer;
    font-size: 16px; font-weight: 600; margin-bottom: 12px;
    transition: transform 0.12s var(--pp-ease, ease), opacity 0.15s; outline: none;
  }
  .pp-login__btn:active { transform: scale(0.98); }
  .pp-login__btn:disabled { opacity: 0.6; cursor: default; transform: none; }
  .pp-login__btn--google {
    background: #fff; color: #1f1f1f;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
  }
  .pp-login__btn--apple {
    background: #1c1c1e; color: #fff;
    border: 1px solid #333;
  }
  .pp-login__btn--google svg, .pp-login__btn--apple svg {
    width: 20px; height: 20px; flex-shrink: 0;
  }
  .pp-login__omitir {
    margin-top: 22px; background: none;
    border: 1px solid rgba(122,150,170,0.35); border-radius: 999px;
    color: #a8bdcc; font-size: 14px; cursor: pointer;
    padding: 10px 22px; transition: transform 0.12s var(--pp-ease, ease), border-color 0.15s;
  }
  .pp-login__omitir:active { transform: scale(0.98); }
  .pp-login__error {
    color: #ff6b5e; font-size: 13px; line-height: 1.4; margin-top: 14px;
    text-align: center; max-width: 280px;
    min-height: 37px;
  }
  .pp-login__error-enlace {
    text-decoration: underline; cursor: pointer;
  }
  .pp-login__spinner {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,165,0,0.3);
    border-top-color: #ff7200;
    border-radius: 50%;
    animation: pp-spin 0.7s linear infinite;
    display: none;
  }
  @keyframes pp-spin { to { transform: rotate(360deg); } }

  .pp-login__dev {
    margin-top: 28px; padding-top: 18px; width: 100%; max-width: 300px;
    border-top: 1px dashed rgba(122,150,170,0.3);
    display: flex; flex-direction: column; align-items: center;
  }
  .pp-login__dev-etiqueta {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    color: #5a7285; margin-bottom: 8px;
  }
  .pp-login__dev-btn {
    width: 100%; padding: 10px 16px; border-radius: 999px;
    background: rgba(255,114,0,0.14); border: 1px solid rgba(122,150,170,0.35);
    color: #ffa64d; font-size: 13px; font-weight: 600; cursor: pointer;
    transition: transform 0.12s var(--pp-ease, ease), background 0.15s;
  }
  .pp-login__dev-btn:active { transform: scale(0.98); background: rgba(255,114,0,0.14); }

  @media (prefers-reduced-motion: no-preference) {
    .pp-login__marca { animation: pp-login-entrar 0.5s cubic-bezier(.25,.8,.25,1) both; }
    .pp-login__acciones { animation: pp-login-entrar 0.5s cubic-bezier(.25,.8,.25,1) 0.08s both; }
  }
  @keyframes pp-login-entrar {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ICONO_GOOGLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>`;

const ICONO_APPLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
</svg>`;

function olasFondo() {
  const wrap = document.createElement('div');
  wrap.className = 'pp-login__olas';
  for (let i = 0; i < 5; i++) {
    wrap.appendChild(svg('ola', 40));
  }
  return wrap;
}

export function mostrarLogin(onExito, onOmitir) {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const el = document.createElement('div');
  el.className = 'pp-login';

  const atmosfera = document.createElement('div');
  atmosfera.className = 'pp-login__atmosfera';
  el.appendChild(atmosfera);

  const marcaFondo = document.createElement('img');
  marcaFondo.className = 'pp-login__marca-fondo';
  marcaFondo.src = './iconos/png/logo-marante.png';
  marcaFondo.alt = '';
  marcaFondo.setAttribute('aria-hidden', 'true');
  el.appendChild(marcaFondo);

  el.appendChild(olasFondo());

  const contenido = document.createElement('div');
  contenido.className = 'pp-login__contenido';

  contenido.innerHTML = `
    <div class="pp-login__marca">
      <img class="pp-login__icono" src="./iconos/png/logo-marante.png" alt="Marante">
      <img class="pp-login__wordmark" src="./iconos/png/logo-marante-texto.png" alt="Marante">
      <p class="pp-login__sub">Condiciones de pesca en tiempo real</p>
    </div>
    <div class="pp-login__acciones">
      <p class="pp-login__titulo">Accede con tu cuenta</p>
      <button class="pp-login__btn pp-login__btn--google" id="pp-btn-google">
        ${ICONO_GOOGLE}
        Continuar con Google
      </button>
      <button class="pp-login__btn pp-login__btn--apple" id="pp-btn-apple">
        ${ICONO_APPLE}
        Continuar con Apple
      </button>
      <div class="pp-login__spinner" id="pp-spinner"></div>
      <p class="pp-login__error" id="pp-error"></p>
      <button class="pp-login__omitir" id="pp-btn-omitir">Continuar sin cuenta</button>
    </div>
  `;
  el.appendChild(contenido);

  if (devActivo) {
    const dev = document.createElement('div');
    dev.className = 'pp-login__dev';
    dev.innerHTML = `
      <div class="pp-login__dev-etiqueta">MODO DESARROLLADOR</div>
      <button class="pp-login__dev-btn" id="pp-btn-dev-skip">Saltar login (sin Firebase configurado)</button>
    `;
    contenido.appendChild(dev);
    dev.querySelector('#pp-btn-dev-skip').addEventListener('click', () => { destruir(); onOmitir(); });
  }

  document.body.appendChild(el);

  const spinner = el.querySelector('#pp-spinner');
  const errorEl = el.querySelector('#pp-error');

  function destruir() {
    el.remove();
    estilo.remove();
  }

  function setCargando(v) {
    spinner.style.display = v ? 'block' : 'none';
    el.querySelectorAll('.pp-login__btn').forEach(b => { b.disabled = v; });
  }

  async function intentarLogin(fn) {
    setCargando(true);
    errorEl.textContent = '';
    try {
      const u = await fn();
      destruir();
      onExito(u);
    } catch (e) {
      // El usuario canceló el diálogo: no mostrar error
      if (e?.code !== 'sign_in_cancelled' && e?.message !== 'sign_in_cancelled') {
        errorEl.append('No se pudo iniciar sesión. ');
        const enlaceOmitir = document.createElement('span');
        enlaceOmitir.className = 'pp-login__error-enlace';
        enlaceOmitir.textContent = 'Continuar sin cuenta';
        enlaceOmitir.addEventListener('click', () => { destruir(); onOmitir(); });
        errorEl.appendChild(enlaceOmitir);
      }
    } finally {
      setCargando(false);
    }
  }

  el.querySelector('#pp-btn-google').addEventListener('click', () => intentarLogin(loginGoogle));
  el.querySelector('#pp-btn-apple').addEventListener('click', () => intentarLogin(loginApple));
  el.querySelector('#pp-btn-omitir').addEventListener('click', () => { destruir(); onOmitir(); });
}
