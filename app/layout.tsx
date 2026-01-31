import './globals.css';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Restockr Demo',
  description: 'Two-restaurant Restockr demo with Buyer, Distributor and Founder portals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        <div className="min-h-screen flex flex-col">
          {/* Global Header */}
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-400 via-sky-500 to-slate-900 shadow-md shadow-emerald-500/40" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight">
                    Restockr
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Two-restaurant demo
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400">
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                  Demo mode · Data is sample only
                </span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Global Footer */}
          <footer className="border-t border-slate-800 bg-slate-900/80">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[10px] text-slate-500">
                Restockr demo · Buyer · Distributor · Founder · Mintsy · Bud · Voice ordering
              </p>
              <p className="text-[10px] text-slate-600">
                For internal testing and concept validation only.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
