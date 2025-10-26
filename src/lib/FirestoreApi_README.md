# FirestoreApi - دليل الاستخدام

## نظرة عامة

`FirestoreApi` هو كلاس TypeScript للتعامل مع Firebase Firestore بطريقة منظمة ومبسطة. يوفر واجهة موحدة لجميع عمليات CRUD مع دعم للمجموعات الفرعية والتدفقات المباشرة.

## المميزات الرئيسية

- ✅ **Singleton Pattern**: instance وحيد للاستخدام في جميع أنحاء التطبيق
- ✅ **دعم المجموعات الفرعية**: للعمل مع البيانات المتداخلة
- ✅ **عمليات CRUD كاملة**: إنشاء، قراءة، تحديث، حذف
- ✅ **التدفقات المباشرة**: للاستماع للتغييرات في الوقت الفعلي
- ✅ **الفلترة والترتيب**: دعم متقدم للاستعلامات
- ✅ **TypeScript**: دعم كامل لأنواع البيانات

## كيفية الاستخدام

### 1. الاستيراد

```typescript
import { firestoreApi } from "@/lib/FirestoreApi";
```

### 2. العمليات الأساسية

#### إنشاء مستند جديد

```typescript
// إنشاء مستند مع معرف تلقائي
const docId = await firestoreApi.createDocument("users", {
  name: "أحمد محمد",
  email: "ahmed@example.com",
  createdAt: new Date().toISOString(),
});

// إنشاء مستند بمعرف محدد
const docRef = firestoreApi.getDocument("users", "user123");
await firestoreApi.setData(docRef, {
  name: "فاطمة علي",
  email: "fatima@example.com",
});
```

#### قراءة البيانات

```typescript
// جلب مستند واحد
const docRef = firestoreApi.getDocument("users", "user123");
const userData = await firestoreApi.getData(docRef);

// جلب جميع المستندات
const usersRef = firestoreApi.getCollection("users");
const allUsers = await firestoreApi.getAllDocuments(usersRef);

// جلب مستندات مع فلترة
const activeUsers = await firestoreApi.getDocuments(
  usersRef,
  "status",
  "active",
  10 // حد 10 مستندات
);
```

#### تحديث البيانات

```typescript
const docRef = firestoreApi.getDocument("users", "user123");
await firestoreApi.updateData(docRef, {
  lastLogin: new Date().toISOString(),
  status: "online",
});
```

#### حذف البيانات

```typescript
const docRef = firestoreApi.getDocument("users", "user123");
await firestoreApi.deleteData(docRef);
```

### 3. العمل مع المجموعات الفرعية

#### إنشاء مستند فرعي

```typescript
// إنشاء مستند في مجموعة فرعية
await firestoreApi.setNested(
  "groups", // المجموعة الرئيسية
  "group123", // معرف المجموعة
  "members", // المجموعة الفرعية
  "user456", // معرف المستند الفرعي
  {
    role: "admin",
    joinedAt: new Date().toISOString(),
  }
);

// إنشاء مستند فرعي مع معرف تلقائي
const memberId = await firestoreApi.createSubDocument(
  "groups",
  "group123",
  "members",
  {
    role: "member",
    joinedAt: new Date().toISOString(),
  }
);
```

#### قراءة البيانات الفرعية

```typescript
// جلب مستند فرعي
const memberData = await firestoreApi.getNested(
  "groups",
  "group123",
  "members",
  "user456"
);

// جلب جميع المستندات الفرعية
const members = await firestoreApi.getSubDocuments(
  "groups",
  "group123",
  "members"
);
```

### 4. التدفقات المباشرة

```typescript
// الاستماع لتغييرات في مجموعة
const unsubscribe = firestoreApi
  .collectionStream(
    firestoreApi.getCollection("users"),
    "status",
    "online",
    10,
    "lastLogin",
    true // ترتيب تنازلي
  )
  .subscribe((snapshot) => {
    snapshot.docs.forEach((doc) => {
      console.log("مستخدم متصل:", doc.data());
    });
  });

// الاستماع لمجموعة فرعية
const unsubscribe2 = firestoreApi
  .subCollectionStream("groups", "group123", "members", "role", "admin")
  .subscribe((snapshot) => {
    snapshot.docs.forEach((doc) => {
      console.log("مدير:", doc.data());
    });
  });

// إيقاف الاستماع
unsubscribe();
unsubscribe2();
```

### 5. أمثلة عملية

#### إدارة المستخدمين

```typescript
// إنشاء مستخدم جديد
const createUser = async (userData: any) => {
  const userId = await firestoreApi.createDocument("users", {
    ...userData,
    createdAt: new Date().toISOString(),
    status: "active",
  });
  return userId;
};

// تحديث آخر دخول
const updateLastLogin = async (userId: string) => {
  const docRef = firestoreApi.getDocument("users", userId);
  await firestoreApi.updateData(docRef, {
    lastLogin: new Date().toISOString(),
  });
};

// جلب المستخدمين النشطين
const getActiveUsers = async () => {
  const usersRef = firestoreApi.getCollection("users");
  const activeUsers = await firestoreApi.getDocuments(
    usersRef,
    "status",
    "active"
  );
  return activeUsers.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
```

#### إدارة المجموعات

```typescript
// إضافة عضو لمجموعة
const addMemberToGroup = async (
  groupId: string,
  userId: string,
  role: string
) => {
  await firestoreApi.setNested("groups", groupId, "members", userId, {
    role,
    joinedAt: new Date().toISOString(),
  });
};

// جلب أعضاء المجموعة
const getGroupMembers = async (groupId: string) => {
  const members = await firestoreApi.getSubDocuments(
    "groups",
    groupId,
    "members"
  );
  return members.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// حذف عضو من المجموعة
const removeMemberFromGroup = async (groupId: string, userId: string) => {
  await firestoreApi.deleteNested("groups", groupId, "members", userId);
};
```

## المسارات المدعومة

الكود يدعم الهيكل التالي للمسارات:

```
groups/groupId/
members/groupId/members/userId/
tests/groupId/tests/testId/
test_questions/testId/test_questions/questionId/
user_answers/testId/user_answers/userId/
user_test_results/testId/user_test_results/userId/
student_answers/testId/student_answers/studentId/
test_results/testId/test_results/studentId/
```

## معالجة الأخطاء

جميع الدوال ترمي الأخطاء للمستدعي، مما يتيح لك التعامل معها حسب الحاجة:

```typescript
try {
  await firestoreApi.createDocument("users", userData);
  console.log("تم إنشاء المستخدم بنجاح");
} catch (error) {
  console.error("خطأ في إنشاء المستخدم:", error);
  // معالجة الخطأ
}
```

## أفضل الممارسات

1. **استخدم Singleton**: استخدم `firestoreApi` بدلاً من إنشاء instances جديدة
2. **معالجة الأخطاء**: دائماً استخدم try/catch مع العمليات غير المتزامنة
3. **التحقق من البيانات**: تأكد من صحة البيانات قبل الإرسال
4. **إيقاف التدفقات**: دائماً أوقف التدفقات عند عدم الحاجة إليها
5. **استخدام الفهارس**: تأكد من وجود فهارس للاستعلامات المعقدة

## التحديثات المستقبلية

- [ ] دعم المعاملات (Transactions)
- [ ] دعم الاستعلامات المعقدة (Compound Queries)
- [ ] تحسين الأداء مع التخزين المؤقت
- [ ] دعم الملفات والصور
