
// This file is used for Firebase Admin SDK initialization on the server.
// It reads the service account credentials from environment variables.
// IMPORTANT: This file SHOULD be in your .gitignore to prevent credentials from being exposed.

// A chave privada é lida de uma variável de ambiente codificada em Base64
// para evitar problemas com caracteres de nova linha em ambientes de contêiner.
const privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64 
  ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
  : undefined;

// Ensure you have these environment variables set in your deployment environment.
export const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};
