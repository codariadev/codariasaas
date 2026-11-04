import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
// Um app Firebase por tenant (projeto do cliente). Com NEXT_PUBLIC_USE_EMULATORS=true (somente dev) usa o Emulator Suite local.
export function getTenantFirebase(tenantId: string, cfg: FirebaseOptions) {
  const existing = getApps().find((a) => a.name === tenantId);
  const app: FirebaseApp = existing ?? initializeApp(cfg, tenantId);
  const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
  if (!existing && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  return { app, auth, db, storage };
}
