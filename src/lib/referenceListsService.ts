import { firestoreApi } from './FirestoreApi';

export class ReferenceListsService {
  private static _instance: ReferenceListsService;

  private _narratorsCache: string[] | null = null;
  private _booksCache: string[] | null = null;
  private _attributionsCache: string[] | null = null;

  private constructor() {}

  public static get instance(): ReferenceListsService {
    if (!ReferenceListsService._instance) {
      ReferenceListsService._instance = new ReferenceListsService();
    }
    return ReferenceListsService._instance;
  }

  /// جلب قائمة الرواة من Firebase (مُرتبة أبجدياً)
  async getNarrators(forceRefresh: boolean = false): Promise<string[]> {
    if (this._narratorsCache != null && !forceRefresh) {
      return this._narratorsCache;
    }

    try {
      const narratorsRef = firestoreApi.getSubCollectionRef(
        'reference_data',
        'narrators',
        'narrators'
      );
      
      const docs = await firestoreApi.getDocuments(narratorsRef);
      
      const narrators = docs
        .map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return (data['name'] as string) || '';
        })
        .filter((name) => name !== '');

      // ترتيب أبجدي
      narrators.sort((a, b) => a.localeCompare(b, 'ar'));

      this._narratorsCache = narrators;
      return narrators;
    } catch (error) {
      console.error('Error fetching narrators:', error);
      return this._narratorsCache || [];
    }
  }

  /// جلب قائمة الكتب من Firebase (مُرتبة أبجدياً)
  async getBooks(forceRefresh: boolean = false): Promise<string[]> {
    if (this._booksCache != null && !forceRefresh) {
      return this._booksCache;
    }

    try {
      const booksRef = firestoreApi.getSubCollectionRef(
        'reference_data',
        'books',
        'books'
      );
      
      const docs = await firestoreApi.getDocuments(booksRef);
      
      const books = docs
        .map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return (data['name'] as string) || '';
        })
        .filter((name) => name !== '');

      // ترتيب أبجدي
      books.sort((a, b) => a.localeCompare(b, 'ar'));

      this._booksCache = books;
      return books;
    } catch (error) {
      console.error('Error fetching books:', error);
      return this._booksCache || [];
    }
  }

  /// جلب قائمة المخرجين من Firebase (مُرتبة أبجدياً)
  async getAttributions(forceRefresh: boolean = false): Promise<string[]> {
    if (this._attributionsCache != null && !forceRefresh) {
      return this._attributionsCache;
    }

    try {
      const attributionsRef = firestoreApi.getSubCollectionRef(
        'reference_data',
        'attributions',
        'attributions'
      );
      
      const docs = await firestoreApi.getDocuments(attributionsRef);
      
      const attributions = docs
        .map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return (data['name'] as string) || '';
        })
        .filter((name) => name !== '');

      // ترتيب أبجدي
      attributions.sort((a, b) => a.localeCompare(b, 'ar'));

      this._attributionsCache = attributions;
      return attributions;
    } catch (error) {
      console.error('Error fetching attributions:', error);
      return this._attributionsCache || [];
    }
  }

  /// تحديث جميع القوائم من Firebase
  async refreshAllLists(): Promise<void> {
    await Promise.all([
      this.getNarrators(true),
      this.getBooks(true),
      this.getAttributions(true),
    ]);
  }

  /// مسح الـ cache (للاستخدام عند الإضافة/التعديل/الحذف)
  clearCache(): void {
    this._narratorsCache = null;
    this._booksCache = null;
    this._attributionsCache = null;
  }

  /// مسح cache قائمة معينة
  clearListCache(listType: string): void {
    switch (listType) {
      case 'narrators':
        this._narratorsCache = null;
        break;
      case 'books':
        this._booksCache = null;
        break;
      case 'attributions':
        this._attributionsCache = null;
        break;
    }
  }
}


