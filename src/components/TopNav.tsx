'use client';

import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const tabs = [
  { href: '/', label: 'الرئيسية' },
  { href: '/groups/overview', label: 'المجموعات' },
  { href: '/questions', label: 'الأسئلة' },
  { href: '/dashboard', label: 'التقارير' },
  { href: '/apps-management', label: 'التطبيقات' },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const normalizedPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const hideTabs = normalizedPath === '/' || normalizedPath === '/login';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.replace(/\/$/, ''));
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="الوحيين" width={28} height={28} className="rounded" />
              <span className="hidden sm:inline text-sm font-bold text-gray-900">منصة الوحيين</span>
            </Link>
          </div>

          {/* Center: Tabs */}
          {!hideTabs && (
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(t.href)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right: User */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/#download')}
              className="hidden sm:inline-flex btn-primary px-3 py-2"
            >
              تحميل التطبيق
            </button>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpenMenu((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100"
                  aria-haspopup="menu"
                  aria-expanded={openMenu}
                >
                  {user.photoURL ? (
                    <Image src={user.photoURL} alt={user.displayName} width={28} height={28} className="rounded-full border" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                      {user.displayName?.charAt(0) || 'م'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-semibold text-gray-900">{user.displayName}</span>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${openMenu ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"/></svg>
                </button>
                {openMenu && (
                  <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName}</p>
                      {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                    </div>
                    <button
                      onClick={() => { setOpenMenu(false); router.push('/home'); }}
                      className="w-full text-right px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-gray-700"
                    >
                      ملفي الشخصي
                    </button>
                    <button
                      onClick={() => { setOpenMenu(false); router.push('/settings'); }}
                      className="w-full text-right px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-gray-700"
                    >
                      الإعدادات
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={() => { setOpenMenu(false); logout(); }}
                      className="w-full text-right px-3 py-2 rounded-lg text-sm hover:bg-red-50 text-red-600"
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className="btn-success px-3 py-2">تسجيل الدخول</button>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        {!hideTabs && (
          <div className="md:hidden flex items-center gap-2 py-2 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(t.href)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 bg-gray-50'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}


