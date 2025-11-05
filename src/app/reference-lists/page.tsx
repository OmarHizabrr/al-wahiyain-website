'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import { ReferenceListsService } from '@/lib/referenceListsService';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Timestamp } from 'firebase/firestore';

interface ReferenceItem {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: Timestamp | Date | string;
  createdByName?: string;
  createdByImageUrl?: string;
  createdBy?: string;
}

type ListType = 'narrators' | 'books' | 'attributions';

export default function ReferenceListsManagementPage() {
  const router = useRouter();
  const { showMessage, showConfirm } = useMessage();
  const [activeTab, setActiveTab] = useState<ListType>('narrators');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [itemsCount, setItemsCount] = useState<Record<ListType, number>>({
    narrators: 0,
    books: 0,
    attributions: 0,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const getCollectionNames = () => {
    switch (activeTab) {
      case 'narrators':
        return { title: 'الرواة', icon: '👤', color: 'purple' };
      case 'books':
        return { title: 'الكتب', icon: '📚', color: 'orange' };
      case 'attributions':
        return { title: 'المخارج', icon: '🔗', color: 'teal' };
    }
  };

  const loadItemsCount = useCallback(async () => {
    try {
      const counts: Record<ListType, number> = {
        narrators: 0,
        books: 0,
        attributions: 0,
      };

      // Load all counts in parallel for better performance
      const countPromises = (['narrators', 'books', 'attributions'] as ListType[]).map(async (listType) => {
        try {
          const collectionRef = firestoreApi.getSubCollectionRef(
            'reference_data',
            listType,
            listType
          );
          
          // Use getDocuments instead of getCount to avoid quota issues
          const docs = await firestoreApi.getDocuments(collectionRef);
          return { listType, count: docs.length };
        } catch (error) {
          console.error(`Error loading count for ${listType}:`, error);
          return { listType, count: 0 };
        }
      });

      const results = await Promise.all(countPromises);
      
      // Update counts object
      results.forEach(({ listType, count }) => {
        counts[listType] = count;
      });

      setItemsCount(counts);
    } catch (error) {
      console.error('Error loading items count:', error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const collectionRef = firestoreApi.getSubCollectionRef(
        'reference_data',
        activeTab,
        activeTab
      );
      
      const docs = await firestoreApi.getDocuments(collectionRef);
      
      const loadedItems = docs
        .map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return {
            id: doc.id,
            name: (data['name'] as string) || '',
            createdAt: data['createdAt'] as string | undefined,
            updatedAt: data['updatedAt'] as Timestamp | Date | string | undefined,
            createdByName: data['createdByName'] as string | undefined,
            createdByImageUrl: data['createdByImageUrl'] as string | undefined,
            createdBy: data['createdBy'] as string | undefined,
          };
        })
        .filter((item) => item.name !== '');

      // Sort alphabetically
      loadedItems.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      setItems(loadedItems);
    } catch (error) {
      console.error('Error loading items:', error);
      showMessage('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, showMessage]);

  useEffect(() => {
    const loadData = async () => {
      await loadItemsCount();
      loadItems();
    };
    loadData();
  }, [loadItems, loadItemsCount]);

  const checkDuplicate = async (name: string, excludeId?: string): Promise<boolean> => {
    const normalizedName = name.trim().toLowerCase();
    
    return items.some((item) => {
      if (excludeId && item.id === excludeId) return false;
      return item.name.trim().toLowerCase() === normalizedName;
    });
  };

  const handleAdd = async () => {
    if (!newItemName.trim()) {
      showMessage('يرجى إدخال اسم', 'warning');
      return;
    }

    // Check for duplicates
    const isDuplicate = await checkDuplicate(newItemName);
    if (isDuplicate) {
      showMessage(`"${newItemName}" موجود بالفعل`, 'warning');
      return;
    }

    try {
      const itemId = firestoreApi.getNewId(activeTab);
      const docRef = firestoreApi.getSubDocument(
        'reference_data',
        activeTab,
        activeTab,
        itemId
      );

      await firestoreApi.setData(docRef, {
        name: newItemName.trim(),
        createdAt: new Date().toISOString(),
      }, true);

      // Clear cache
      ReferenceListsService.instance.clearListCache(activeTab);

      setIsAddModalOpen(false);
      setNewItemName('');
      await Promise.all([loadItemsCount(), loadItems()]);
      showMessage('تمت الإضافة بنجاح', 'success');
    } catch (error) {
      console.error('Error adding item:', error);
      showMessage('حدث خطأ في الإضافة', 'error');
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !newItemName.trim()) {
      return;
    }

    // Check for duplicates
    const isDuplicate = await checkDuplicate(newItemName, editingItem.id);
    if (isDuplicate) {
      showMessage(`"${newItemName}" موجود بالفعل`, 'warning');
      return;
    }

    try {
      const docRef = firestoreApi.getSubDocument(
        'reference_data',
        activeTab,
        activeTab,
        editingItem.id
      );

      await firestoreApi.updateData(docRef, {
        name: newItemName.trim(),
        updatedAt: new Date().toISOString(),
      });

      // Clear cache
      ReferenceListsService.instance.clearListCache(activeTab);

      setIsEditModalOpen(false);
      setEditingItem(null);
      setNewItemName('');
      await Promise.all([loadItemsCount(), loadItems()]);
      showMessage('تم التعديل بنجاح', 'success');
    } catch (error) {
      console.error('Error editing item:', error);
      showMessage('حدث خطأ في التعديل', 'error');
    }
  };

  const handleDelete = async (item: ReferenceItem) => {
    showConfirm(
      `هل أنت متأكد من حذف "${item.name}"؟`,
      async () => {
        try {
          const docRef = firestoreApi.getSubDocument(
            'reference_data',
            activeTab,
            activeTab,
            item.id
          );
          await firestoreApi.deleteData(docRef);
          ReferenceListsService.instance.clearListCache(activeTab);
          await Promise.all([loadItemsCount(), loadItems()]);
          showMessage('تم الحذف بنجاح', 'success');
        } catch (error) {
          console.error('Error deleting item:', error);
          showMessage('حدث خطأ في الحذف', 'error');
        }
      },
      undefined,
      'حذف',
      'إلغاء',
      'danger'
    );
  };

  const openEditModal = (item: ReferenceItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
    setNewItemName('');
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const collectionInfo = getCollectionNames();

  // دالة لتحويل التاريخ إلى هجري وإنجليزي مع الوقت
  const formatDate = (timestamp: Timestamp | Date | string | undefined | null) => {
    if (!timestamp) return null;
    
    let date: Date;
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      // Firestore Timestamp
      date = (timestamp as Timestamp).toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return null;
    }

    // التاريخ الهجري
    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);

    // التاريخ الميلادي بالإنجليزي مع الوقت التفصيلي
    const gregorianDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);

    return { hijri: hijriDate, gregorian: gregorianDate };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="منصة إختبارات الوحيين"
                width={50}
                height={50}
                className="rounded-lg"
              />
              <h1 className="mr-3 text-xl font-bold text-gray-900">
                إدارة القوائم المرجعية
              </h1>
            </div>
            <button
              onClick={() => router.push('/home')}
              className="btn-secondary"
            >
              🏠 العودة
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('narrators')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                activeTab === 'narrators'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👤 الرواة ({itemsCount.narrators})
            </button>
            <button
              onClick={() => setActiveTab('books')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                activeTab === 'books'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📚 الكتب ({itemsCount.books})
            </button>
            <button
              onClick={() => setActiveTab('attributions')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                activeTab === 'attributions'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔗 المخارج ({itemsCount.attributions})
            </button>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder={`ابحث في ${collectionInfo.title}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 input"
            />
            <button
              onClick={() => {
                setNewItemName('');
                setIsAddModalOpen(true);
              }}
              className={`px-6 py-3 bg-${collectionInfo.color}-600 hover:bg-${collectionInfo.color}-700 text-white font-medium rounded-lg transition-colors duration-200`}
            >
              ➕ إضافة
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-lg">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                لا توجد عناصر
              </h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'لا توجد نتائج للبحث'
                  : `اضغط على زر "إضافة" لإضافة ${collectionInfo.title}`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const dateInfo = formatDate(item.updatedAt || item.createdAt);
                return (
                  <div
                    key={item.id}
                    className="p-6 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 space-x-reverse flex-1">
                        <div className={`p-3 rounded-full bg-${collectionInfo.color}-100`}>
                          <span className="text-2xl">{collectionInfo.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.name}
                            </h3>
                            {item.createdByName && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {item.createdByImageUrl && (
                                  <Image
                                    src={item.createdByImageUrl}
                                    alt={item.createdByName}
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                  />
                                )}
                                <span>منشئ: {item.createdByName}</span>
                                {item.createdBy && (
                                  <span className="text-gray-400">({item.createdBy})</span>
                                )}
                              </div>
                            )}
                          </div>
                          {dateInfo && (
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <span className="font-semibold">هجري:</span> {dateInfo.hijri}
                              </p>
                              <p>
                                <span className="font-semibold">Gregorian:</span> {dateInfo.gregorian}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="dialog-overlay">
          <div className="dialog-panel max-w-md mx-4 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              إضافة {collectionInfo.title}
            </h2>
            <input
              type="text"
              placeholder="أدخل الاسم"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input mb-6"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewItemName('');
                }}
                className="btn-ghost flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={handleAdd}
                className={`flex-1 btn-primary`}
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="dialog-overlay">
          <div className="dialog-panel max-w-md mx-4 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              تعديل {collectionInfo.title}
            </h2>
            <input
              type="text"
              placeholder="أدخل الاسم"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input mb-6"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={closeEditModal}
                className="btn-ghost flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={handleEdit}
                className={`flex-1 btn-primary`}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
