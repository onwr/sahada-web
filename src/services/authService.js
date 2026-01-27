import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { slugify } from './firestoreService';

// Kullanıcı kayıt işlemi
export const registerUser = async (userData) => {
  try {
    const { email, password, fullName, phone, userType } = userData;
    
    // Firebase Auth ile kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Kullanıcı profilini güncelle
    await updateProfile(user, {
      displayName: fullName
    });
    
    // Email doğrulama gönder
    await sendEmailVerification(user);
    
    // Slug oluştur
    const slug = `${slugify(fullName)}-${user.uid.slice(0, 5)}`;
    
    // Firestore'da kullanıcı verilerini kaydet
    const userDoc = {
      uid: user.uid,
      email: user.email,
      fullName,
      phone,
      slug,
      userType, // 'player' veya 'owner'
      createdAt: new Date(),
      emailVerified: false,
      profileCompleted: false,
      onboardingCompleted: false
    };
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: fullName,
        userType
      }
    };
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Kullanıcı giriş işlemi
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Firestore'dan kullanıcı verilerini al
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        userType: userData?.userType || 'player'
      }
    };
  } catch (error) {
    console.error('Giriş hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Google ile giriş
export const loginWithGoogle = async (userType = 'player') => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Kullanıcı verilerini Firestore'da kontrol et
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isNewUser = !userDoc.exists();
    
    if (isNewUser) {
      // Yeni kullanıcı - Firestore'a kaydet (telefon numarası onboarding'de eklenecek)
      const slug = `${slugify(user.displayName)}-${user.uid.slice(0, 5)}`;
      
      const userData = {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName,
        photoURL: user.photoURL || '',
        phone: '', // Onboarding'de eklenecek
        slug,
        userType: userType,
        createdAt: new Date(),
        emailVerified: user.emailVerified,
        onboardingCompleted: false,
        profileCompleted: false,
        phoneVerified: false // Telefon henüz doğrulanmadı
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
    }
    
    return {
      success: true,
      isNewUser,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        userType: userDoc.data()?.userType || userType
      }
    };
  } catch (error) {
    console.error('Google giriş hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Facebook ile giriş
export const loginWithFacebook = async (userType = 'player') => {
  try {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Kullanıcı verilerini Firestore'da kontrol et
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isNewUser = !userDoc.exists();
    
    if (isNewUser) {
      // Yeni kullanıcı - Firestore'a kaydet (telefon numarası onboarding'de eklenecek)
      const slug = `${slugify(user.displayName)}-${user.uid.slice(0, 5)}`;
      
      const userData = {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName,
        photoURL: user.photoURL || '',
        phone: '', // Onboarding'de eklenecek
        slug,
        userType: userType,
        createdAt: new Date(),
        emailVerified: user.emailVerified,
        onboardingCompleted: false,
        profileCompleted: false,
        phoneVerified: false // Telefon henüz doğrulanmadı
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
    }
    
    return {
      success: true,
      isNewUser,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        userType: userDoc.data()?.userType || userType
      }
    };
  } catch (error) {
    console.error('Facebook giriş hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Şifre sıfırlama
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Şifre sıfırlama e-postası gönderildi'
    };
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Çıkış yapma
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Çıkış hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Auth state değişikliklerini dinle
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Kullanıcı verilerini güncelle
export const updateUserData = async (uid, userData) => {
  try {
    await setDoc(doc(db, 'users', uid), userData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Sosyal medya ile giriş yapan yeni kullanıcıyı kaydet
export const completeSocialMediaRegistration = async (userData) => {
  try {
    const { uid, email, displayName, photoURL, phone, userType } = userData;
    
    const slug = `${slugify(displayName)}-${uid.slice(0, 5)}`;
    
    const userDoc = {
      uid,
      email,
      fullName: displayName,
      photoURL: photoURL || '',
      phone,
      slug,
      userType,
      createdAt: new Date(),
      emailVerified: true, // Sosyal medya ile giriş yapanlar zaten doğrulanmış
      profileCompleted: false,
      onboardingCompleted: false
    };
    
    await setDoc(doc(db, 'users', uid), userDoc);
    
    return {
      success: true,
      user: {
        uid,
        email,
        displayName,
        userType
      }
    };
  } catch (error) {
    console.error('Sosyal medya kayıt tamamlama hatası:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
};

// Hata mesajlarını Türkçe'ye çevir
const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanılıyor',
    'auth/invalid-email': 'Geçersiz e-posta adresi',
    'auth/operation-not-allowed': 'Bu işlem şu anda izin verilmiyor',
    'auth/weak-password': 'Şifre çok zayıf',
    'auth/user-disabled': 'Bu kullanıcı hesabı devre dışı bırakılmış',
    'auth/user-not-found': 'Kullanıcı bulunamadı',
    'auth/wrong-password': 'Yanlış şifre',
    'auth/invalid-credential': 'Geçersiz kimlik bilgileri',
    'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin',
    'auth/network-request-failed': 'Ağ bağlantı hatası',
    'auth/popup-closed-by-user': 'Giriş penceresi kullanıcı tarafından kapatıldı',
    'auth/cancelled-popup-request': 'Giriş işlemi iptal edildi'
  };
  
  return errorMessages[errorCode] || 'Bir hata oluştu. Lütfen tekrar deneyin';
};
