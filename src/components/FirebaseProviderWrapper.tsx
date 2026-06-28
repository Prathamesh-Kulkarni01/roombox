"use client";

import React from "react";
import { FirebaseTenantProvider } from "@/context/firebase-tenant-context";
import { app, db, auth } from "@/lib/firebase";

export default function FirebaseProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseTenantProvider defaultApp={app} defaultDb={db} defaultAuth={auth}>
      {children}
    </FirebaseTenantProvider>
  );
}
