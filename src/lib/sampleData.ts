import { firestoreApi } from './FirestoreApi';

export const addSampleUpdates = async () => {
  const updates = [
    {
      title: 'إطلاق موقع الويب الجديد',
      description: 'تم إطلاق موقع الويب الرسمي لمنصة الاختبارات الذكية مع واجهة حديثة ومتجاوبة',
      date: new Date('2025-10-24'),
      type: 'feature'
    },
    {
      title: 'تحسين نظام الإشعارات',
      description: 'تم تحسين نظام الإشعارات ليكون أسرع وأكثر موثوقية مع دعم الإشعارات الفورية',
      date: new Date('2025-10-23'),
      type: 'improvement'
    },
    {
      title: 'إضافة أنواع أسئلة متقدمة',
      description: 'تم إضافة دعم لأسئلة الاختيار المتعدد مع الصور والفيديو',
      date: new Date('2025-10-22'),
      type: 'feature'
    },
    {
      title: 'تحسين واجهة المستخدم',
      description: 'تم تحديث التصميم العام للتطبيق ليكون أكثر سهولة وجمالاً مع دعم الوضع المظلم',
      date: new Date('2025-10-21'),
      type: 'improvement'
    },
    {
      title: 'إصلاح مشاكل الأداء',
      description: 'تم حل المشاكل المتعلقة بسرعة التطبيق وتحسين استهلاك الذاكرة',
      date: new Date('2025-10-20'),
      type: 'fix'
    }
  ];

  try {
    for (const update of updates) {
      await firestoreApi.createDocument('updates', update);
      console.log('تم إضافة التحديث:', update.title);
    }
    console.log('تم إضافة جميع التحديثات بنجاح');
  } catch (error) {
    console.error('خطأ في إضافة التحديثات:', error);
  }
};
