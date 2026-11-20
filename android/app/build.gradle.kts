plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val configuredAppUrl: String = (project.findProperty("APP_URL") as? String)
    ?.takeIf { it.isNotBlank() }
    ?: "https://appassets.androidplatform.net/index.html"

val configuredGithubRepo: String = (project.findProperty("GITHUB_REPO") as? String)
    ?.takeIf { it.isNotBlank() }
    ?: "scfsbishnupur2-sketch/pdf-bondhu-v1"

android {
    namespace = "com.nayak.pdfbondhu"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.nayak.pdfbondhu"
        minSdk = 24
        targetSdk = 35
        versionCode = 3
        versionName = "2.0.0"

        buildConfigField("String", "APP_URL", "\"$configuredAppUrl\"")
        buildConfigField("String", "GITHUB_REPO", "\"$configuredGithubRepo\"")
    }

    signingConfigs {
        val keystorePath = System.getenv("KEYSTORE_PATH")
        if (!keystorePath.isNullOrBlank() && file(keystorePath).exists()) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "pdfbondhu123"
                keyAlias = System.getenv("KEY_ALIAS") ?: "pdfbondhu"
                keyPassword = System.getenv("KEY_PASSWORD") ?: "pdfbondhu123"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val releaseConfig = signingConfigs.findByName("release")
            signingConfig = releaseConfig ?: signingConfigs.getByName("debug")
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.biometric:biometric:1.1.0")
}
