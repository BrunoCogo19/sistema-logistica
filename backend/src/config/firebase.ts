import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// do src/config/ para a raiz do backend:
import serviceAccount from "../../serviceAccountKey.json" with { type: "json" };

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    }),
  });
}

export const db = getFirestore();
