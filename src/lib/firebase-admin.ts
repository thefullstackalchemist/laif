import admin from 'firebase-admin'

function getApp() {
  if (admin.apps.length) return admin.apps[0]!

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env variable is not set')

  const cleaned = raw.trim().replace(/^(['"])([\s\S]*)\1$/, '$2')
  const serviceAccount = JSON.parse(cleaned)
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL
    || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  })
}

export const messaging = () => getApp().messaging()
export const rtdb      = () => getApp().database()
