/* CONFIGURACIÓN DE FIREBASE — rellena con los datos de tu proyecto.
   Pasos:
   1. Crea un proyecto en https://console.firebase.google.com
   2. Authentication > Sign-in method > activa Google (y Apple si quieres)
   3. Project settings > General > Your apps > Add app (Web)
   4. Copia el objeto firebaseConfig aquí
   5. Para Google Sign-In nativo en Android:
      - Project settings > General > Your apps > Add app (Android)
      - Package name: com.pescapro.app (o el que uses en capacitor.config.json)
      - Añade el SHA-1 de tu keystore (debug: ./android/gradlew signingReport)
      - Descarga google-services.json → android/app/google-services.json
      - npx cap sync android */

export const FIREBASE_CONFIG = {
  apiKey:            'TU_API_KEY',
  authDomain:        'TU_PROYECTO.firebaseapp.com',
  projectId:         'TU_PROYECTO',
  storageBucket:     'TU_PROYECTO.firebasestorage.app',
  messagingSenderId: 'TU_SENDER_ID',
  appId:             'TU_APP_ID'
};
