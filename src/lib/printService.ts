import html2canvas from 'html2canvas';

export interface PdfSettings {
  isHeaderVisible: boolean;
  logoBase64: string;
  rightHeader: string;
  leftHeader: string;
  footerText: string;
}

const defaultSettings: PdfSettings = {
  isHeaderVisible: true,
  logoBase64: '',
  rightHeader: 'مؤسسة الوحيين الخيرية\nلجنة الإختبارات والتقييم',
  leftHeader: 'Al-Wahiyain Charitable Foundation\nExamination and Assessment Committee',
  footerText: 'اسم الطالب\nالحلقة\nمكان الحلقة\nالمدرس',
};

interface DashboardStats {
  totalUsers: number;
  totalNarrators: number;
  totalBooks: number;
  totalAttributions: number;
  totalQuestions: number;
  totalTests: number;
  totalGroups: number;
  averageScore: number;
  passRate: number;
  groupsDetails: Group[];
}

interface Group {
  name: string;
  description?: string;
  memberCount: number;
  testCount: number;
  averageScore: number;
  passRate: number;
  tests: Test[];
  students: Student[];
}

interface Test {
  title: string;
  averageScore: number;
  passRate: number;
}

interface Student {
  name: string;
  totalTestsTaken: number;
  averageScore: number;
}

export class PrintService {
  /**
   * الحصول على الإعدادات المحفوظة
   */
  static getSettings(): PdfSettings {
    if (typeof window === 'undefined') return defaultSettings;
    
    try {
      const saved = localStorage.getItem('pdf_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      return defaultSettings;
    }
    return defaultSettings;
  }

  /**
   * طباعة تقرير اللوحة التحكم
   */
  static async printDashboard(stats: DashboardStats): Promise<void> {
    try {
      const jsPDF = (await import('jspdf')).default;
      const settings = this.getSettings();
      const doc = new jsPDF();

      // إنشاء محتوى HTML مؤقت بجودة عالية
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '794px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = 'Arial, "Segoe UI", Tahoma, sans-serif';
      tempDiv.style.direction = 'rtl';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.color = '#000000';
      tempDiv.style.lineHeight = '1.8';

      let html = '<div style="max-width: 100%;">';
      
      // إضافة الرأس
      if (settings.isHeaderVisible) {
        html += `<div style="margin-bottom: 20px;">`;
        html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">`;
        
        // الرأس الأيمن (العربي)
        html += `<div style="flex: 1; text-align: right; padding-left: 20px; font-weight: bold; color: #333; font-size: 12px;">`;
        html += settings.rightHeader.replace(/\n/g, '<br>');
        html += `</div>`;
        
        // الشعار في الوسط
        if (settings.logoBase64) {
          html += `<div style="margin: 0 20px;">`;
          html += `<img src="${settings.logoBase64}" style="width: 80px; height: 80px; object-fit: contain;" />`;
          html += `</div>`;
        }
        
        // الرأس الأيسر (الإنجليزي)
        html += `<div style="flex: 1; text-align: left; padding-right: 20px; font-weight: bold; color: #333; font-size: 12px;">`;
        html += settings.leftHeader.replace(/\n/g, '<br>');
        html += `</div>`;
        
        html += `</div>`;
        html += `<hr style="border: 2px solid #ddd; margin: 25px 0;" />`;
        html += `</div>`;
      }

      html += `<h1 style="font-size: 28px; font-weight: bold; text-align: center; margin: 30px 0; color: #1a1a1a;">تقرير إحصائي شامل</h1>`;
      
      // الإحصائيات
      html += `<div style="background-color: #f0f4f8; padding: 25px; border-radius: 10px; text-align: right; line-height: 2.5; font-size: 15px;">`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">المستخدمين:</strong> <span style="color: #1f2937;">${stats.totalUsers}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">الرواة:</strong> <span style="color: #1f2937;">${stats.totalNarrators}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">الكتب:</strong> <span style="color: #1f2937;">${stats.totalBooks}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">المخرجيين:</strong> <span style="color: #1f2937;">${stats.totalAttributions}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">الأسئلة:</strong> <span style="color: #1f2937;">${stats.totalQuestions}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">الاختبارات:</strong> <span style="color: #1f2937;">${stats.totalTests}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">المجموعات:</strong> <span style="color: #1f2937;">${stats.totalGroups}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">المعدل العام:</strong> <span style="color: #1f2937;">${stats.averageScore.toFixed(1)}%</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">معدل النجاح:</strong> <span style="color: #1f2937;">${stats.passRate.toFixed(1)}%</span></p>`;
      html += `</div>`;

      html += '</div>';
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      // انتظار تحميل الصور
      await new Promise(resolve => setTimeout(resolve, 1000));

      // تحويل HTML إلى canvas بجودة عالية جداً
      const canvas = await html2canvas(tempDiv, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      document.body.removeChild(tempDiv);
      
      // حفظ الملف
      doc.save('dashboard-report.pdf');
    } catch (error) {
      console.error('Error printing dashboard:', error);
      alert('حدث خطأ في طباعة التقرير');
    }
  }

  /**
   * طباعة تقرير المجموعة
   */
  static async printGroupReport(group: Group): Promise<void> {
    try {
      const jsPDF = (await import('jspdf')).default;
      const settings = this.getSettings();
      const doc = new jsPDF();

      // إنشاء محتوى HTML مؤقت بجودة عالية
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '794px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = 'Arial, "Segoe UI", Tahoma, sans-serif';
      tempDiv.style.direction = 'rtl';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.color = '#000000';
      tempDiv.style.lineHeight = '1.8';

      let html = '<div style="max-width: 100%;">';
      
      // إضافة الرأس
      if (settings.isHeaderVisible) {
        html += `<div style="margin-bottom: 20px;">`;
        html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">`;
        
        // الرأس الأيمن (العربي)
        html += `<div style="flex: 1; text-align: right; padding-left: 20px; font-weight: bold; color: #333; font-size: 12px;">`;
        html += settings.rightHeader.replace(/\n/g, '<br>');
        html += `</div>`;
        
        // الشعار في الوسط
        if (settings.logoBase64) {
          html += `<div style="margin: 0 20px;">`;
          html += `<img src="${settings.logoBase64}" style="width: 80px; height: 80px; object-fit: contain;" />`;
          html += `</div>`;
        }
        
        // الرأس الأيسر (الإنجليزي)
        html += `<div style="flex: 1; text-align: left; padding-right: 20px; font-weight: bold; color: #333; font-size: 12px;">`;
        html += settings.leftHeader.replace(/\n/g, '<br>');
        html += `</div>`;
        
        html += `</div>`;
        html += `<hr style="border: 2px solid #ddd; margin: 25px 0;" />`;
        html += `</div>`;
      }

      // اسم المجموعة
      html += `<h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 25px 0; color: #1a1a1a;">${group.name}</h1>`;
      
      if (group.description) {
        html += `<p style="margin: 15px 0; text-align: center; color: #666;">${group.description}</p>`;
      }

      // إحصائيات المجموعة
      html += `<div style="background-color: #f0f4f8; padding: 20px; border-radius: 10px; text-align: right; margin: 20px 0;">`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">عدد الأعضاء:</strong> <span style="color: #1f2937;">${group.memberCount}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">عدد الاختبارات:</strong> <span style="color: #1f2937;">${group.testCount}</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">المعدل:</strong> <span style="color: #1f2937;">${group.averageScore.toFixed(1)}%</span></p>`;
      html += `<p style="margin: 8px 0;"><strong style="color: #2563eb;">معدل النجاح:</strong> <span style="color: #1f2937;">${group.passRate.toFixed(1)}%</span></p>`;
      html += `</div>`;

      // الاختبارات
      if (group.tests.length > 0) {
        html += `<h2 style="font-size: 18px; font-weight: bold; margin: 25px 0 15px 0; color: #374151;">الاختبارات:</h2>`;
        html += `<div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">`;
        group.tests.forEach((test) => {
          html += `<p style="text-align: right; line-height: 2; margin: 8px 0; padding: 10px; background-color: #f9fafb; border-radius: 5px;">`;
          html += `<strong>${test.title}</strong> - المعدل: ${test.averageScore.toFixed(1)}% - النجاح: ${test.passRate.toFixed(1)}%`;
          html += `</p>`;
        });
        html += `</div>`;
      }

      // الطلاب
      if (group.students.length > 0) {
        html += `<h2 style="font-size: 18px; font-weight: bold; margin: 25px 0 15px 0; color: #374151;">الطلاب:</h2>`;
        html += `<div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">`;
        group.students.forEach((student) => {
          html += `<p style="text-align: right; line-height: 2; margin: 8px 0; padding: 10px; background-color: #f9fafb; border-radius: 5px;">`;
          html += `<strong>${student.name}</strong> - اختبارات: ${student.totalTestsTaken} - المعدل: ${student.averageScore.toFixed(1)}%`;
          html += `</p>`;
        });
        html += `</div>`;
      }

      // التوقيعات - توزيع 3 في صف كما في Dart
      if (settings.footerText) {
        const signatures = settings.footerText
          .split('\n')
          .filter(s => s.trim().length > 0);
        
        html += `<div style="margin-top: 50px; padding-top: 25px; border-top: 2px solid #e5e7eb;">`;
        
        // توزيع 3 في كل صف
        for (let i = 0; i < signatures.length; i += 3) {
          html += `<div style="display: flex; justify-content: space-around; margin-bottom: 30px;">`;
          
          for (let j = i; j < i + 3 && j < signatures.length; j++) {
            html += `<div style="text-align: center; flex: 1; max-width: 200px;">`;
            html += `<div style="border-bottom: 1px solid #000; width: 100px; margin: 0 auto;"></div>`;
            html += `<div style="margin-top: 10px;">`;
            html += `<p style="margin: 0; font-size: 12px; color: #6b7280;">${signatures[j]}</p>`;
            html += `<div style="height: 40px;"></div>`;
            html += `</div>`;
            html += `</div>`;
          }
          
          html += `</div>`;
        }
        
        html += `</div>`;
      }

      html += '</div>';
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      // انتظار تحميل الصور
      await new Promise(resolve => setTimeout(resolve, 1000));

      // تحويل HTML إلى canvas بجودة عالية جداً
      const canvas = await html2canvas(tempDiv, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      document.body.removeChild(tempDiv);
      
      // حفظ الملف
      doc.save(`${group.name}-report.pdf`);
    } catch (error) {
      console.error('Error printing group report:', error);
      alert('حدث خطأ في طباعة تقرير المجموعة');
    }
  }
}
