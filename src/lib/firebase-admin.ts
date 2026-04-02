import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.apps[0]!

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env variable is not set')

  const serviceAccount = JSON.parse(raw)
  // .env files escape \n → \\n in the private key — restore actual newlines
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

export const messaging = () => getApp().messaging()
