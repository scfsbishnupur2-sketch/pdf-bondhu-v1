import { 
  AdMob, 
  BannerAdSize, 
  BannerAdPosition 
} from '@capacitor-community/admob';

// গুগলের অফিশিয়াল টেস্ট অ্যাড ইউনিট আইডি
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

// ১. AdMob ইনিশিয়ালাইজেশন
export async function initializeAdMob() {
  try {
    await AdMob.initialize({
      testingDevices: ['EMULATOR'], // ডেভেলপমেন্ট ডিভাইস
      initializeForTesting: true,
    });
    console.log('AdMob successfully initialized');
  } catch (error) {
    console.warn('AdMob init error (ignored in browser):', error);
  }
}

// ২. ব্যানার অ্যাড দেখানো (স্ক্রিনের একদম নিচে)
export async function showBottomBanner() {
  try {
    const options = {
      adId: TEST_BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true, // লাইভ করার সময় false করবেন
    };
    await AdMob.showBanner(options);
  } catch (error) {
    console.warn('Banner ad error (ignored in browser):', error);
  }
}

// ৩. ব্যানার অ্যাড সাময়িক লুকিয়ে রাখা (যখন ইউজার এডিটর বা সিগনেচার ড্র করবেন)
export async function hideBanner() {
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.warn('Hide banner error (ignored in browser):', error);
  }
}

// ৪. ইন্টারস্টিশিয়াল অ্যাড লোড ও প্রদর্শন (ফাইল সফলভাবে তৈরি বা ডাউনলোড হওয়ার পর)
let isInterstitialPrepared = false;

export async function prepareInterstitial() {
  try {
    await AdMob.prepareInterstitial({
      adId: TEST_INTERSTITIAL_ID,
      isTesting: true,
    });
    isInterstitialPrepared = true;
  } catch (error) {
    console.warn('Interstitial preparation failed (ignored in browser):', error);
    isInterstitialPrepared = false;
  }
}

export async function showInterstitialAfterAction() {
  try {
    if (isInterstitialPrepared) {
      await AdMob.showInterstitial();
      isInterstitialPrepared = false;
      // পরবর্তী ব্যবহারের জন্য ব্যাকগ্রাউন্ডে আবার প্রস্তুত করে রাখুন
      prepareInterstitial();
    } else {
      // লোড করা না থাকলে ব্যাকগ্রাউন্ডে লোড করতে দিন
      prepareInterstitial();
    }
  } catch (error) {
    console.warn('Show interstitial error (ignored in browser):', error);
  }
}
