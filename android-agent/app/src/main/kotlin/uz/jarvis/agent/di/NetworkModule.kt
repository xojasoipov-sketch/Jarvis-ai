package uz.jarvis.agent.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import uz.jarvis.agent.BuildConfig
import uz.jarvis.agent.data.api.JarvisApiService
import uz.jarvis.agent.data.storage.SecureTokenStore
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG)
                HttpLoggingInterceptor.Level.BODY
            else
                HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(
        store: SecureTokenStore,
        json: Json,
        okHttpClient: OkHttpClient,
    ): JarvisApiService {
        // Base URL is read dynamically from the store on each request via the interceptor.
        // We use a placeholder URL here; actual requests are routed via DynamicUrlInterceptor.
        val dynamicClient = okHttpClient.newBuilder()
            .addInterceptor { chain ->
                val serverUrl = runBlocking { store.serverUrl.first() }
                    ?: "https://example.com" // fallback if not paired yet
                val baseUrl = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
                val original = chain.request()
                val newUrl = original.url.toString()
                    .replace("https://example.com/", baseUrl)
                chain.proceed(original.newBuilder().url(newUrl).build())
            }
            .build()

        return Retrofit.Builder()
            .baseUrl("https://example.com/")
            .client(dynamicClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(JarvisApiService::class.java)
    }
}
