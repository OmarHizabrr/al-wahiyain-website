import { firestoreApi } from './FirestoreApi';

export const addAppConfig = async () => {
  const configData = {
    downloadUrl: 'https://drive.google.com/file/d/1ajb9ziS_VpQPmiUa4SNQHyWFNqMpxKIF/view?usp=sharing',
    lastUpdated: new Date().toISOString(),
    appName: 'منصة إختبارات الوحيين',
    version: '1.0.0',
    description: 'تطبيق إختبارات الوحيين للأسئلة والاختبارات'
  };

  try {
    // إنشاء مستند جديد في مجموعة app_config
    const configId = await firestoreApi.createDocument('app_config', configData);
    console.log('تم إضافة تكوين التطبيق بنجاح:', configId);
    return configId;
  } catch (error) {
    console.error('خطأ في إضافة تكوين التطبيق:', error);
    throw error;
  }
};

export const updateDownloadUrl = async (newUrl: string) => {
  try {
    // جلب أول مستند في مجموعة app_config
    const configRef = firestoreApi.getCollection('app_config');
    const docs = await firestoreApi.getDocuments(configRef, undefined, undefined, 1);
    
    if (docs.length > 0) {
      const docRef = firestoreApi.getDocument('app_config', docs[0].id);
      await firestoreApi.updateData(docRef, {
        downloadUrl: newUrl,
        lastUpdated: new Date().toISOString()
      });
      console.log('تم تحديث رابط التحميل بنجاح');
    } else {
      // إنشاء مستند جديد إذا لم يوجد
      await addAppConfig();
    }
  } catch (error) {
    console.error('خطأ في تحديث رابط التحميل:', error);
    throw error;
  }
};

export const getAppConfig = async () => {
  try {
    const configRef = firestoreApi.getCollection('app_config');
    const docs = await firestoreApi.getDocuments(configRef, undefined, undefined, 1);
    
    if (docs.length > 0) {
      return {
        id: docs[0].id,
        ...docs[0].data()
      };
    }
    return null;
  } catch (error) {
    console.error('خطأ في جلب تكوين التطبيق:', error);
    return null;
  }
};
