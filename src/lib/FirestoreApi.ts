import {
  collection,
  CollectionReference,
  deleteDoc,
  doc,
  DocumentReference,
  DocumentSnapshot,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * FirestoreApi
 * - جميع عمليات الكتابة تمر عبر setData/updateData حصراً.
 * - لا توجد try/catch داخل الدوال (الأخطاء تذهب للمستدعي).
 * - التعليقات باللغة العربية.
 * - يستخدم المسارات البسيطة المباشرة للوصول للمسارات المحددة
 * - كل وثيقة تحتوي على "data" كوثيقة فرعية
 * - يستخدم المسارات البسيطة المباشرة للوصول للمسارات المحددة
 * - كل وثيقة فرعية لابد ان تكون مثل اسم الوثيقة الرئيسية
 * 
 * المسارات:
 * groups/groupId/
 * members/groupId/members/userId/
 * tests/groupId/tests/testId/
 * test_questions/testId/test_questions/questionId/
 * user_answers/testId/user_answers/userId/
 * user_test_results/testId/user_test_results/userId/
 * student_answers/testId/student_answers/studentId/
 * test_results/testId/test_results/studentId/
 */

export class FirestoreApi {
  // === Singleton ===
  private static _instance: FirestoreApi;
  
  static get Api(): FirestoreApi {
    if (!FirestoreApi._instance) {
      FirestoreApi._instance = new FirestoreApi();
    }
    return FirestoreApi._instance;
  }

  private constructor() {}

  // ==============================
  // دوال مرجعية بسيطة (مثل Firestore الرسمي)
  // ==============================

  /**
   * إنشاء معرف جديد لمجموعة
   */
  getNewId(collectionName: string): string {
    return doc(collection(db, collectionName)).id;
  }

  /**
   * إرجاع مرجع إلى مجموعة رئيسية
   */
  getCollection(collectionName: string): CollectionReference {
    return collection(db, collectionName);
  }

  /**
   * إرجاع مرجع لمستند داخل مجموعة
   */
  getDocument(collectionName: string, documentId: string): DocumentReference {
    return doc(db, collectionName, documentId);
  }

  /**
   * إرجاع مرجع لمجموعة فرعية داخل مستند
   */
  getSubCollection(
    collectionName: string,
    documentId: string,
    subCollectionName: string
  ): CollectionReference {
    return collection(db, collectionName, documentId, subCollectionName);
  }

  /**
   * إرجاع مرجع لمستند داخل مجموعة فرعية
   */
  getSubDocument(
    collectionName: string,
    documentId: string,
    subCollectionName: string,
    subDocumentId: string
  ): DocumentReference {
    return doc(db, collectionName, documentId, subCollectionName, subDocumentId);
  }

  // ==============================
  // دوال CRUD عامة تعمل على DocumentReference/CollectionReference
  // ==============================

  /**
   * إنشاء أو تعيين بيانات مستند (يدعم الدمج) — النقطة المركزية لكل عمليات الكتابة
   */
  async setData(
    docRef: DocumentReference,
    data: Record<string, unknown>,
    merge: boolean = true
  ): Promise<void> {
    // يمكنك إضافة معلومات المستخدم هنا إذا كان لديك نظام مصادقة
    // const userData = getUserData();
    // data.createdByName = userData.displayName || '';
    // data.createdByImageUrl = userData.photoURL || '';
    // data.createdBy = userData.uid || '';

    // يمكنك تفعيل الطوابع الزمنية إن رغبت
    // data.createdAt = data.createdAt || new Date().toISOString();
    // data.updatedAt = new Date().toISOString();

    await setDoc(docRef, data, { merge });
  }

  /**
   * تحديث بيانات مستند — النقطة المركزية لكل عمليات التحديث
   */
  async updateData(
    docRef: DocumentReference,
    data: Record<string, unknown>
  ): Promise<void> {
    // يمكنك إضافة معلومات المستخدم هنا إذا كان لديك نظام مصادقة
    // const userData = getUserData();
    // data.createdByName = userData.displayName || '';
    // data.createdByImageUrl = userData.photoURL || '';
    // data.createdBy = userData.uid || '';

    // يمكنك تفعيل الطابع الزمني للتحديث
    // data.updatedAt = new Date().toISOString();

    await updateDoc(docRef, data);
  }

  /**
   * جلب بيانات مستند
   */
  async getData(docRef: DocumentReference): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as Record<string, unknown> : null;
  }

  /**
   * حذف مستند
   */
  async deleteData(docRef: DocumentReference): Promise<void> {
    await deleteDoc(docRef);
  }

  // ==============================
  // دوال للعمل مع مجموعات
  // ==============================

  /**
   * جلب مستندات من مجموعة مع فلترة محددة وحد
   */
  async getDocuments(
    colRef: CollectionReference,
    whereField?: string,
    isEqualTo?: string | number | boolean,
    limitCount?: number
  ): Promise<DocumentSnapshot[]> {
    let queryRef: Query = colRef;
    
    if (whereField) {
      queryRef = query(queryRef, where(whereField, '==', isEqualTo));
    }
    
    if (limitCount) {
      queryRef = query(queryRef, limit(limitCount));
    }
    
    const snapshot = await getDocs(queryRef);
    return snapshot.docs;
  }

  /**
   * تدفق مباشر للمجموعة مع دعم فلتر
   */
  collectionStream(
    colRef: CollectionReference,
    whereField?: string,
    isEqualTo?: string | number | boolean,
    limitCount?: number,
    orderByField?: string,
    descending: boolean = false
  ) {
    let queryRef: Query = colRef;
    
    if (whereField) {
      queryRef = query(queryRef, where(whereField, '==', isEqualTo));
    }
    
    if (orderByField) {
      queryRef = query(queryRef, orderBy(orderByField, descending ? 'desc' : 'asc'));
    }
    
    if (limitCount) {
      queryRef = query(queryRef, limit(limitCount));
    }
    
    return onSnapshot(queryRef, (snapshot) => snapshot);
  }

  /**
   * جلب جميع المستندات من مجموعة (اختياري بحد)
   */
  async getAllDocuments(
    colRef: CollectionReference,
    limitCount?: number
  ): Promise<DocumentSnapshot[]> {
    const queryRef = limitCount ? query(colRef, limit(limitCount)) : colRef;
    const snapshot = await getDocs(queryRef);
    return snapshot.docs;
  }

  // ==============================
  // دوال متداخلة (parent-child) عامة
  // ==============================

  /**
   * إنشاء/تعيين مستند داخل مجموعة فرعية عبر setData
   */
  async setNested(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    documentId: string,
    data: Record<string, unknown>,
    merge: boolean = true
  ): Promise<void> {
    const docRef = this.getSubDocument(
      parentCollection,
      parentId,
      subCollection,
      documentId
    );
    await this.setData(docRef, data, merge);
  }

  /**
   * تحديث مستند داخل مجموعة فرعية عبر updateData
   */
  async updateNested(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    documentId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const docRef = this.getSubDocument(
      parentCollection,
      parentId,
      subCollection,
      documentId
    );
    await this.updateData(docRef, data);
  }

  /**
   * جلب مستند من مجموعة فرعية
   */
  async getNested(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    documentId: string
  ): Promise<Record<string, unknown> | null> {
    const docRef = this.getSubDocument(
      parentCollection,
      parentId,
      subCollection,
      documentId
    );
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as Record<string, unknown> : null;
  }

  /**
   * حذف مستند من مجموعة فرعية
   */
  async deleteNested(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    documentId: string
  ): Promise<void> {
    const docRef = this.getSubDocument(
      parentCollection,
      parentId,
      subCollection,
      documentId
    );
    await this.deleteData(docRef);
  }

  /**
   * الحصول على مرجع لمجموعة فرعية (للاستخدام في القوائم)
   */
  getSubCollectionRef(
    parentCollection: string,
    parentId: string,
    subCollection: string
  ): CollectionReference {
    return this.getSubCollection(
      parentCollection,
      parentId,
      subCollection
    );
  }

  // ==============================
  // دوال مساعدة إضافية
  // ==============================

  /**
   * إنشاء مستند جديد مع معرف تلقائي
   */
  async createDocument(
    collectionName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const docRef = doc(this.getCollection(collectionName));
    await this.setData(docRef, data);
    return docRef.id;
  }

  /**
   * إنشاء مستند فرعي جديد مع معرف تلقائي
   */
  async createSubDocument(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const docRef = doc(this.getSubCollection(parentCollection, parentId, subCollection));
    await this.setData(docRef, data);
    return docRef.id;
  }

  /**
   * جلب جميع المستندات الفرعية من مجموعة فرعية
   */
  async getSubDocuments(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    whereField?: string,
    isEqualTo?: string | number | boolean,
    limitCount?: number
  ): Promise<DocumentSnapshot[]> {
    const subColRef = this.getSubCollection(parentCollection, parentId, subCollection);
    return await this.getDocuments(subColRef, whereField, isEqualTo, limitCount);
  }

  /**
   * تدفق مباشر للمجموعة الفرعية
   */
  subCollectionStream(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    whereField?: string,
    isEqualTo?: string | number | boolean,
    limitCount?: number,
    orderByField?: string,
    descending: boolean = false
  ) {
    const subColRef = this.getSubCollection(parentCollection, parentId, subCollection);
    return this.collectionStream(
      subColRef,
      whereField,
      isEqualTo,
      limitCount,
      orderByField,
      descending
    );
  }

  /**
   * الحصول على عدد المستندات في مجموعة
   */
  async getCount(collectionRef: CollectionReference): Promise<number> {
    try {
      const countSnapshot = await getCountFromServer(collectionRef);
      return countSnapshot.data().count;
    } catch (error) {
      console.error('Error getting count:', error);
      return 0;
    }
  }

  /**
   * جلب جميع اختبارات المجموعة
   * المسار: test/{groupId}/test
   * @param groupId - معرف المجموعة
   * @returns قائمة باختبارات المجموعة
   */
  async getGroupTests(groupId: string): Promise<DocumentSnapshot[]> {
    try {
      const subCollectionRef = this.getSubCollection(
        'test',
        groupId,
        'test'
      );
      return await this.getDocuments(subCollectionRef);
    } catch (error) {
      console.error('Error getting group tests:', error);
      return [];
    }
  }

  /**
   * جلب مجموعات المستخدم من مجموعة Mygroups
   * المسار: Mygroups/{userId}/Mygroups
   * @param userId - معرف المستخدم
   * @returns قائمة بمجموعات المستخدم
   */
  async getMyGroups(userId: string): Promise<DocumentSnapshot[]> {
    try {
      // المسار الصحيح: Mygroups/{userId}/Mygroups
      const subCollectionRef = this.getSubCollection(
        'Mygroups',      // Parent collection
        userId,          // userId as parent document ID
        'Mygroups'       // Sub-collection name (same as parent)
      );
      return await this.getDocuments(subCollectionRef);
    } catch (error) {
      console.error('Error getting my groups:', error);
      return [];
    }
  }
}

// تصدير instance وحيد
export const firestoreApi = FirestoreApi.Api;
