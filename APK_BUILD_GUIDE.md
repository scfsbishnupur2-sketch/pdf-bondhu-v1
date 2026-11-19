# PDF Bondhu — Android APK তৈরির ও শেয়ার করার ৩টি সহজ ধাপ

এই প্রজেক্টের ভেতরে সম্পূর্ণ **Android WebView App (`android/`)** এবং অটোমেটিক **GitHub Actions APK Builder (`.github/workflows/build-apk.yml`)** সেটআপ করা আছে।

একবার `.apk` ফাইল বানিয়ে সবাইকে শেয়ার করলেই কাজ শেষ — এরপর আপনি যখনই AI Studio-তে অ্যাপ আপডেট করে **Publish** করবেন, সবার ফোনের অ্যাপ **অটোমেটিক আপডেট** হয়ে যাবে (নতুন করে APK বানানোর বা পাঠানোর দরকার নেই)!

---

## ৩ ধাপে `PDF-Bondhu.apk` ডাউনলোড করুন (কোনো Android Studio ছাড়াই)

### ধাপ ১: ZIP ডাউনলোড করুন
1. AI Studio-তে উপরের ডানদিকে **Download as ZIP** বাটনে ক্লিক করে পুরো প্রজেক্টটি ডাউনলোড করে Unzip করুন।

### ধাপ ২: GitHub-এ আপলোড করুন
1. [github.com](https://github.com)-এ লগইন করে একটি নতুন Repository তৈরি করুন (যেমন: `pdf-bondhu-app`)।
2. Unzip করা সব ফাইল এবং ফোল্ডার (বিশেষ করে `android/` এবং `.github/` ফোল্ডারসহ) ওই Repository-তে আপলোড/Push করুন।

### ধাপ ৩: ২ মিনিটে `PDF-Bondhu.apk` ডাউনলোড করুন
1. আপনার GitHub Repository-র উপরের **Actions** ট্যাবে ক্লিক করুন।
2. **Build PDF Bondhu APK** workflow-টি নিজে থেকেই চলতে শুরু করবে (অথবা **Run workflow** বাটনে ক্লিক করুন)।
3. ২–৩ মিনিট পর সবুজ টিক (✓) এলে, নিচে **Artifacts** সেকশনে **`PDF-Bondhu-APK`** অথবা ডানপাশের **Releases** সেকশনে সরাসরি **`PDF-Bondhu.apk`** ডাউনলোড লিংক পেয়ে যাবেন।
4. ফাইলটি ফোনে ইনস্টল করুন এবং WhatsApp / Telegram-এ সবার সাথে শেয়ার করুন!

---

## অটো-আপডেট কীভাবে কাজ করে?
- এই APK-টি সরাসরি আপনার লাইভ Published URL (`https://ais-pre-djeap3venq5kotpetnutp7-304175076052.asia-southeast1.run.app`) লোড করে।
- অ্যাপের ভেতরে **Network-First Service Worker + Offline Cache** যুক্ত করা আছে। তাই ইন্টারনেট থাকলে এটি প্রতিবার নতুন Published আপডেট লোড করবে, আর ইন্টারনেট না থাকলে অফলাইন ক্যাশ থেকেই সব PDF / Image / Excel টুল চলবে।
- ক্যামেরা স্ক্যানার (`Scan to PDF`) এবং সব ফাইল ডাউনলোড (`Downloads/PDF Bondhu/` ফোল্ডারে) সম্পূর্ণ নেটিভভাবে কাজ করবে।
