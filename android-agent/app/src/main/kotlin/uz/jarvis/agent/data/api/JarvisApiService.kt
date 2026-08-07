package uz.jarvis.agent.data.api

import uz.jarvis.agent.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface JarvisApiService {

    // Confirm pairing token → receive long-lived device_token
    @POST("api/devices/pair/confirm")
    suspend fun confirmPairing(
        @Body request: PairConfirmRequest
    ): Response<PairConfirmResponse>

    // Auto-pair on first launch — no QR/token exchange, just the built-in secret key
    @POST("api/devices/pair/auto")
    suspend fun autoPair(
        @Header("Authorization") bearerToken: String,
        @Body request: AutoPairRequest
    ): Response<PairConfirmResponse>

    // Heartbeat — keep device "online"
    @POST("api/devices/heartbeat")
    suspend fun heartbeat(
        @Header("Authorization") bearerToken: String,
        @Body request: HeartbeatRequest
    ): Response<HeartbeatResponse>

    // Poll for pending commands
    @GET("api/devices/poll")
    suspend fun pollCommands(
        @Header("Authorization") bearerToken: String,
        @Query("device_id") deviceId: String
    ): Response<PollResponse>

    // Post command result back
    @POST("api/devices/result")
    suspend fun postResult(
        @Header("Authorization") bearerToken: String,
        @Body request: CommandResultRequest
    ): Response<CommandResultResponse>

    // Revoke device session
    @POST("api/devices/revoke")
    suspend fun revokeDevice(
        @Header("Authorization") bearerToken: String,
        @Body body: Map<String, String>
    ): Response<Map<String, Boolean>>
}
