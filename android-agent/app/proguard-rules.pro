# Retrofit + kotlinx.serialization
-keepattributes Signature
-keepattributes *Annotation*
-keep class uz.jarvis.agent.data.model.** { *; }
-keep class kotlinx.serialization.** { *; }
-dontwarn kotlinx.serialization.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Hilt
-keep class dagger.hilt.** { *; }
-keep @dagger.hilt.android.AndroidEntryPoint class * { *; }

# WorkManager
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.ListenableWorker
-keepclassmembers class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# ML Kit barcode
-keep class com.google.mlkit.** { *; }
