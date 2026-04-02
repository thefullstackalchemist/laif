import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.apps[0]!

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env variable is not set')

  const serviceAccount = JSON.parse(raw)

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

export const messaging = () => getApp().messaging()
