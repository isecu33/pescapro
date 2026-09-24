/* Módulo de autenticación con Firebase/Google.
   Usa @capacitor-firebase/authentication para el flujo nativo en Android
   (Google Sign-In nativo) y el popup web en navegador (dev/test). */
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FIREBASE_CONFIG } from './firebase-config.js';

const USUARIO_KEY = 'pp_usuario';

let _usuario = _leerLocal();
const _listeners = [];

// Compacta los datos del usuario que nos importan
function _mapear(u) {
  if (!u) return null;
  return { uid: u.uid, nombre: u.displayName ?? u.email, email: u.email, foto: u.photoUrl ?? null };
}

function _leerLocal() {
  try { return JSON.parse(localStorage.getItem(USUARIO_KEY)); } catch { return null; }
}

function _persistir(u) {
  if (u) localStorage.setItem(USUARIO_KEY, JSON.stringify(u));
  else localStorage.removeItem(USUARIO_KEY);
}

function _notificar(u) {
  _usuario = u;
  _listeners.forEach(fn => fn(u));
}

function _initFirebase() {
  if (getApps().length) return;
  const app = initializeApp(FIREBASE_CONFIG);
  getAuth(app); // inicializa el módulo de auth del SDK web
}

// Llama esto al arrancar la app. Resuelve cuando se conoce el estado inicial.
export async function iniciarAuth() {
  _initFirebase();

  const { user } = await FirebaseAuthentication.getCurrentUser();
  const u = _mapear(user);
  _persistir(u);
  _notificar(u);

  FirebaseAuthentication.addListener('authStateChange', ({ user }) => {
    const u = _mapear(user);
    _persistir(u);
    _notificar(u);
  });
}

export async function loginGoogle() {
  _initFirebase();
  const { user } = await FirebaseAuthentication.signInWithGoogle();
  return _mapear(user);
}

// Solo funciona en iOS con Sign in with Apple configurado en el Apple Developer portal
export async function loginApple() {
  _initFirebase();
  const { user } = await FirebaseAuthentication.signInWithApple();
  return _mapear(user);
}

export async function cerrarSesion() {
  await FirebaseAuthentication.signOut();
}

// Suscribe al cambio de sesión. Devuelve función para desuscribir.
export function onAuthChange(fn) {
  _listeners.push(fn);
  return () => { const i = _listeners.indexOf(fn); if (i > -1) _listeners.splice(i, 1); };
}

// Usuario actual de forma síncrona (null si no autenticado)
export function usuario() {
  return _usuario;
}
