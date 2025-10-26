import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata } from "next";
import "./globals.css";

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'مؤسسة الوحيين الخيرية',
  alternateName: 'الوحيين',
  url: 'https://al-wahiyain-website.vercel.app',
  logo: 'https://al-wahiyain-website.vercel.app/logo.png',
  description: 'مؤسسة الوحيين الخيرية اليمن - منصة شاملة لإدارة المجموعات والاختبارات التعليمية',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'Yemen',
  },
};

export const metadata: Metadata = {
  title: "مؤسسة الوحيين الخيرية - منصة إدارة المجموعات والاختبارات",
  description: "مؤسسة الوحيين الخيرية اليمن - منصة شاملة لإدارة المجموعات والاختبارات التعليمية مع نظام إشعارات متقدم. تعلم وتطوير في بيئة إلكترونية احترافية.",
  keywords: "مؤسسة الوحيين، الوحيين، مؤسسة الوحيين الخيرية، مؤسسة الوحيين اليمن، الوحيين الخيرية، اختبارات، اختبار، تعليم، منصة تعليمية",
  authors: [{ name: "مؤسسة الوحيين الخيرية" }],
  creator: "مؤسسة الوحيين الخيرية",
  publisher: "مؤسسة الوحيين الخيرية",
  robots: "index, follow",
  openGraph: {
    title: "مؤسسة الوحيين الخيرية - منصة إدارة المجموعات والاختبارات",
    description: "مؤسسة الوحيين الخيرية اليمن - منصة شاملة لإدارة المجموعات والاختبارات التعليمية",
    type: "website",
    locale: "ar_YE",
    siteName: "مؤسسة الوحيين الخيرية",
  },
  twitter: {
    card: "summary_large_image",
    title: "مؤسسة الوحيين الخيرية",
    description: "منصة شاملة لإدارة المجموعات والاختبارات التعليمية",
  },
  alternates: {
    canonical: "https://al-wahiyain-website.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
