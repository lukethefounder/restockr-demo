'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'buyer' | 'distributor' | 'founder';
type Lang = 'en' | 'es';

export default function HomePage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('buyer');
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState<Lang>('en');

    const handleContinue = async () => {
    if (!email.trim()) {
      alert(
        lang === 'en'
          ? 'Please enter your email (demo only).'
          : 'Por favor ingresa tu correo (solo demo).'
      );
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error ||
          (lang === 'en'
            ? 'Login failed. Ensure you are using a demo email from the seed (founder@demo.com, buyer@demo.com, dist@demo.com).'
            : 'Inicio de sesión fallido. Asegúrate de usar un correo demo de la semilla (founder@demo.com, buyer@demo.com, dist@demo.com).');
        alert(msg);
        return;
      }

      const data = await res.json();
      const userRole = data.role as Role;

      // Route based on actual role from DB (ignoring selected pill for safety)
      if (userRole === 'buyer') {
        router.push('/buyer');
      } else if (userRole === 'distributor') {
        router.push('/distributor');
      } else if (userRole === 'founder') {
        router.push('/founder');
      } else {
        // Unexpected role
        alert(
          lang === 'en'
            ? 'Unknown role returned from server.'
            : 'Rol desconocido devuelto por el servidor.'
        );
      }
    } catch (err) {
      console.error('Login error:', err);
      alert(
        lang === 'en'
          ? 'Network or server error during login (demo).'
          : 'Error de red o servidor durante el inicio de sesión (demo).'
      );
    }
  };

  const t = translations[lang];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        {/* Language toggle row */}
        <div className="flex items-center justify-end mb-2">
          <LanguageToggle lang={lang} setLang={setLang} />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Restockr demo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t.heading}</h1>
          <p className="text-sm text-slate-400">{t.subheading}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">{t.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-300">{t.roleLabel}</p>
            <div className="flex gap-2 text-xs">
              <RoleButton label={t.roles.buyer} value="buyer" role={role} setRole={setRole} />
              <RoleButton label={t.roles.distributor} value="distributor" role={role} setRole={setRole} />
              <RoleButton label={t.roles.founder} value="founder" role={role} setRole={setRole} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-full bg-emerald-500 py-2 text-sm font-medium text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {t.continueButton[role]}
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          {t.footer}
        </p>
      </div>
    </main>
  );
}

type RoleButtonProps = {
  label: string;
  value: Role;
  role: Role;
  setRole: (r: Role) => void;
};

function RoleButton({ label, value, role, setRole }: RoleButtonProps) {
  const isActive = role === value;
  return (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={
        'flex-1 rounded-full border px-3 py-1 ' +
        (isActive
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500')
      }
    >
      {label}
    </button>
  );
}

type LanguageToggleProps = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

function LanguageToggle({ lang, setLang }: LanguageToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 text-[11px]">
      <LangPill label="EN" value="en" lang={lang} setLang={setLang} />
      <LangPill label="ES" value="es" lang={lang} setLang={setLang} />
    </div>
  );
}

type LangPillProps = {
  label: string;
  value: Lang;
  lang: Lang;
  setLang: (l: Lang) => void;
};

function LangPill({ label, value, lang, setLang }: LangPillProps) {
  const isActive = lang === value;
  return (
    <button
      type="button"
      onClick={() => setLang(value)}
      className={
        'px-2 py-1 rounded-full ' +
        (isActive
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-transparent text-slate-400 hover:text-slate-100')
      }
    >
      {label}
    </button>
  );
}

// 📝 Simple translation dictionary
const translations: Record<Lang, {
  heading: string;
  subheading: string;
  emailLabel: string;
  emailPlaceholder: string;
  roleLabel: string;
  roles: { buyer: string; distributor: string; founder: string };
  continueButton: Record<Role, string>;
  footer: string;
}> = {
  en: {
    heading: 'Sign in to your portal',
    subheading:
      "This is a demo login screen. In the real app, you'll authenticate with email and be routed to the correct portal based on your role.",
    emailLabel: 'Email (demo only)',
    emailPlaceholder: 'you@example.com',
    roleLabel: 'Choose your role',
    roles: {
      buyer: 'Buyer',
      distributor: 'Distributor',
      founder: 'Founder',
    },
    continueButton: {
      buyer: 'Continue to buyer portal',
      distributor: 'Continue to distributor portal',
      founder: 'Continue to founder portal',
    },
    footer:
      'Later, this page will be replaced by real authentication (NextAuth or custom). For now, it just routes you to /buyer, /distributor, or /founder based on the role you select.',
  },
  es: {
    heading: 'Inicia sesión en tu portal',
    subheading:
      'Esta es una pantalla de inicio de sesión de demostración. En la aplicación real, iniciarás sesión con tu correo y serás dirigido al portal correcto según tu rol.',
    emailLabel: 'Correo electrónico (solo demo)',
    emailPlaceholder: 'tú@ejemplo.com',
    roleLabel: 'Elige tu rol',
    roles: {
      buyer: 'Comprador',
      distributor: 'Distribuidor',
      founder: 'Fundador',
    },
    continueButton: {
      buyer: 'Ir al portal de comprador',
      distributor: 'Ir al portal de distribuidor',
      founder: 'Ir al portal de fundador',
    },
    footer:
      'Más adelante, esta página será reemplazada por autenticación real (NextAuth o personalizada). Por ahora, solo te lleva a /buyer, /distributor o /founder según el rol que elijas.',
  },
};
