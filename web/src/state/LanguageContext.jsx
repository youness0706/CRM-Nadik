import React, { createContext, useContext, useEffect, useState } from 'react';

const translations = {
  fr: {
    'Dashboard': 'Tableau de bord', 'Platform Dashboard': 'Vue plateforme', 'Members': 'Adhérents', 'Payments': 'Paiements',
    'Unpaid': 'Impayés', 'Finance': 'Finances', 'Expenses': 'Dépenses', 'Events': 'Événements', 'Staff': 'Personnel',
    'Organizations': 'Organisations', 'Settings': 'Paramètres', 'Sign Out': 'Déconnexion', 'Management Panel': 'Espace de gestion',
    'Language': 'Langue', 'French': 'Français', 'Arabic': 'العربية', 'Welcome back to': 'Bienvenue dans',
    'Active Members': 'Adhérents actifs', 'Unpaid This Month': 'Impayés ce mois', 'Month Income': 'Revenus du mois',
    'Month Expenses': 'Dépenses du mois', 'Inactive Members': 'Adhérents inactifs', 'Added Payments': 'Revenus complémentaires',
    'Staff': 'Personnel', 'Events': 'Événements', 'new this month': 'nouveaux ce mois', 'today': 'aujourd’hui',
    'This month': 'Ce mois-ci', 'Members': 'Adhérents', 'Add Member': 'Ajouter un adhérent', 'Search members (press Enter)...': 'Rechercher un adhérent (Entrée)...',
    'All Statuses': 'Tous les statuts', 'Active': 'Actif', 'Inactive': 'Inactif', 'Category': 'Catégorie', 'All Categories': 'Toutes les catégories',
    'Name': 'Nom', 'Phone': 'Téléphone', 'Belt': 'Ceinture', 'Age': 'Âge', 'Status': 'Statut', 'Actions': 'Actions',
    'No members found.': 'Aucun adhérent trouvé.', 'Edit Member': 'Modifier l’adhérent', 'Delete Member': 'Supprimer l’adhérent',
    'Staff': 'Personnel', 'Add Staff': 'Ajouter un membre du personnel', 'Page Salaries:': 'Salaires de la page :',
    'Username': 'Nom d’utilisateur', 'Role': 'Rôle', 'Admin': 'Administrateur', 'Salary (MAD)': 'Salaire (MAD)',
    'Started': 'Date de début', 'Last Salary Payment': 'Dernier paiement du salaire', 'No staff members found.': 'Aucun membre du personnel.',
    'Edit Staff': 'Modifier le personnel', 'Delete Staff': 'Supprimer le personnel', 'Add New Staff Member': 'Ajouter un membre du personnel',
    'First Name': 'Prénom', 'Last Name': 'Nom', 'Email': 'E-mail', 'Password': 'Mot de passe', 'New Password (optional)': 'Nouveau mot de passe (facultatif)',
    'Is Admin': 'Administrateur', 'Cancel': 'Annuler', 'Save Changes': 'Enregistrer', 'Save changes': 'Enregistrer',
    'Financial Status': 'Situation financière', 'Year': 'Année', 'Total Income': 'Revenus totaux', 'Total Expenses': 'Dépenses totales',
    'Staff Salaries': 'Salaires du personnel', 'Net Profit': 'Résultat net', 'Monthly Income Breakdown': 'Revenus mensuels',
    'Rent:': 'Loyer :', 'Dashboard': 'Tableau de bord', 'Nadik Platform': 'Plateforme Nadik',
    'Owner overview · organizations and platform finances': 'Vue propriétaire · organisations et finances de la plateforme',
    'Organizations': 'Organisations', 'People across organizations': 'Personnes dans les organisations',
    'active': 'actives', 'trainees': 'adhérents', 'staff': 'personnel', 'subscription income': 'revenus abonnements',
    'Platform net': 'Résultat net plateforme', 'Platform finance': 'Finances de la plateforme', 'Income': 'Revenus', 'Costs': 'Dépenses',
    'Subscription income': 'Revenus des abonnements', 'Platform costs': 'Dépenses de la plateforme',
    'Organization portfolio': 'Portefeuille des organisations', 'Plan / status': 'Offre / statut', 'Trainees': 'Adhérents',
    'Subscription income (': 'Revenus des abonnements (', 'Renewal': 'Renouvellement', 'Not set': 'Non défini',
    'No organizations yet.': 'Aucune organisation pour le moment.', 'No platform costs recorded for': 'Aucune dépense enregistrée pour',
    'Add platform cost': 'Ajouter une dépense plateforme', 'Cost title': 'Libellé de la dépense', 'Amount (MAD)': 'Montant (MAD)',
    'Date': 'Date', 'Description': 'Description', 'Save cost': 'Enregistrer la dépense', 'Cost': 'Dépense', 'Amount': 'Montant',
    'Platform costs': 'Dépenses plateforme', 'Owner overview': 'Vue propriétaire', 'Saving...': 'Enregistrement...',
    'Add organization': 'Ajouter une organisation', 'Close': 'Fermer', 'No email': 'Aucun e-mail', 'No phone': 'Aucun téléphone',
  },
  ar: {
    'Dashboard': 'لوحة التحكم', 'Platform Dashboard': 'لوحة المنصة', 'Members': 'المنخرطون', 'Payments': 'المدفوعات',
    'Unpaid': 'غير المؤدين', 'Finance': 'المالية', 'Expenses': 'المصاريف', 'Events': 'الأنشطة', 'Staff': 'الموظفون',
    'Organizations': 'الجمعيات', 'Settings': 'الإعدادات', 'Sign Out': 'تسجيل الخروج', 'Management Panel': 'لوحة التسيير',
    'Language': 'اللغة', 'French': 'Français', 'Arabic': 'العربية', 'Welcome back to': 'مرحباً بعودتك إلى',
    'Active Members': 'المنخرطون النشطون', 'Unpaid This Month': 'غير المؤدين هذا الشهر', 'Month Income': 'مداخيل الشهر',
    'Month Expenses': 'مصاريف الشهر', 'Inactive Members': 'المنخرطون غير النشطين', 'Added Payments': 'مداخيل إضافية',
    'new this month': 'جدد هذا الشهر', 'today': 'اليوم', 'This month': 'هذا الشهر', 'Add Member': 'إضافة منخرط',
    'Search members (press Enter)...': 'البحث عن منخرط (اضغط Enter)...', 'All Statuses': 'جميع الحالات', 'Active': 'نشط',
    'Inactive': 'غير نشط', 'Category': 'الفئة', 'All Categories': 'جميع الفئات', 'Name': 'الاسم', 'Phone': 'الهاتف',
    'Belt': 'الحزام', 'Age': 'العمر', 'Status': 'الحالة', 'Actions': 'الإجراءات', 'No members found.': 'لم يتم العثور على منخرطين.',
    'Edit Member': 'تعديل المنخرط', 'Delete Member': 'حذف المنخرط', 'Add Staff': 'إضافة موظف', 'Page Salaries:': 'رواتب الصفحة:',
    'Username': 'اسم المستخدم', 'Role': 'الدور', 'Admin': 'مسؤول', 'Salary (MAD)': 'الراتب (درهم)', 'Started': 'تاريخ البداية',
    'Last Salary Payment': 'آخر أداء للراتب', 'No staff members found.': 'لم يتم العثور على موظفين.', 'Edit Staff': 'تعديل الموظف',
    'Delete Staff': 'حذف الموظف', 'Add New Staff Member': 'إضافة موظف جديد', 'First Name': 'الاسم الشخصي', 'Last Name': 'اسم العائلة',
    'Email': 'البريد الإلكتروني', 'Password': 'كلمة المرور', 'New Password (optional)': 'كلمة مرور جديدة (اختياري)',
    'Is Admin': 'مسؤول', 'Cancel': 'إلغاء', 'Save Changes': 'حفظ التغييرات', 'Save changes': 'حفظ التغييرات',
    'Financial Status': 'الوضع المالي', 'Year': 'السنة', 'Total Income': 'إجمالي المداخيل', 'Total Expenses': 'إجمالي المصاريف',
    'Staff Salaries': 'رواتب الموظفين', 'Net Profit': 'صافي الربح', 'Monthly Income Breakdown': 'تفصيل المداخيل الشهرية',
    'Rent:': 'الكراء:', 'Nadik Platform': 'منصة ناديك', 'Owner overview · organizations and platform finances': 'نظرة المالك · الجمعيات ومالية المنصة',
    'Organizations': 'الجمعيات', 'People across organizations': 'الأشخاص في الجمعيات', 'active': 'نشطة', 'trainees': 'منخرطون',
    'staff': 'موظفون', 'subscription income': 'مداخيل الاشتراكات', 'Platform net': 'صافي المنصة', 'Platform finance': 'مالية المنصة',
    'Income': 'المداخيل', 'Costs': 'المصاريف', 'Subscription income': 'مداخيل الاشتراكات', 'Platform costs': 'مصاريف المنصة',
    'Organization portfolio': 'قائمة الجمعيات', 'Plan / status': 'الباقة / الحالة', 'Trainees': 'المنخرطون', 'Renewal': 'التجديد',
    'Not set': 'غير محدد', 'No organizations yet.': 'لا توجد جمعيات حالياً.', 'Add platform cost': 'إضافة مصروف للمنصة',
    'Cost title': 'عنوان المصروف', 'Amount (MAD)': 'المبلغ (درهم)', 'Date': 'التاريخ', 'Description': 'الوصف',
    'Save cost': 'حفظ المصروف', 'Cost': 'المصروف', 'Amount': 'المبلغ', 'Saving...': 'جارٍ الحفظ...',
    'Add organization': 'إضافة جمعية', 'Close': 'إغلاق', 'No email': 'لا يوجد بريد إلكتروني', 'No phone': 'لا يوجد هاتف',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('nadik_language') || 'fr');
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('nadik_language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const t = (text) => translations[language]?.[text] || text;
  return <LanguageContext.Provider value={{ language, setLanguage, direction, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
