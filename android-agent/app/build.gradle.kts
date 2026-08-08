plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.kotlin.serialization)
    kotlin("kapt")
}

android {
    namespace = "uz.jarvis.agent"
    compileSdk = 35

    defaultConfig {
        applicationId = "uz.jarvis.agent"
        minSdk = 26
        targetSdk = 35
        // CI har buildda o'suvchi raqam beradi (GitHub run number) — avtomatik
        // yangilanish shu raqamni solishtirib yangi versiyani aniqlaydi.
        val ciVersion = (System.getenv("JARVIS_VERSION_CODE") ?: "1").toInt()
        versionCode = ciVersion
        versionName = "1.0.$ciVersion"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Auto-connect: server manzili va maxfiy kalit build vaqtida ilova ichiga yoziladi
        // (CI'da GitHub Actions secrets orqali, lokal buildda env var orqali).
        // Bo'sh bo'lsa, ilova pairlanmaydi va Sozlamalar orqali qo'lda QR bilan ulash kerak bo'ladi.
        val serverUrl = (System.getenv("JARVIS_SERVER_URL") ?: project.findProperty("jarvisServerUrl") as String? ?: "").trim()
        val autoPairKey = (System.getenv("JARVIS_AUTO_PAIR_KEY") ?: project.findProperty("jarvisAutoPairKey") as String? ?: "").trim()
        buildConfigField("String", "SERVER_URL", "\"$serverUrl\"")
        buildConfigField("String", "AUTO_PAIR_KEY", "\"$autoPairKey\"")
    }

    // MUHIM: debug.keystore repoga qo'shilgan (app/debug.keystore) — Gradle'ning
    // standart implicit debug keystore'i har CI runner'da (yoki har lokal
    // mashinada ~/.android/debug.keystore bo'lmasa) TASODIFIY yangi kalit bilan
    // yaratiladi. Bu degani: keshlanmagan CI'da har build boshqa imzoda chiqadi,
    // Android buni "boshqa ilova" deb hisoblaydi — o'rnatish uchun eskisini
    // o'chirish kerak bo'ladi, bu esa pairing sessiyasini va barcha berilgan
    // ruxsatlarni (batareya, overlay, autostart) yo'qqa chiqaradi. Shu committed
    // keystore bilan barcha build'lar (lokal ham, CI ham) bir xil imzoda chiqadi
    // — yangi APK doim UPGRADE sifatida o'rnatiladi, hech narsa yo'qolmaydi.
    signingConfigs {
        create("debugStable") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
            applicationIdSuffix = ".debug"
            signingConfig = signingConfigs.getByName("debugStable")
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
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    // Hilt DI
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)
    kapt(libs.hilt.work.compiler)

    // Network
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    // WorkManager
    implementation(libs.work.runtime.ktx)

    // Storage
    implementation(libs.datastore.preferences)
    implementation(libs.security.crypto)

    // Camera & QR
    implementation(libs.camera.core)
    implementation(libs.camera.camera2)
    implementation(libs.camera.lifecycle)
    implementation(libs.camera.view)
    implementation(libs.mlkit.barcode.scanning)

    // Permissions
    implementation(libs.accompanist.permissions)

    // Image loading
    implementation(libs.coil.compose)

    debugImplementation(libs.androidx.ui.tooling)
}

kapt {
    correctErrorTypes = true
}
