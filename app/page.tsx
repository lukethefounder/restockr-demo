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

  const t = translations[lang];

  const handleContinue = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      alert(
        lang === 'en'
          ? 'Please enter your email (demo only).'
          : 'Por favor ingresa tu correo (solo demo).'
      );
      return;
    }

    const lower = trimmed.toLowerCase();

    // Map demo emails to roles.
    let userRole: Role | null = null;

    if (lower === 'buyer1@demo.com' || lower === 'buyer2@demo.com') {
      userRole = 'buyer';
    } else if (lower === 'dist@demo.com') {
      userRole = 'distributor';
    } else if (lower === 'founder@demo.com') {
      userRole = 'founder';
    }

    if (!userRole) {
      alert(
        lang === 'en'
          ? 'Unknown demo email. Use buyer1@demo.com, buyer2@demo.com, dist@demo.com, or founder@demo.com.'
          : 'Correo demo desconocido. Usa buyer1@demo.com, buyer2@demo.com, dist@demo.com o founder@demo.com.'
      );
      return;
    }

    // Optionally, we can warn if the selected pill doesn't match the detected role.
    if (userRole !== role) {
      // Just update the role pill to reflect actual role.
      setRole(userRole);
    }

    // Route based on mapped role
    if (userRole === 'buyer') {
      router.push('/buyer');
    } else if (userRole === 'distributor') {
      router.push('/distributor');
    } else {
      router.push('/founder');
    }
  };

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

// Simple translation dictionary
const translations: Record<
  Lang,
  {
    heading: string;
    subheading: string;
    emailLabel: string;
    emailPlaceholder: string;
    roleLabel: string;
    roles: { buyer: string; distributor: string; founder: string };
    continueButton: Record<Role, string>;
    footer: string;
  }
> = {
  en: {
    heading: 'Sign in to your portal',
    subheading:
      "This is a demo login screen. Use one of the demo emails and you'll be routed to the correct portal.",
    emailLabel: 'Email (demo only)',
    emailPlaceholder: 'buyer1@demo.com, buyer2@demo.com, dist@demo.com, founder@demo.com',
    roleLabel: 'Choose your role (for preview)',
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
      'This is a demo-only login. Your role is determined by the demo email you use. No real accounts or passwords are required.',
  },
  es: {
    heading: 'Inicia sesión en tu portal',
    subheading:
      'Esta es una pantalla de inicio de sesión de demostración. Usa uno de los correos demo y serás dirigido al portal correcto.',
    emailLabel: 'Correo electrónico (solo demo)',
    emailPlaceholder: 'buyer1@demo.com, buyer2@demo.com, dist@demo.com, founder@demo.com',
    roleLabel: 'Elige tu rol (para vista previa)',
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
      'Este inicio de sesión es solo demo. Tu rol se determina por el correo demo que uses. No se necesitan cuentas reales ni contraseñas.',
  },
};
