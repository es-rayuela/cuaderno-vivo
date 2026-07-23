import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, firebaseReady } from "./firebase";
import { getProfile } from "./store";
import {
  C,
  CSS,
  BrandMark,
  Slogan,
  Login,
  StudentApp,
  TeacherApp,
} from "./CuadernoVivo.jsx";

function Centered({ children }) {
  return (
    <div
      className="cv-root"
      style={{ minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 24 }}
    >
      <style>{CSS}</style>
      {children}
    </div>
  );
}

function Splash() {
  return (
    <Centered>
      <div className="cv-float"><BrandMark size={64} /></div>
    </Centered>
  );
}

function ConfigMissing() {
  return (
    <Centered>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div style={{ display: "inline-block", marginBottom: 16 }}><BrandMark size={64} /></div>
        <h1 className="cv-display" style={{ fontSize: 34, color: C.navy, margin: "0 0 8px" }}>Falta configurar Firebase</h1>
        <Slogan />
        <p style={{ marginTop: 18, fontSize: 15, color: "rgba(36,39,54,.75)", fontWeight: 600, lineHeight: 1.6 }}>
          Abre <code>src/firebase.js</code> y pega la configuración de tu proyecto de Firebase
          (apiKey, projectId, etc.). Sigue el paso a paso del archivo <code>README.md</code>.
        </p>
      </div>
    </Centered>
  );
}

function NoProfile({ onLogout }) {
  return (
    <Centered>
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <div style={{ display: "inline-block", marginBottom: 16 }}><BrandMark size={56} /></div>
        <h1 className="cv-display" style={{ fontSize: 30, color: C.navy, margin: "0 0 10px" }}>Cuenta sin perfil</h1>
        <p style={{ fontSize: 15, color: "rgba(36,39,54,.75)", fontWeight: 600, lineHeight: 1.6 }}>
          Esta cuenta existe pero no está asociada a ninguna alumna ni profesora.
          Pide a tu profesora que cree tu cuenta desde el modo profesora.
        </p>
        <button className="cv-btn" onClick={onLogout} style={{ marginTop: 20, padding: "14px 28px", fontSize: 15, background: C.pink, color: C.white }}>
          Cerrar sesión
        </button>
      </div>
    </Centered>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = fuera
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setProfileLoading(true);
        try {
          setProfile(await getProfile(u.uid));
        } catch (e) {
          setProfile(null);
        }
        setProfileLoading(false);
      } else {
        setProfile(null);
      }
    });
  }, []);

  const logout = () => signOut(auth);

  if (!firebaseReady) return <ConfigMissing />;
  if (user === undefined || profileLoading) return <Splash />;
  if (!user) return <Login />;
  if (!profile) return <NoProfile onLogout={logout} />;
  if (profile.role === "teacher") return <TeacherApp uid={user.uid} onLogout={logout} />;
  return <StudentApp uid={user.uid} onLogout={logout} />;
}
