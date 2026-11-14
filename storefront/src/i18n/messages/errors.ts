import type { MessageTable } from '../types'

// Hata ve bulunamadi sayfalari.
export const errors: MessageTable = {
  'error.title': {
    en: 'Something went wrong',
    tr: 'Bir şeyler ters gitti',
    de: 'Etwas ist schiefgelaufen',
    fr: 'Une erreur est survenue',
    ar: 'حدث خطأ ما',
  },
  'error.description': {
    en: 'An unexpected error occurred while loading this page. You can try again or return to the homepage.',
    tr: 'Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da ana sayfaya dönebilirsiniz.',
    de: 'Beim Laden dieser Seite ist ein unerwarteter Fehler aufgetreten. Versuchen Sie es erneut oder kehren Sie zur Startseite zurück.',
    fr: 'Une erreur inattendue s’est produite lors du chargement de cette page. Réessayez ou revenez à l’accueil.',
    ar: 'حدث خطأ غير متوقع أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة إلى الرئيسية.',
  },
  'error.code': {
    en: 'Error code: {code}',
    tr: 'Hata kodu: {code}',
    de: 'Fehlercode: {code}',
    fr: 'Code d’erreur : {code}',
    ar: 'رمز الخطأ: {code}',
  },
  'error.retry': {
    en: 'Try again',
    tr: 'Tekrar dene',
    de: 'Erneut versuchen',
    fr: 'Réessayer',
    ar: 'إعادة المحاولة',
  },
  'error.home': {
    en: 'Home',
    tr: 'Ana sayfa',
    de: 'Startseite',
    fr: 'Accueil',
    ar: 'الرئيسية',
  },
  'error.allGames': {
    en: 'All games',
    tr: 'Tüm oyunlar',
    de: 'Alle Spiele',
    fr: 'Tous les jeux',
    ar: 'جميع الألعاب',
  },

  'notFound.title': {
    en: 'Page not found',
    tr: 'Sayfa bulunamadı',
    de: 'Seite nicht gefunden',
    fr: 'Page introuvable',
    ar: 'الصفحة غير موجودة',
  },
  'notFound.description': {
    en: 'The page you are looking for may have been moved, removed, or never existed. You can continue from below.',
    tr: 'Aradığınız sayfa taşınmış, kaldırılmış ya da hiç var olmamış olabilir. Aşağıdan devam edebilirsiniz.',
    de: 'Die gesuchte Seite wurde möglicherweise verschoben, entfernt oder hat nie existiert. Unten können Sie fortfahren.',
    fr: 'La page que vous cherchez a peut-être été déplacée, supprimée ou n’a jamais existé. Continuez ci-dessous.',
    ar: 'قد تكون الصفحة التي تبحث عنها قد نُقلت أو حُذفت أو لم تكن موجودة أصلًا. يمكنك المتابعة من الأسفل.',
  },
  'notFound.home': {
    en: 'Back to home',
    tr: 'Ana sayfaya dön',
    de: 'Zur Startseite',
    fr: 'Retour à l’accueil',
    ar: 'العودة إلى الرئيسية',
  },
  'notFound.allGames': {
    en: 'All games',
    tr: 'Tüm oyunlar',
    de: 'Alle Spiele',
    fr: 'Tous les jeux',
    ar: 'جميع الألعاب',
  },
  'notFound.support': {
    en: 'Support',
    tr: 'Destek',
    de: 'Support',
    fr: 'Support',
    ar: 'الدعم',
  },

  'globalError.title': {
    en: 'An unexpected error occurred',
    tr: 'Beklenmeyen bir hata oluştu',
    de: 'Ein unerwarteter Fehler ist aufgetreten',
    fr: 'Une erreur inattendue s’est produite',
    ar: 'حدث خطأ غير متوقع',
  },
  'globalError.description': {
    en: 'The store could not be loaded right now. Try reloading the page; if the problem persists, contact support.',
    tr: 'Mağaza şu anda yüklenemedi. Sayfayı yenilemeyi deneyin; sorun devam ederse destek ile iletişime geçin.',
    de: 'Der Shop konnte gerade nicht geladen werden. Versuchen Sie, die Seite neu zu laden; besteht das Problem weiter, wenden Sie sich an den Support.',
    fr: 'La boutique n’a pas pu être chargée pour le moment. Rechargez la page ; si le problème persiste, contactez le support.',
    ar: 'تعذّر تحميل المتجر الآن. حاول إعادة تحميل الصفحة، وإذا استمرت المشكلة فتواصل مع الدعم.',
  },
}
