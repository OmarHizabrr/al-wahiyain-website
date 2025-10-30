'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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

          {/* Right: User */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/#download')}
              className="hidden sm:inline-flex btn-primary px-3 py-2"
            >
              تحميل التطبيق
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt={user.displayName} width={28} height={28} className="rounded-full border" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    {user.displayName?.charAt(0) || 'م'}
                  </div>
                )}
                <button onClick={logout} className="btn-ghost px-3 py-2">خروج</button>
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className="btn-success px-3 py-2">تسجيل الدخول</button>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
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
      </div>
    </header>
  );
}


