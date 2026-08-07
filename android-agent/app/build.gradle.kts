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
        versionCode = 1
        versionName = "1.0.0"

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
