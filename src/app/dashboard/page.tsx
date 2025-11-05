'use client';

import { firestoreApi } from '@/lib/FirestoreApi';
import { useMessage } from '@/lib/messageService';
import { PrintService } from '@/lib/printService';
import { ReferenceListsService } from '@/lib/referenceListsService';
import { TestTemplates } from '@/lib/testTemplates';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  testCount: number;
  completedTests: number;
  averageScore: number;
  passRate: number;
  tests: TestDetails[];
  members: MemberDetails[];
  students: StudentDetails[];
  createdBy: string;
  createdByName: string;
  createdByImageUrl: string;
}

interface TestDetails {
  id: string;
  title: string;
  description: string;
  studentCount: number;
  completedCount: number;
  averageScore: number;
  passRate: number;
  createdBy: string;
  createdByName: string;
  createdByImageUrl: string;
}

interface MemberDetails {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdByImageUrl: string;
}

interface StudentDetails {
  id: string;
  name: string;
  groupId: string;
  totalTestsTaken: number;
  averageScore: number;
  lastActivity: string;
  status: string;
  createdAt: string;
}

interface StudentTestDetails {
  testId: string;
  testTitle: string;
  attempts: number;
  bestScore: number;
  lastAttemptDate: string;
  averageScore: number;
  attemptDetails?: AttemptDetail[];
}

interface AttemptDetail {
  attemptId: string;
  percentage: number;
  isPassed: boolean;
  attemptDate: string;
  duration?: number;
  timeSpent?: number;
}

interface DashboardStats {
  // الإجماليات
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalNarrators: number;
  totalBooks: number;
  totalAttributions: number;
  totalQuestions: number;
  totalTests: number;
  completedTests: number;
  totalGroups: number;
  averageScore: number;
  passRate: number;
  
  // التفاصيل
  questionsByTemplate: Record<string, number>;
  groupsDetails: GroupDetails[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { showMessage } = useMessage();
  const referenceService = ReferenceListsService.instance;
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalNarrators: 0,
    totalBooks: 0,
    totalAttributions: 0,
    totalQuestions: 0,
    totalTests: 0,
    completedTests: 0,
    totalGroups: 0,
    averageScore: 0,
    passRate: 0,
    questionsByTemplate: {},
    groupsDetails: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [studentAttempts, setStudentAttempts] = useState<Record<string, StudentTestDetails[]>>({});

  useEffect(() => {
    loadAllStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleMember = (memberId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  const toggleStudent = async (studentId: string, groupId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
      
      // إذا لم يتم تحميل المحاولات بعد، قم بتحميلها
      if (!studentAttempts[studentId]) {
        await loadStudentAttempts(studentId, groupId);
      }
    }
    setExpandedStudents(newExpanded);
  };

  const loadStudentAttempts = async (studentId: string, groupId: string) => {
    try {
      // جلب محاولات الطالب من student_test_attempts
      const attemptsRef = firestoreApi.getSubCollectionRef(
        'student_test_attempts',
        groupId,
        'student_test_attempts'
      );
      const allAttempts = await firestoreApi.getDocuments(attemptsRef);
      
      // فلترة محاولات الطالب
      const studentAttemptsData = allAttempts.filter(doc => {
        const attemptData = doc.data() as Record<string, unknown>;
        return attemptData.studentId === studentId;
      });
      
      // تجميع المحاولات حسب الاختبار
      const testsMap = new Map<string, { attempts: typeof studentAttemptsData; testTitle: string }>();
      
      for (const attempt of studentAttemptsData) {
        const attemptData = attempt.data() as Record<string, unknown>;
        const testId = attemptData.testId as string || '';
        const testTitle = attemptData.testTitle as string || 'اختبار بدون عنوان';
        
        if (!testsMap.has(testId)) {
          testsMap.set(testId, { attempts: [], testTitle });
        }
        testsMap.get(testId)!.attempts.push(attempt);
      }
      
      // تحويل إلى StudentTestDetails
      const testDetails: StudentTestDetails[] = [];
      
      for (const [testId, data] of testsMap.entries()) {
        let totalScore = 0;
        let bestScore = 0;
        let lastDate = '';
        
        for (const attempt of data.attempts) {
          const attemptData = attempt.data() as Record<string, unknown>;
          const percentage = Number(attemptData.percentage) || 0;
          totalScore += percentage;
          
          if (percentage > bestScore) {
            bestScore = percentage;
          }
          
          const date = (attemptData.attemptDate as string) || 
                       (attemptData.createdAt as string) || 
                       (attemptData.submittedAt as string) || '';
          if (date > lastDate) {
            lastDate = date;
          }
        }
        
        const avgScore = data.attempts.length > 0 ? totalScore / data.attempts.length : 0;
        
        testDetails.push({
          testId,
          testTitle: data.testTitle,
          attempts: data.attempts.length,
          bestScore,
          lastAttemptDate: lastDate,
          averageScore: avgScore,
        });
      }
      
      setStudentAttempts(prev => ({ ...prev, [studentId]: testDetails }));
    } catch (error) {
      console.error('Error loading student attempts:', error);
    }
  };


  const loadAllStats = async () => {
    setIsLoading(true);
    
    try {
      const [
        usersStats,
        narratorsCount,
        booksCount,
        attributionsCount,
        questionsStats,
        groupsDetails,
      ] = await Promise.all([
        loadUsersStats(),
        loadNarratorsCount(),
        loadBooksCount(),
        loadAttributionsCount(),
        loadQuestionsStats(),
        loadGroupsDetails(),
      ]);

      // حساب الإجماليات
      let totalTests = 0;
      let completedTests = 0;
      let totalScores = 0;
      let totalStudents = 0;
      let totalPassed = 0;

      // حساب المعدلات من جميع محاولات الطلاب
      for (const group of groupsDetails) {
        totalTests += group.testCount;
        completedTests += group.completedTests;
        
        // حساب المعدلات من جميع الاختبارات في المجموعة
        for (const test of group.tests) {
          if (test.completedCount > 0 && test.averageScore > 0) {
            // إضافة إجمالي النقاط والطلاب
            totalScores += test.averageScore * test.completedCount;
            totalStudents += test.completedCount;
            // حساب عدد الناجحين
            totalPassed += Math.floor((test.passRate / 100) * test.completedCount);
          }
        }
      }

      const averageScore = totalStudents > 0 ? totalScores / totalStudents : 0;
      const passRate = totalStudents > 0 ? (totalPassed / totalStudents) * 100 : 0;

      setStats({
        ...usersStats,
        totalNarrators: narratorsCount,
        totalBooks: booksCount,
        totalAttributions: attributionsCount,
        totalQuestions: questionsStats.total,
        questionsByTemplate: questionsStats.byTemplate,
        totalTests,
        completedTests,
        totalGroups: groupsDetails.length,
        averageScore,
        passRate,
        groupsDetails,
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      showMessage('حدث خطأ في تحميل الإحصائيات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintDashboard = () => {
    PrintService.printDashboard(stats);
  };

  const handlePrintGroup = (group: GroupDetails) => {
    PrintService.printGroupReport(group);
  };

  const loadUsersStats = async () => {
    try {
      const usersRef = firestoreApi.getCollection('users');
      const users = await firestoreApi.getDocuments(usersRef);
      
      let activeCount = 0;
      let inactiveCount = 0;
      
      for (const user of users) {
        const data = user.data() as Record<string, unknown>;
        if (data.isActive) {
          activeCount++;
        } else {
          inactiveCount++;
        }
      }
      
      return {
        totalUsers: users.length,
        activeUsers: activeCount,
        inactiveUsers: inactiveCount,
      };
    } catch (error) {
      console.error('Error loading users stats:', error);
      return { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 };
    }
  };

  const loadNarratorsCount = async () => {
    try {
      const narrators = await referenceService.getNarrators();
      return narrators.length;
    } catch (error) {
      console.error('Error loading narrators:', error);
      return 0;
    }
  };

  const loadBooksCount = async () => {
    try {
      const books = await referenceService.getBooks();
      return books.length;
    } catch (error) {
      console.error('Error loading books:', error);
      return 0;
    }
  };

  const loadAttributionsCount = async () => {
    try {
      const attributions = await referenceService.getAttributions();
      return attributions.length;
    } catch (error) {
      console.error('Error loading attributions:', error);
      return 0;
    }
  };

  const loadQuestionsStats = async () => {
    try {
      const templates = TestTemplates.getAvailableCategories();
      const questionsByTemplate: Record<string, number> = {};
      let totalCount = 0;

      for (const templateId of templates) {
        const questionsRef = firestoreApi.getSubCollectionRef(
          'questions',
          templateId,
          'questions'
        );
        const questions = await firestoreApi.getDocuments(questionsRef);
        questionsByTemplate[templateId] = questions.length;
        totalCount += questions.length;
      }

      return { total: totalCount, byTemplate: questionsByTemplate };
    } catch (error) {
      console.error('Error loading questions stats:', error);
      return { total: 0, byTemplate: {} };
    }
  };

  const loadGroupsDetails = async (): Promise<GroupDetails[]> => {
    try {
      const groupsRef = firestoreApi.getCollection('groups');
      const groups = await firestoreApi.getDocuments(groupsRef);
      
      const groupsDetails: GroupDetails[] = [];

      for (const group of groups) {
        const groupId = group.id;
        const groupData = group.data() as Record<string, unknown>;
        
        // جلب عدد الأعضاء بسرعة
        const membersRef = firestoreApi.getSubCollectionRef(
          'members',
          groupId,
          'members'
        );
        const membersDocs = await firestoreApi.getDocuments(membersRef);
        
        // جلب الطلاب من students/{groupId}/students
        const studentsRef = firestoreApi.getSubCollectionRef(
          'students',
          groupId,
          'students'
        );
        const studentsDocs = await firestoreApi.getDocuments(studentsRef);
        const students: StudentDetails[] = studentsDocs.map(student => {
          const studentData = student.data() || {};
          return {
            id: student.id,
            name: (studentData.studentName as string) || 'طالب بدون اسم',
            groupId,
            totalTestsTaken: Number(studentData.totalTestsTaken) || 0,
            averageScore: Number(studentData.averageScore) || 0,
            lastActivity: (studentData.lastActivity as string) || '',
            status: (studentData.status as string) || 'active',
            createdAt: (studentData.createdAt as string) || '',
          };
        });
        
        // جلب الاختبارات بسرعة
        const testsRef = firestoreApi.getSubCollectionRef(
          'test',
          groupId,
          'test'
        );
        const testsDocs = await firestoreApi.getDocuments(testsRef);
        
        // حساب إحصائيات الاختبارات من محاولات الطلاب
        const tests: TestDetails[] = [];
        let completedTestCount = 0;
        let groupTotalScore = 0;
        let groupTotalStudents = 0;
        let groupPassed = 0;

        // جلب محاولات الطلاب من student_test_attempts
        const attemptsRef = firestoreApi.getSubCollectionRef(
          'student_test_attempts',
          groupId,
          'student_test_attempts'
        );
        const allAttempts = await firestoreApi.getDocuments(attemptsRef);

        // الحلقة تمر على جميع الاختبارات وتضيفها كلها
        for (const test of testsDocs) {
          const testId = test.id;
          const testData = test.data() as Record<string, unknown>;
          
          // فلترة محاولات هذا الاختبار
          const testAttempts = allAttempts.filter(doc => {
            const attemptData = doc.data() as Record<string, unknown>;
            return attemptData.testId === testId;
          });
          
          // إضافة الاختبار إلى القائمة دائماً
          if (testAttempts.length > 0) {
            let totalScore = 0;
            let passedCount = 0;
            const uniqueStudents = new Set<string>();
            
            for (const attempt of testAttempts) {
              const attemptData = attempt.data() as Record<string, unknown>;
              const percentage = Number(attemptData.percentage) || 0;
              const studentId = attemptData.studentId as string || '';
              
              totalScore += percentage;
              if (percentage >= 60) {
                passedCount++;
              }
              
              if (studentId) {
                uniqueStudents.add(studentId);
              }
            }
            
            const avgScore = totalScore / testAttempts.length;
            const passRate = (passedCount / testAttempts.length) * 100;
            
            tests.push({
              id: testId,
              title: (testData.title as string) || 'اختبار بدون عنوان',
              description: (testData.description as string) || '',
              studentCount: uniqueStudents.size,
              completedCount: testAttempts.length,
              averageScore: avgScore,
              passRate,
              createdBy: (testData.createdBy as string) || '',
              createdByName: (testData.createdByName as string) || '',
              createdByImageUrl: (testData.createdByImageUrl as string) || '',
            });
            
            completedTestCount++;
            groupTotalScore += avgScore * uniqueStudents.size;
            groupTotalStudents += uniqueStudents.size;
            groupPassed += passedCount;
          } else {
            // اختبار بلا نتائج - لكن نضيفه إلى القائمة
            tests.push({
              id: testId,
              title: (testData.title as string) || 'اختبار بدون عنوان',
              description: (testData.description as string) || '',
              studentCount: 0,
              completedCount: 0,
              averageScore: 0,
              passRate: 0,
              createdBy: (testData.createdBy as string) || '',
              createdByName: (testData.createdByName as string) || '',
              createdByImageUrl: (testData.createdByImageUrl as string) || '',
            });
          }
        }

        const groupAvgScore = groupTotalStudents > 0 ? groupTotalScore / groupTotalStudents : 0;
        const groupPassRate = groupTotalStudents > 0 ? (groupPassed / groupTotalStudents) * 100 : 0;

        groupsDetails.push({
          id: groupId,
          name: (groupData.name as string) || 'مجموعة بدون اسم',
          description: (groupData.description as string) || '',
          memberCount: membersDocs.length, // عدد الأعضاء فقط
          testCount: tests.length,
          completedTests: completedTestCount,
          averageScore: groupAvgScore,
          passRate: groupPassRate,
          tests,
          members: [], // سيتم تحميلهم عند النقر
          students, // تحميل الطلاب مباشرة
          createdBy: (groupData.createdBy as string) || '',
          createdByName: (groupData.createdByName as string) || '',
          createdByImageUrl: (groupData.createdByImageUrl as string) || '',
        });
      }

      return groupsDetails;
    } catch (error) {
      console.error('Error loading groups details:', error);
      return [];
    }
  };

  const getTemplateTitle = (templateId: string): string => {
    return TestTemplates.getTemplateTitle(templateId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                لوحة التحكم - إحصائيات النظام
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={handlePrintDashboard}
                className="btn-success"
              >
                🖨️ طباعة التقرير
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="btn-secondary"
              >
                ⚙️ الإعدادات
              </button>
              <button
                onClick={loadAllStats}
                className="btn-primary"
              >
                🔄 تحديث البيانات
              </button>
              <button
                onClick={() => router.push('/home')}
                className="btn-secondary"
              >
                🏠 العودة
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Last Updated */}
        <div className="card mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold text-gray-900">آخر تحديث</p>
              <p className="text-sm text-gray-500">
                {lastUpdated.toLocaleString('ar-SA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatsCard
            title="المستخدمين"
            value={stats.totalUsers}
            icon="👥"
            color="blue"
            subtitle={`نشط: ${stats.activeUsers} | غير نشط: ${stats.inactiveUsers}`}
          />
          <StatsCard
            title="الأسئلة"
            value={stats.totalQuestions}
            icon="❓"
            color="purple"
          />
          <StatsCard
            title="الاختبارات"
            value={stats.totalTests}
            icon="📝"
            color="green"
            subtitle={`مكتمل: ${stats.completedTests}`}
          />
          <StatsCard
            title="المجموعات"
            value={stats.totalGroups}
            icon="👥"
            color="orange"
          />
        </div>

        {/* Reference Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatsCard
            title="الرواة"
            value={stats.totalNarrators}
            icon="👤"
            color="purple"
            small
          />
          <StatsCard
            title="الكتب"
            value={stats.totalBooks}
            icon="📚"
            color="orange"
            small
          />
          <StatsCard
            title="المخرجيين"
            value={stats.totalAttributions}
            icon="🔗"
            color="teal"
            small
          />
        </div>

        {/* Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <StatsCard
            title="معدل النجاح"
            value={`${stats.passRate.toFixed(1)}%`}
            icon="🎯"
            color="cyan"
            large
          />
          <StatsCard
            title="المعدل العام"
            value={`${stats.averageScore.toFixed(1)}%`}
            icon="📊"
            color="slate"
            large
          />
        </div>

        {/* Groups Details */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">تفاصيل المجموعات</h2>
          
          {stats.groupsDetails.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد مجموعات</h3>
              <p className="text-gray-500">لم يتم إنشاء أي مجموعات حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.groupsDetails.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <div 
                    className="bg-gradient-to-r from-slate-50 to-gray-100 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 space-x-reverse flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
                            {group.createdByName && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {group.createdByImageUrl && (
                                  <Image
                                    src={group.createdByImageUrl}
                                    alt={group.createdByName}
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                  />
                                )}
                                <span>منشئ: {group.createdByName}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{group.description}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div className="bg-blue-100 px-3 py-2 rounded-lg">
                            <p className="text-xs text-blue-600 font-semibold">الأعضاء</p>
                            <p className="text-lg font-bold text-blue-700">{group.memberCount}</p>
                          </div>
                          <div className="bg-green-100 px-3 py-2 rounded-lg">
                            <p className="text-xs text-green-600 font-semibold">الاختبارات</p>
                            <p className="text-lg font-bold text-green-700">{group.testCount}</p>
                          </div>
                          <div className="bg-purple-100 px-3 py-2 rounded-lg">
                            <p className="text-xs text-purple-600 font-semibold">المعدل</p>
                            <p className="text-lg font-bold text-purple-700">{group.averageScore.toFixed(1)}%</p>
                          </div>
                          <div className="bg-cyan-100 px-3 py-2 rounded-lg">
                            <p className="text-xs text-cyan-600 font-semibold">النجاح</p>
                            <p className="text-lg font-bold text-cyan-700">{group.passRate.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintGroup(group);
                          }}
                          className="btn-success p-2 !px-3 !py-2"
                          title="طباعة تقرير المجموعة"
                        >
                          🖨️
                        </button>
                        <button className="mr-4 text-gray-400 hover:text-gray-600">
                          {expandedGroups.has(group.id) ? '▼' : '▶'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedGroups.has(group.id) && (
                    <div className="p-4 bg-white space-y-6">
                      {/* Tests Details */}
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4">الاختبارات ({group.tests.length})</h4>
                        {group.tests.length === 0 ? (
                          <p className="text-gray-500">لا توجد اختبارات في هذه المجموعة</p>
                        ) : (
                          <div className="space-y-3">
                            {group.tests.map((test) => (
                              <div key={test.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <h5 className="font-semibold text-gray-900">{test.title}</h5>
                                    {test.createdByName && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {test.createdByImageUrl && (
                                          <Image
                                            src={test.createdByImageUrl}
                                            alt={test.createdByName}
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                        )}
                                        <span>{test.createdByName}</span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">{test.description}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">الطلاب:</span>
                                    <span className="font-bold text-blue-600 mr-2">{test.studentCount}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">المعدل:</span>
                                    <span className="font-bold text-purple-600 mr-2">{test.averageScore.toFixed(1)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">معدل النجاح:</span>
                                    <span className="font-bold text-green-600 mr-2">{test.passRate.toFixed(1)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">الحالة:</span>
                                    <span className={`font-bold mr-2 ${test.studentCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                      {test.studentCount > 0 ? 'مكتمل' : 'غير مكتمل'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Members Details */}
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4">الأعضاء ({group.members.length})</h4>
                        {group.members.length === 0 ? (
                          <p className="text-gray-500">لا يوجد أعضاء في هذه المجموعة</p>
                        ) : (
                          <div className="space-y-3">
                            {group.members.map((member) => (
                              <div key={member.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Member Header */}
                                <div 
                                  className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 cursor-pointer hover:bg-gray-200 transition-colors"
                                  onClick={() => toggleMember(member.id)}
                                >
                                    <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 space-x-reverse flex-1">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h6 className="font-bold text-gray-900">{member.name}</h6>
                                          {member.createdByName && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                              {member.createdByImageUrl && (
                                                <Image
                                                  src={member.createdByImageUrl}
                                                  alt={member.createdByName}
                                                  width={16}
                                                  height={16}
                                                  className="rounded-full"
                                                />
                                              )}
                                              <span>منشئ: {member.createdByName}</span>
                                            </div>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600">{member.email}</p>
                                      </div>
                                      <div className="flex items-center space-x-3 space-x-reverse">
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {member.isActive ? 'نشط' : 'غير نشط'}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                          {member.role === 'teacher' ? 'معلم' : member.role === 'admin' ? 'مدير' : 'طالب'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Students Details */}
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4">الطلاب ({group.students.length})</h4>
                        {group.students.length === 0 ? (
                          <p className="text-gray-500">لا يوجد طلاب في هذه المجموعة</p>
                        ) : (
                          <div className="space-y-3">
                            {group.students.map((student) => (
                              <div key={student.id} className="border border-green-200 rounded-lg overflow-hidden">
                                {/* Student Header - Clickable */}
                                <div 
                                  className="bg-gradient-to-r from-green-50 to-green-100 p-4 cursor-pointer hover:bg-green-200 transition-colors"
                                  onClick={() => toggleStudent(student.id, group.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 space-x-reverse flex-1">
                                      <div className="flex-1">
                                        <h6 className="font-bold text-gray-900">{student.name}</h6>
                                        <div className="flex items-center gap-4 mt-2">
                                          <span className="text-xs text-blue-600">
                                            عدد الاختبارات: {student.totalTestsTaken}
                                          </span>
                                          <span className="text-xs text-purple-600">
                                            المعدل: {student.averageScore.toFixed(1)}%
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded ${
                                            student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                          }`}>
                                            {student.status === 'active' ? 'نشط' : 'غير نشط'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <button className="mr-4 text-gray-400 hover:text-gray-600">
                                      {expandedStudents.has(student.id) ? '▼' : '▶'}
                                    </button>
                                  </div>
                                </div>

                                {/* Student Test Attempts */}
                                {expandedStudents.has(student.id) && studentAttempts[student.id] && (
                                  <div className="p-4 bg-white border-t border-green-300">
                                    {studentAttempts[student.id].length > 0 ? (
                                      <div className="space-y-3">
                                        <h6 className="font-bold text-gray-900 mb-3">اختبارات الطالب:</h6>
                                        {studentAttempts[student.id].map((test) => (
                                          <div key={test.testId} className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                              <div>
                                                <p className="text-xs text-blue-600 font-semibold">الاختبار</p>
                                                <p className="font-bold text-gray-900">{test.testTitle}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-blue-600 font-semibold">عدد المحاولات</p>
                                                <p className="text-lg font-bold text-purple-600">{test.attempts}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-blue-600 font-semibold">أفضل درجة</p>
                                                <p className="text-lg font-bold text-green-600">{test.bestScore.toFixed(1)}%</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-blue-600 font-semibold">متوسط الدرجات</p>
                                                <p className="text-lg font-bold text-orange-600">{test.averageScore.toFixed(1)}%</p>
                                              </div>
                                            </div>
                                            {test.lastAttemptDate && (
                                              <p className="text-xs text-gray-500 mt-2">
                                                آخر محاولة: {new Date(test.lastAttemptDate).toLocaleDateString('ar-SA')}
                                              </p>
                                            )}
                                            <div className="mt-3">
                                              <a
                                                href={`/dashboard/attempts/${group.id}/${student.id}/${test.testId}`}
                                                className="inline-block text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                              >
                                                عرض تفاصيل المحاولة
                                              </a>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-center py-4">لم يحل الطالب أي اختبارات بعد</p>
                                    )}
                                  </div>
                                )}
                                {expandedStudents.has(student.id) && !studentAttempts[student.id] && (
                                  <div className="p-4 bg-white border-t border-green-300">
                                    <p className="text-gray-500 text-center py-2">جاري تحميل الاختبارات...</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions by Template */}
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">توزيع الأسئلة حسب المجلد</h2>
          <div className="space-y-3">
            {Object.entries(stats.questionsByTemplate).map(([templateId, count]) => (
              <div key={templateId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-2xl">📁</span>
                  <div>
                    <p className="font-semibold text-gray-900">{getTemplateTitle(templateId)}</p>
                    <p className="text-sm text-gray-500">معرف: {templateId}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-2xl font-bold text-blue-600">{count}</span>
                  <span className="text-gray-500">سؤال</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Component for Stats Cards
function StatsCard({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle, 
  small = false,
  large = false 
}: { 
  title: string; 
  value: string | number; 
  icon: string; 
  color: 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'cyan' | 'slate';
  subtitle?: string;
  small?: boolean;
  large?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600',
    cyan: 'from-cyan-500 to-cyan-600',
    slate: 'from-slate-600 to-slate-700',
  };

  const textColorClasses = {
    blue: 'text-blue-100',
    purple: 'text-purple-100',
    green: 'text-green-100',
    orange: 'text-orange-100',
    teal: 'text-teal-100',
    cyan: 'text-cyan-100',
    slate: 'text-slate-100',
  };

  if (small) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-3xl">{icon}</span>
        </div>
        <p className="text-4xl font-bold text-blue-600">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      </div>
    );
  }

  if (large) {
    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-lg p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <span className="text-4xl">{icon}</span>
        </div>
        <p className="text-5xl font-bold mb-2">{value}</p>
        {subtitle && <p className={`text-sm ${textColorClasses[color]}`}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${textColorClasses[color]} text-sm font-medium mb-1`}>{title}</p>
          <p className="text-4xl font-bold">{value}</p>
          {subtitle && (
            <div className="mt-4 flex items-center space-x-2 space-x-reverse text-sm">
              <span>{subtitle}</span>
            </div>
          )}
        </div>
        <div className="p-4 bg-white bg-opacity-20 rounded-xl">
          <span className="text-5xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}