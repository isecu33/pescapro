/* Pantalla de login: overlay de pantalla completa antes de arrancar la app.
   Llama onExito(usuario) al autenticar o onOmitir() si el usuario elige
   continuar sin cuenta. Se destruye a sí misma en cualquier caso. */
import { loginGoogle, loginApple } from '../../domain/auth.js';

const CSS = `
  .pp-login {
    position: fixed; inset: 0; z-index: 9999;
    background: #0a1520;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0; padding: 32px 24px;
    font-family: system-ui, sans-serif;
    color: #dde8f2;
  }
  .pp-login__logo {
    font-size: 52px; margin-bottom: 8px;
  }
  .pp-login__nombre {
    font-size: 28px; font-weight: 700; letter-spacing: -0.5px;
    color: #ffa500; margin-bottom: 4px;
  }
  .pp-login__sub {
    font-size: 14px; color: #7a96aa; margin-bottom: 48px;
    text-align: center; max-width: 240px;
  }
  .pp-login__titulo {
    font-size: 16px; color: #7a96aa; margin-bottom: 20px;
    text-align: center;
  }
  .pp-login__btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; max-width: 300px; padding: 14px 20px;
    border: none; border-radius: 12px; cursor: pointer;
    font-size: 16px; font-weight: 600; margin-bottom: 12px;
    transition: opacity 0.15s; outline: none;
  }
  .pp-login__btn:active { opacity: 0.8; }
  .pp-login__btn--google {
    background: #fff; color: #1f1f1f;
  }
  .pp-login__btn--apple {
    background: #1c1c1e; color: #fff;
    border: 1px solid #333;
  }
  .pp-login__btn--google svg, .pp-login__btn--apple svg {
    width: 20px; height: 20px; flex-shrink: 0;
  }
  .pp-login__omitir {
    margin-top: 24px; background: none; border: none;
    color: #7a96aa; font-size: 14px; cursor: pointer;
    padding: 8px; text-decoration: underline; text-underline-offset: 3px;
  }
  .pp-login__error {
    color: #d42b2b; font-size: 13px; margin-top: 12px;
    text-align: center; max-width: 280px;
    min-height: 18px;
  }
  .pp-login__spinner {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,165,0,0.3);
    border-top-color: #ffa500;
    border-radius: 50%;
    animation: pp-spin 0.7s linear infinite;
    display: none;
  }
  @keyframes pp-spin { to { transform: rotate(360deg); } }
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

export function mostrarLogin(onExito, onOmitir) {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const el = document.createElement('div');
  el.className = 'pp-login';
  el.innerHTML = `
    <div class="pp-login__logo">🎣</div>
    <div class="pp-login__nombre">PescaPro</div>
    <p class="pp-login__sub">Condiciones de pesca en tiempo real</p>
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
  `;
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
        errorEl.textContent = 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      }
    } finally {
      setCargando(false);
    }
  }

  el.querySelector('#pp-btn-google').addEventListener('click', () => intentarLogin(loginGoogle));
  el.querySelector('#pp-btn-apple').addEventListener('click', () => intentarLogin(loginApple));
  el.querySelector('#pp-btn-omitir').addEventListener('click', () => { destruir(); onOmitir(); });
}
