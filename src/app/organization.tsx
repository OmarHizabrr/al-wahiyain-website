export default function OrganizationSchema() {
  return {
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
      addressRegion: 'San\'a',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'الإدارة',
      areaServed: 'YE',
      availableLanguage: ['ar'],
    },
    sameAs: [
      // أضف روابط وسائل التواصل الاجتماعي هنا
    ],
  };
}
