package com.nayak.pdfbondhu

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.AlarmClock
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splashOverlay: LinearLayout
    private lateinit var offlineOverlay: LinearLayout
    private lateinit var retryButton: Button
    private lateinit var assetLoader: WebViewAssetLoader

    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val otaDir: File by lazy { File(filesDir, "ota_www").apply { mkdirs() } }
    private val externalDocDir: File by lazy { File(cacheDir, "external_doc").apply { mkdirs() } }
    private val adManager: OneoraAdManager by lazy { OneoraAdManager(this) }
    private val billingManager: OneoraBillingManager by lazy { OneoraBillingManager(this) }

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingChooserParams: WebChromeClient.FileChooserParams? = null
    private var cameraPhotoUri: Uri? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var hasLoadedOnce = false
    private var lastBackPressedMs = 0L
    private var lastOtaCheckMs = 0L
    private var otaUpdatePendingApply = false
    @Volatile private var pendingExternalDocUrl: String? = null
    @Volatile private var pendingExternalDocName: String? = null
    @Volatile private var pendingExternalDocMime: String? = null
    @Volatile private var pendingExternalMultiDocsJson: String? = null
    @Volatile private var pendingShortcutTool: String? = null
    private var isFlashlightOn = false
    private val adManager: OneoraAdManager by lazy { OneoraAdManager(this) }
    private val billingManager: OneoraBillingManager by lazy { OneoraBillingManager(this) }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ -> }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback
            filePathCallback = null
            if (callback == null) return@registerForActivityResult

            if (result.resultCode != Activity.RESULT_OK) {
                cameraPhotoUri = null
                callback.onReceiveValue(null)
                return@registerForActivityResult
            }

            val data = result.data
            val uris = mutableListOf<Uri>()

            val clipData = data?.clipData
            if (clipData != null && clipData.itemCount > 0) {
                for (i in 0 until clipData.itemCount) {
                    clipData.getItemAt(i)?.uri?.let { uris.add(it) }
                }
            } else if (data?.data != null) {
                uris.add(data.data!!)
            } else if (cameraPhotoUri != null) {
                uris.add(cameraPhotoUri!!)
            }

            cameraPhotoUri = null
            if (uris.isNotEmpty()) {
                callback.onReceiveValue(uris.toTypedArray())
            } else {
                callback.onReceiveValue(null)
            }
        }

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val webReq = pendingWebPermissionRequest
            if (webReq != null) {
                pendingWebPermissionRequest = null
                if (granted) {
                    webReq.grant(webReq.resources)
                } else {
                    webReq.deny()
                }
                return@registerForActivityResult
            }

            val params = pendingChooserParams
            if (params != null && filePathCallback != null) {
                pendingChooserParams = null
                launchFileAndCameraChooser(params, allowCamera = granted)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val rootContainer = findViewById<View>(R.id.rootContainer)
        ViewCompat.setOnApplyWindowInsetsListener(rootContainer) { view, windowInsets ->
            val insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()
            )
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom)
            windowInsets
        }

        webView = findViewById(R.id.webView)
        splashOverlay = findViewById(R.id.splashOverlay)
        offlineOverlay = findViewById(R.id.offlineOverlay)
        retryButton = findViewById(R.id.retryButton)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", LocalAndOtaPathHandler())
            .build()

        retryButton.setOnClickListener {
            offlineOverlay.visibility = View.GONE
            splashOverlay.visibility = View.VISIBLE
            loadAppUrl()
        }

        // If user installed a newer APK build, clear any stale OTA cache so new bundled assets load immediately
        val otaPrefs = getSharedPreferences("pdf_bondhu_ota", Context.MODE_PRIVATE)
        if (otaPrefs.getInt("bundled_version_code", -1) != BuildConfig.VERSION_CODE) {
            runCatching {
                otaDir.listFiles()?.forEach { it.delete() }
            }
            otaPrefs.edit()
                .remove("ota_hash")
                .putInt("bundled_version_code", BuildConfig.VERSION_CODE)
                .apply()
        }

        configureWebView()
        setupBackNavigation()
        requestNotificationPermissionIfNeeded()
        handleIncomingDocumentIntent(intent)
        loadAppUrl()
        checkForOtaUpdateAsync(manualTrigger = false)
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingDocumentIntent(intent)
    }

    private fun inferMimeFromExtension(name: String): String {
        val lower = name.lowercase()
        return when {
            lower.endsWith(".pdf") -> "application/pdf"
            lower.endsWith(".docx") -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            lower.endsWith(".doc") -> "application/msword"
            lower.endsWith(".rtf") -> "application/rtf"
            lower.endsWith(".xlsx") -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            lower.endsWith(".xls") -> "application/vnd.ms-excel"
            lower.endsWith(".csv") -> "text/csv"
            lower.endsWith(".ods") -> "application/vnd.oasis.opendocument.spreadsheet"
            lower.endsWith(".pptx") -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            lower.endsWith(".ppt") -> "application/vnd.ms-powerpoint"
            lower.endsWith(".txt") -> "text/plain"
            lower.endsWith(".zip") -> "application/zip"
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".webp") -> "image/webp"
            lower.endsWith(".gif") -> "image/gif"
            lower.endsWith(".bmp") -> "image/bmp"
            else -> "application/octet-stream"
        }
    }

    private fun inferExtensionFromMime(mime: String?): String {
        return when (mime?.lowercase()?.substringBefore(';')?.trim()) {
            "application/pdf" -> "pdf"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx"
            "application/msword" -> "doc"
            "application/rtf", "text/rtf" -> "rtf"
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> "xlsx"
            "application/vnd.ms-excel" -> "xls"
            "text/csv", "text/comma-separated-values" -> "csv"
            "application/vnd.oasis.opendocument.spreadsheet" -> "ods"
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> "pptx"
            "application/vnd.ms-powerpoint" -> "ppt"
            "text/plain" -> "txt"
            "application/zip", "application/x-zip-compressed" -> "zip"
            "image/jpeg", "image/jpg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "image/gif" -> "gif"
            "image/bmp" -> "bmp"
            else -> "bin"
        }
    }

    private fun handleIncomingDocumentIntent(incoming: Intent?) {
        if (incoming == null) return
        val action = incoming.action ?: return

        // Handle native Home Screen App Shortcut
        val shortcutTool = incoming.getStringExtra("shortcut_tool")
        if (!shortcutTool.isNullOrBlank()) {
            pendingShortcutTool = shortcutTool
            if (hasLoadedOnce) {
                dispatchPendingShortcutToWeb()
            }
            return
        }

        // Handle Multi-File Share (e.g. multiple photos from Gallery / WhatsApp -> Instant PDF)
        if (action == Intent.ACTION_SEND_MULTIPLE) {
            val uris = mutableListOf<Uri>()
            @Suppress("DEPRECATION")
            val listExtra = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                incoming.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
            } else {
                incoming.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
            }
            if (listExtra != null) uris.addAll(listExtra)
            if (uris.isEmpty()) {
                val clip = incoming.clipData
                if (clip != null) {
                    for (i in 0 until clip.itemCount) {
                        clip.getItemAt(i)?.uri?.let { uris.add(it) }
                    }
                }
            }
            if (uris.isEmpty()) return

            ioExecutor.execute {
                runCatching {
                    externalDocDir.listFiles()?.forEach { it.delete() }
                    val arr = JSONArray()
                    val stamp = System.currentTimeMillis()
                    uris.take(40).forEachIndexed { idx, uri ->
                        val resolvedMime = runCatching { contentResolver.getType(uri) }.getOrNull()
                            ?.takeIf { it.isNotBlank() && it != "*/*" && it != "application/octet-stream" }
                        val fallbackExt = inferExtensionFromMime(resolvedMime)
                        val displayName = queryDisplayName(uri) ?: "File_${idx + 1}.$fallbackExt"
                        val finalMime = resolvedMime ?: inferMimeFromExtension(displayName)
                        val safeExt = displayName.substringAfterLast('.', fallbackExt)
                            .lowercase()
                            .replace(Regex("[^a-z0-9]"), "")
                            .take(8)
                            .ifBlank { fallbackExt }
                        val token = "multi_${stamp}_${idx}.$safeExt"
                        val destFile = File(externalDocDir, token)
                        contentResolver.openInputStream(uri)?.use { input ->
                            FileOutputStream(destFile).use { output ->
                                input.copyTo(output)
                                output.flush()
                            }
                        }
                        if (destFile.exists() && destFile.length() > 0L) {
                            arr.put(
                                JSONObject()
                                    .put("url", "./__external_doc__/$token")
                                    .put("name", displayName)
                                    .put("mime", finalMime)
                            )
                        }
                    }
                    if (arr.length() == 0) return@runCatching
                    if (arr.length() == 1) {
                        val single = arr.getJSONObject(0)
                        pendingExternalDocUrl = single.getString("url")
                        pendingExternalDocName = single.getString("name")
                        pendingExternalDocMime = single.getString("mime")
                        runOnUiThread { if (hasLoadedOnce) dispatchPendingExternalDocToWeb() }
                    } else {
                        pendingExternalMultiDocsJson = arr.toString()
                        runOnUiThread { if (hasLoadedOnce) dispatchPendingExternalMultiDocsToWeb() }
                    }
                }.onFailure {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Could not read shared files.", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            return
        }

        val uri: Uri? = when (action) {
            Intent.ACTION_VIEW -> incoming.data
            Intent.ACTION_SEND -> {
                @Suppress("DEPRECATION")
                val streamUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    incoming.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    incoming.getParcelableExtra(Intent.EXTRA_STREAM)
                }
                streamUri ?: incoming.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.uri
            }
            else -> null
        }
        if (uri == null) return

        val resolvedMime = runCatching { contentResolver.getType(uri) }.getOrNull()
            ?.takeIf { it.isNotBlank() && it != "*/*" && it != "application/octet-stream" }
            ?: incoming.type?.takeIf { it.isNotBlank() && it != "*/*" }
        val rawName = queryDisplayName(uri)
        val fallbackExt = inferExtensionFromMime(resolvedMime)
        val displayName = rawName ?: "Document.$fallbackExt"
        val finalMime = resolvedMime ?: inferMimeFromExtension(displayName)
        val safeExt = displayName.substringAfterLast('.', fallbackExt)
            .lowercase()
            .replace(Regex("[^a-z0-9]"), "")
            .take(8)
            .ifBlank { fallbackExt }

        ioExecutor.execute {
            runCatching {
                externalDocDir.listFiles()?.forEach { it.delete() }
                val token = "opened_${System.currentTimeMillis()}.$safeExt"
                val destFile = File(externalDocDir, token)
                contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(destFile).use { output ->
                        input.copyTo(output)
                        output.flush()
                    }
                } ?: return@runCatching

                if (!destFile.exists() || destFile.length() <= 0L) return@runCatching

                pendingExternalDocUrl = "./__external_doc__/$token"
                pendingExternalDocName = displayName
                pendingExternalDocMime = finalMime

                runOnUiThread {
                    if (hasLoadedOnce) {
                        dispatchPendingExternalDocToWeb()
                    }
                }
            }.onFailure {
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Could not read selected document file.",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }
    }

    private fun dispatchPendingExternalDocToWeb() {
        val url = pendingExternalDocUrl ?: return
        val name = pendingExternalDocName ?: "Document"
        val mime = pendingExternalDocMime ?: inferMimeFromExtension(name)
        val qUrl = JSONObject.quote(url)
        val qName = JSONObject.quote(name)
        val qMime = JSONObject.quote(mime)
        webView.evaluateJavascript(
            "(function(){ if (window.openExternalDocFromAndroid) { window.openExternalDocFromAndroid($qUrl, $qName, $qMime); } else if (window.openExternalPdfFromAndroid) { window.openExternalPdfFromAndroid($qUrl, $qName); } })();",
            null
        )
    }

    private fun dispatchPendingExternalMultiDocsToWeb() {
        val json = pendingExternalMultiDocsJson ?: return
        val qJson = JSONObject.quote(json)
        webView.evaluateJavascript(
            "window.openExternalMultiDocsFromAndroid && window.openExternalMultiDocsFromAndroid($qJson);",
            null
        )
    }

    private fun dispatchPendingShortcutToWeb() {
        val tool = pendingShortcutTool ?: return
        val qTool = JSONObject.quote(tool)
        webView.evaluateJavascript(
            "window.openPdfBondhuTool && window.openPdfBondhuTool($qTool);",
            null
        )
    }

    private fun queryDisplayName(uri: Uri): String? {
        runCatching {
            contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0) {
                        val name = cursor.getString(idx)
                        if (!name.isNullOrBlank()) return name
                    }
                }
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/')?.takeIf { it.isNotBlank() }
    }

    override fun onResume() {
        super.onResume()
        val now = System.currentTimeMillis()
        if (hasLoadedOnce && now - lastOtaCheckMs > 120_000L) {
            checkForOtaUpdateAsync(manualTrigger = false)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        settings.userAgentString = "${settings.userAgentString} ONEORAAndroid/${BuildConfig.VERSION_NAME} PDFBondhuAndroid/${BuildConfig.VERSION_NAME}"

        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                return assetLoader.shouldInterceptRequest(url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val targetHost = Uri.parse(BuildConfig.APP_URL).host
                val scheme = uri.scheme?.lowercase() ?: ""

                if (scheme == "http" || scheme == "https") {
                    if (uri.host == WebViewAssetLoader.DEFAULT_DOMAIN || uri.host == targetHost) {
                        return false
                    }
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    return true
                }

                if (scheme == "mailto" || scheme == "tel" || scheme == "whatsapp") {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    return true
                }
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                hasLoadedOnce = true
                splashOverlay.animate()
                    .alpha(0f)
                    .setDuration(180)
                    .withEndAction {
                        splashOverlay.visibility = View.GONE
                        splashOverlay.alpha = 1f
                    }
                    .start()
                if (otaUpdatePendingApply) {
                    webView.evaluateJavascript(
                        "window.onPdfBondhuUpdateReady && window.onPdfBondhuUpdateReady();",
                        null
                    )
                }
                dispatchPendingExternalDocToWeb()
                dispatchPendingExternalMultiDocsToWeb()
                dispatchPendingShortcutToWeb()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true && !hasLoadedOnce) {
                    splashOverlay.visibility = View.GONE
                    offlineOverlay.visibility = View.VISIBLE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                if (fileChooserParams == null) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }

                val acceptsImages = fileChooserParams.acceptTypes.any {
                    it.contains("image", ignoreCase = true) || it == "*/*" || it.isBlank()
                }
                val wantsCamera = fileChooserParams.isCaptureEnabled || acceptsImages

                if (wantsCamera && !hasCameraPermission()) {
                    pendingChooserParams = fileChooserParams
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    return true
                }

                launchFileAndCameraChooser(fileChooserParams, allowCamera = wantsCamera && hasCameraPermission())
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                runOnUiThread {
                    val needsCamera = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                    if (needsCamera && !hasCameraPermission()) {
                        pendingWebPermissionRequest = request
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    } else {
                        request.grant(request.resources)
                    }
                }
            }
        }

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            if (url.startsWith("http://") || url.startsWith("https://")) {
                runCatching {
                    val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
                    val request = DownloadManager.Request(Uri.parse(url)).apply {
                        setMimeType(mimeType)
                        addRequestHeader("User-Agent", userAgent)
                        setTitle(fileName)
                        setDescription("Downloading via PDF Bondhu")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "PDF Bondhu/$fileName")
                    }
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(request)
                    Toast.makeText(this, "Downloading $fileName...", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun loadAppUrl() {
        webView.settings.cacheMode = if (isNetworkAvailable()) {
            WebSettings.LOAD_DEFAULT
        } else {
            WebSettings.LOAD_CACHE_ELSE_NETWORK
        }
        webView.loadUrl(BuildConfig.APP_URL)
    }

    private fun checkForOtaUpdateAsync(manualTrigger: Boolean = false) {
        if (!isNetworkAvailable()) {
            if (manualTrigger) {
                notifyWebUpdateStatus("offline", "No internet connection. Working offline.")
            }
            return
        }
        lastOtaCheckMs = System.currentTimeMillis()

        ioExecutor.execute {
            runCatching {
                val repo = BuildConfig.GITHUB_REPO
                val stamp = System.currentTimeMillis()
                val primaryBase = "https://pdf-bondhu-v1.vercel.app"
                val repoParts = repo.split("/")
                val pagesBase = if (repoParts.size == 2 && repoParts[0].isNotBlank() && repoParts[1].isNotBlank()) {
                    "https://${repoParts[0]}.github.io/${repoParts[1]}"
                } else {
                    ""
                }
                val fallbackBase = if (repo.isNotBlank()) "https://raw.githubusercontent.com/$repo/main" else ""

                fun fetchSmart(webPath: String, githubPath: String): String? {
                    val primary = downloadText("$primaryBase/$webPath?t=$stamp")
                    if (!primary.isNullOrBlank()) return primary
                    if (pagesBase.isNotBlank()) {
                        val fromPages = downloadText("$pagesBase/$webPath?t=$stamp")
                        if (!fromPages.isNullOrBlank()) return fromPages
                    }
                    if (fallbackBase.isNotBlank()) {
                        return downloadText("$fallbackBase/$githubPath?t=$stamp")
                    }
                    return null
                }

                val remoteHtml = fetchSmart("index.html", "index.html")
                val remoteJs = fetchSmart("app.js", "public/app.js")

                if (remoteHtml.isNullOrBlank() || remoteJs.isNullOrBlank() ||
                    !(remoteHtml.contains("ONEORA") || remoteHtml.contains("PDF Bondhu")) || remoteJs.length < 5000
                ) {
                    if (manualTrigger) {
                        notifyWebUpdateStatus("error", "Could not reach update server. Try again in a moment.")
                    }
                    return@runCatching
                }

                val extraModules = mutableListOf(
                    "i18n.js",
                    "pdf-office-pro.js",
                    "daily-utilities.js",
                    "india-vault.js",
                    "oneora-design-system.css",
                    "oneora-planner.js",
                    "oneora-money.js",
                    "oneora-ai-extras.js",
                    "oneora-shell.js",
                    "oneora-onboarding.js",
                    "oneora-db.js",
                    "oneora-monetization.js",
                    "oneora-smarthub.js",
                    "oneora-companion.js",
                    "admob-service.js",
                    "vendor/pdf-lib.min.js",
                    "vendor/xlsx.full.min.js",
                    "vendor/jszip.min.js",
                    "vendor/mammoth.browser.min.js",
                    "vendor/jsQR.js",
                    "icon.svg",
                    "manifest.json",
                    "version.json"
                )
                // Also discover and sync any Vite-built /assets/*.js or /assets/*.css referenced in remoteHtml
                val assetRegex = Regex("""(?:src|href)=["']\.?/?(assets/[A-Za-z0-9._\-]+\.(?:js|css))["']""")
                assetRegex.findAll(remoteHtml).forEach { match ->
                    val assetPath = match.groupValues[1]
                    if (assetPath.isNotBlank() && !extraModules.contains(assetPath)) {
                        extraModules.add(assetPath)
                    }
                }
                val fetchedExtras = mutableMapOf<String, String>()
                for (mod in extraModules) {
                    val content = fetchSmart(mod, "public/$mod")
                    if (!content.isNullOrBlank()) {
                        fetchedExtras[mod] = content
                    }
                }

                val hashBuilder = StringBuilder("$remoteHtml\n---\n$remoteJs")
                for ((k, v) in fetchedExtras) {
                    hashBuilder.append("\n---$k---\n").append(v)
                }
                val remoteHash = sha256(hashBuilder.toString())
                val prefs = getSharedPreferences("pdf_bondhu_ota", Context.MODE_PRIVATE)
                val savedHash = prefs.getString("ota_hash", null) ?: computeBundledHash()

                if (remoteHash == savedHash) {
                    if (manualTrigger) {
                        if (otaUpdatePendingApply) {
                            otaUpdatePendingApply = false
                            runOnUiThread {
                                Toast.makeText(
                                    this@MainActivity,
                                    "Applying latest ONEORA update...",
                                    Toast.LENGTH_SHORT
                                ).show()
                                webView.clearCache(true)
                                webView.reload()
                            }
                        } else {
                            notifyWebUpdateStatus("uptodate", "ONEORA is already on the latest version!")
                        }
                    }
                    return@runCatching
                }

                val htmlTmp = File(otaDir, "index.html.tmp")
                val jsTmp = File(otaDir, "app.js.tmp")
                htmlTmp.writeText(remoteHtml, Charsets.UTF_8)
                jsTmp.writeText(remoteJs, Charsets.UTF_8)
                htmlTmp.renameTo(File(otaDir, "index.html"))
                jsTmp.renameTo(File(otaDir, "app.js"))

                for ((mod, content) in fetchedExtras) {
                    val targetMod = File(otaDir, mod)
                    targetMod.parentFile?.mkdirs()
                    val modTmp = File(otaDir, "$mod.tmp")
                    modTmp.parentFile?.mkdirs()
                    modTmp.writeText(content, Charsets.UTF_8)
                    modTmp.renameTo(targetMod)
                }

                prefs.edit().putString("ota_hash", remoteHash).apply()

                runOnUiThread {
                    if (manualTrigger) {
                        otaUpdatePendingApply = false
                        Toast.makeText(
                            this@MainActivity,
                            "Update installed! Refreshing PDF Bondhu...",
                            Toast.LENGTH_SHORT
                        ).show()
                        webView.clearCache(true)
                        webView.reload()
                    } else {
                        otaUpdatePendingApply = true
                        Toast.makeText(
                            this@MainActivity,
                            "New PDF Bondhu update ready! Tap Refresh.",
                            Toast.LENGTH_SHORT
                        ).show()
                        webView.evaluateJavascript(
                            "window.onPdfBondhuUpdateReady && window.onPdfBondhuUpdateReady();",
                            null
                        )
                    }
                }
            }.onFailure {
                if (manualTrigger) {
                    notifyWebUpdateStatus("error", "Update check failed. Please try again.")
                }
            }
        }
    }

    private fun notifyWebUpdateStatus(status: String, message: String) {
        val s = JSONObject.quote(status)
        val m = JSONObject.quote(message)
        runOnUiThread {
            webView.evaluateJavascript(
                "window.onPdfBondhuUpdateStatus && window.onPdfBondhuUpdateStatus($s, $m);",
                null
            )
        }
    }

    private fun computeBundledHash(): String {
        return runCatching {
            val bundledHtml = assets.open("www/index.html").bufferedReader(Charsets.UTF_8).use { it.readText() }
            val bundledJs = assets.open("www/app.js").bufferedReader(Charsets.UTF_8).use { it.readText() }
            val sb = StringBuilder("$bundledHtml\n---\n$bundledJs")
            val extras = listOf(
                "i18n.js",
                "pdf-office-pro.js",
                "daily-utilities.js",
                "india-vault.js",
                "oneora-design-system.css",
                "oneora-planner.js",
                "oneora-money.js",
                "oneora-ai-extras.js",
                "oneora-shell.js",
                "oneora-onboarding.js",
                "oneora-db.js",
                "oneora-monetization.js",
                "oneora-smarthub.js",
                "oneora-companion.js",
                "admob-service.js",
                "vendor/pdf-lib.min.js",
                "vendor/xlsx.full.min.js",
                "vendor/jszip.min.js",
                "vendor/mammoth.browser.min.js",
                "vendor/jsQR.js",
                "icon.svg",
                "manifest.json",
                "version.json"
            )
            for (mod in extras) {
                runCatching {
                    val txt = assets.open("www/$mod").bufferedReader(Charsets.UTF_8).use { it.readText() }
                    sb.append("\n---$mod---\n").append(txt)
                }
            }
            sha256(sb.toString())
        }.getOrDefault("")
    }

    private fun downloadText(urlString: String): String? {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(urlString).openConnection() as HttpURLConnection).apply {
                connectTimeout = 8000
                readTimeout = 12000
                requestMethod = "GET"
                setRequestProperty("Cache-Control", "no-cache")
            }
            if (conn.responseCode != HttpURLConnection.HTTP_OK) return null
            conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        } catch (_: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }

    private fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    private inner class LocalAndOtaPathHandler : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val cleanPath = path.trimStart('/').ifEmpty { "index.html" }
            if (cleanPath.contains("..")) return null

            // Stream externally opened phone documents (PDF, Word, Excel, PPT, CSV, TXT) directly from private cache
            if (cleanPath.startsWith("__external_doc__/") || cleanPath.startsWith("__external_pdf__/")) {
                val fileName = cleanPath
                    .removePrefix("__external_doc__/")
                    .removePrefix("__external_pdf__/")
                if (fileName.contains("/") || fileName.contains("\\") || fileName.isBlank()) return null
                val docFile = File(externalDocDir, fileName)
                if (docFile.exists() && docFile.isFile) {
                    val docHeaders = mapOf(
                        "Access-Control-Allow-Origin" to "*",
                        "Cache-Control" to "no-store"
                    )
                    val docMime = inferMimeFromExtension(fileName)
                    return runCatching {
                        WebResourceResponse(docMime, null, 200, "OK", docHeaders, FileInputStream(docFile))
                    }.getOrNull()
                }
                return null
            }

            val mimeType = when {
                cleanPath.endsWith(".html", true) -> "text/html"
                cleanPath.endsWith(".js", true) -> "application/javascript"
                cleanPath.endsWith(".css", true) -> "text/css"
                cleanPath.endsWith(".json", true) -> "application/json"
                cleanPath.endsWith(".svg", true) -> "image/svg+xml"
                cleanPath.endsWith(".png", true) -> "image/png"
                cleanPath.endsWith(".jpg", true) || cleanPath.endsWith(".jpeg", true) -> "image/jpeg"
                cleanPath.endsWith(".webp", true) -> "image/webp"
                cleanPath.endsWith(".ico", true) -> "image/x-icon"
                else -> "application/octet-stream"
            }
            val encoding = if (mimeType.startsWith("image/") && mimeType != "image/svg+xml") null else "UTF-8"
            val headers = mapOf(
                "Access-Control-Allow-Origin" to "*",
                "Cache-Control" to "no-cache"
            )

            val otaFile = File(otaDir, cleanPath)
            if (otaFile.exists() && otaFile.isFile) {
                return runCatching {
                    WebResourceResponse(mimeType, encoding, 200, "OK", headers, FileInputStream(otaFile))
                }.getOrNull()
            }

            return runCatching {
                val stream = assets.open("www/$cleanPath")
                WebResourceResponse(mimeType, encoding, 200, "OK", headers, stream)
            }.getOrNull()
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "(function(){ return typeof window.handleAndroidBackPress === 'function' ? window.handleAndroidBackPress() : false; })();"
                ) { result ->
                    if (result == "true") return@evaluateJavascript

                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        val now = System.currentTimeMillis()
                        if (now - lastBackPressedMs < 2000) {
                            finish()
                        } else {
                            lastBackPressedMs = now
                            Toast.makeText(
                                this@MainActivity,
                                getString(R.string.press_back_again),
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                }
            }
        })
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun launchFileAndCameraChooser(
        params: WebChromeClient.FileChooserParams,
        allowCamera: Boolean
    ) {
        val extraIntents = mutableListOf<Intent>()
        cameraPhotoUri = null

        if (allowCamera) {
            createCameraImageUri()?.let { uri ->
                cameraPhotoUri = uri
                val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                    putExtra(MediaStore.EXTRA_OUTPUT, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                }
                if (captureIntent.resolveActivity(packageManager) != null) {
                    extraIntents.add(captureIntent)
                }
            }
        }

        val contentIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            val validTypes = params.acceptTypes
                .flatMap { it.split(",") }
                .map { it.trim() }
                .filter { it.isNotEmpty() }

            if (validTypes.size == 1 && !validTypes[0].startsWith(".")) {
                type = validTypes[0]
            } else {
                type = "*/*"
                val mimeTypes = validTypes.mapNotNull { mapAcceptToMime(it) }.distinct()
                if (mimeTypes.isNotEmpty()) {
                    putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
                }
            }

            if (params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            }
        }

        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, contentIntent)
            putExtra(Intent.EXTRA_TITLE, "Select File or Capture")
            if (extraIntents.isNotEmpty()) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, extraIntents.toTypedArray())
            }
        }

        try {
            fileChooserLauncher.launch(chooserIntent)
        } catch (e: Exception) {
            filePathCallback?.onReceiveValue(null)
            filePathCallback = null
            Toast.makeText(this, "Could not open file picker", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mapAcceptToMime(raw: String): String? {
        return when (raw.lowercase()) {
            ".pdf" -> "application/pdf"
            ".doc" -> "application/msword"
            ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ".rtf" -> "application/rtf"
            ".txt" -> "text/plain"
            ".xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ".xls" -> "application/vnd.ms-excel"
            ".csv" -> "text/csv"
            ".ods" -> "application/vnd.oasis.opendocument.spreadsheet"
            ".ppt" -> "application/vnd.ms-powerpoint"
            ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            ".zip" -> "application/zip"
            ".jpg", ".jpeg" -> "image/jpeg"
            ".png" -> "image/png"
            ".webp" -> "image/webp"
            ".gif" -> "image/gif"
            ".bmp" -> "image/bmp"
            else -> if (raw.contains("/")) raw else null
        }
    }

    private fun createCameraImageUri(): Uri? {
        return runCatching {
            val dir = File(cacheDir, "captures").apply { mkdirs() }
            val imageFile = File(dir, "scan_${System.currentTimeMillis()}.jpg")
            FileProvider.getUriForFile(this, "${packageName}.fileprovider", imageFile)
        }.getOrNull()
    }

    inner class AndroidBridge {

        @JavascriptInterface
        fun isAndroidApp(): Boolean = true

        @JavascriptInterface
        fun getAppVersion(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun shareText(title: String, text: String) {
            runOnUiThread {
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(Intent.createChooser(sendIntent, title))
            }
        }

        @JavascriptInterface
        fun saveBase64File(base64Data: String, fileName: String, mimeType: String) {
            ioExecutor.execute {
                try {
                    val cleanBase64 = base64Data.substringAfter("base64,", base64Data)
                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val safeName = fileName.replace(Regex("[^a-zA-Z0-9._\\- ]"), "_")
                        .ifBlank { "PDF_Bondhu_${System.currentTimeMillis()}.pdf" }
                    val safeMime = mimeType.ifBlank { "application/octet-stream" }

                    val savedUri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val values = ContentValues().apply {
                            put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                            put(MediaStore.Downloads.MIME_TYPE, safeMime)
                            put(MediaStore.Downloads.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/PDF Bondhu")
                            put(MediaStore.Downloads.IS_PENDING, 1)
                        }
                        val resolver = contentResolver
                        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                        if (uri != null) {
                            resolver.openOutputStream(uri)?.use { out ->
                                out.write(bytes)
                                out.flush()
                            }
                            values.clear()
                            values.put(MediaStore.Downloads.IS_PENDING, 0)
                            resolver.update(uri, values, null, null)
                        }
                        uri
                    } else {
                        val baseDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        val folder = File(baseDir, "PDF Bondhu").apply { mkdirs() }
                        val outFile = File(folder, safeName)
                        FileOutputStream(outFile).use { it.write(bytes) }
                        FileProvider.getUriForFile(
                            this@MainActivity,
                            "${packageName}.fileprovider",
                            outFile
                        )
                    }

                    runOnUiThread {
                        Toast.makeText(
                            this@MainActivity,
                            "Saved to Downloads/PDF Bondhu/$safeName",
                            Toast.LENGTH_LONG
                        ).show()
                        val quoted = JSONObject.quote(safeName)
                        webView.evaluateJavascript(
                            "window.onAndroidDownloadSuccess && window.onAndroidDownloadSuccess($quoted);",
                            null
                        )
                        if (savedUri != null && safeMime == "application/pdf") {
                            val openIntent = Intent(Intent.ACTION_VIEW).apply {
                                setDataAndType(savedUri, safeMime)
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            if (openIntent.resolveActivity(packageManager) != null) {
                                // Keep download smooth without hijacking multi-file exports
                            }
                        }
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(
                            this@MainActivity,
                            "Save failed: ${e.localizedMessage ?: "Unknown error"}",
                            Toast.LENGTH_LONG
                        ).show()
                        val quotedErr = JSONObject.quote(e.localizedMessage ?: "Save failed")
                        webView.evaluateJavascript(
                            "window.onAndroidDownloadError && window.onAndroidDownloadError($quotedErr);",
                            null
                        )
                    }
                }
            }
        }

        @JavascriptInterface
        fun isBiometricAvailable(): Boolean {
            val bm = BiometricManager.from(this@MainActivity)
            val canAuth = bm.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_WEAK or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            return canAuth == BiometricManager.BIOMETRIC_SUCCESS
        }

        @JavascriptInterface
        fun authenticateBiometric(title: String, subtitle: String) {
            runOnUiThread {
                try {
                    val executor = ContextCompat.getMainExecutor(this@MainActivity)
                    val prompt = BiometricPrompt(
                        this@MainActivity,
                        executor,
                        object : BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                                webView.evaluateJavascript(
                                    "window.onAndroidBiometricResult && window.onAndroidBiometricResult(true, '');",
                                    null
                                )
                            }

                            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                                val quoted = JSONObject.quote(errString.toString())
                                webView.evaluateJavascript(
                                    "window.onAndroidBiometricResult && window.onAndroidBiometricResult(false, $quoted);",
                                    null
                                )
                            }

                            override fun onAuthenticationFailed() {
                                // Let user retry via system biometric sheet
                            }
                        }
                    )
                    val info = BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title.ifBlank { "Unlock Document Center" })
                        .setSubtitle(subtitle.ifBlank { "Verify your identity to access private files" })
                        .setAllowedAuthenticators(
                            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        )
                        .build()
                    prompt.authenticate(info)
                } catch (e: Exception) {
                    val quoted = JSONObject.quote(e.localizedMessage ?: "Biometric unavailable")
                    webView.evaluateJavascript(
                        "window.onAndroidBiometricResult && window.onAndroidBiometricResult(false, $quoted);",
                        null
                    )
                }
            }
        }

        @JavascriptInterface
        fun shareBase64File(base64Data: String, fileName: String, mimeType: String) {
            ioExecutor.execute {
                try {
                    val cleanBase64 = base64Data.substringAfter("base64,", base64Data)
                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val safeName = fileName.replace(Regex("[^a-zA-Z0-9._\\- ]"), "_")
                        .ifBlank { "PDF_Bondhu_Share.pdf" }
                    val safeMime = mimeType.ifBlank { "application/octet-stream" }
                    val shareDir = File(cacheDir, "captures").apply { mkdirs() }
                    val outFile = File(shareDir, safeName)
                    FileOutputStream(outFile).use { it.write(bytes) }

                    val uri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "${packageName}.fileprovider",
                        outFile
                    )

                    runOnUiThread {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = safeMime
                            putExtra(Intent.EXTRA_STREAM, uri)
                            putExtra(Intent.EXTRA_SUBJECT, safeName)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        startActivity(Intent.createChooser(shareIntent, "Share via PDF Bondhu"))
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(
                            this@MainActivity,
                            "Share failed: ${e.localizedMessage ?: "Unknown error"}",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
        }

        @JavascriptInterface
        fun checkForUpdateNow() {
            checkForOtaUpdateAsync(manualTrigger = true)
        }

        @JavascriptInterface
        fun reloadApp() {
            otaUpdatePendingApply = false
            runOnUiThread {
                webView.clearCache(true)
                webView.reload()
            }
        }

        @JavascriptInterface
        fun getPendingExternalDoc(): String {
            val url = pendingExternalDocUrl ?: return ""
            val name = pendingExternalDocName ?: "Document"
            val mime = pendingExternalDocMime ?: inferMimeFromExtension(name)
            pendingExternalDocUrl = null
            pendingExternalDocName = null
            pendingExternalDocMime = null
            return JSONObject().put("url", url).put("name", name).put("mime", mime).toString()
        }

        @JavascriptInterface
        fun getPendingExternalPdf(): String {
            return getPendingExternalDoc()
        }

        @JavascriptInterface
        fun getPendingExternalMultiDocs(): String {
            val json = pendingExternalMultiDocsJson ?: return ""
            pendingExternalMultiDocsJson = null
            return json
        }

        @JavascriptInterface
        fun getPendingShortcutTool(): String {
            val tool = pendingShortcutTool ?: return ""
            pendingShortcutTool = null
            return tool
        }

        @JavascriptInterface
        fun printDocument(jobName: String) {
            runOnUiThread {
                runCatching {
                    val pm = getSystemService(Context.PRINT_SERVICE) as PrintManager
                    val cleanJob = jobName.ifBlank { "PDF Bondhu Document" }
                    val adapter = webView.createPrintDocumentAdapter(cleanJob)
                    pm.print(cleanJob, adapter, PrintAttributes.Builder().build())
                }.onFailure {
                    Toast.makeText(this@MainActivity, "Print service unavailable on this device.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun openPlayStorePage() {
            runOnUiThread {
                val pkg = packageName
                val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg"))
                runCatching {
                    startActivity(marketIntent)
                }.onFailure {
                    runCatching {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$pkg")))
                    }
                }
            }
        }

        @JavascriptInterface
        fun scheduleReminder(id: String, title: String, body: String, triggerAtMillis: Long, repeat: String) {
            runCatching {
                ReminderReceiver.scheduleReminder(
                    this@MainActivity,
                    id.ifBlank { "rem_${System.currentTimeMillis()}" },
                    title.ifBlank { "ONEORA Reminder" },
                    body.ifBlank { "Scheduled reminder from ONEORA" },
                    triggerAtMillis,
                    repeat.ifBlank { "none" }
                )
            }
        }

        @JavascriptInterface
        fun cancelReminder(id: String) {
            if (id.isBlank()) return
            runCatching {
                ReminderReceiver.cancelReminder(this@MainActivity, id)
            }
        }

        @JavascriptInterface
        fun toggleFlashlight(): Boolean {
            return runCatching {
                val cm = getSystemService(Context.CAMERA_SERVICE) as CameraManager
                val cameraId = cm.cameraIdList.firstOrNull { cid ->
                    val chars = cm.getCameraCharacteristics(cid)
                    chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                } ?: return false
                val nextState = !isFlashlightOn
                cm.setTorchMode(cameraId, nextState)
                isFlashlightOn = nextState
                nextState
            }.getOrDefault(false)
        }

        @JavascriptInterface
        fun openSystemAlarm() {
            runOnUiThread {
                val intent = Intent(AlarmClock.ACTION_SHOW_ALARMS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runCatching {
                    startActivity(intent)
                }.onFailure {
                    Toast.makeText(this@MainActivity, "Clock app unavailable on this device.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun getMonetizationStatusJson(): String {
            return billingManager.getStatusJson()
        }

        @JavascriptInterface
        fun setAdSafeZone(active: Boolean, zoneName: String) {
            adManager.setSafeZone(active, zoneName)
        }

        @JavascriptInterface
        fun hideBannerAd() {
            adManager.hideBanner()
        }

        @JavascriptInterface
        fun updateAdConsent(allowPersonalized: Boolean) {
            adManager.setPersonalizedConsent(allowPersonalized)
        }

        @JavascriptInterface
        fun requestAdPlacement(slotType: String, zoneName: String): String {
            return adManager.requestPlacement(slotType, zoneName).toString()
        }

        @JavascriptInterface
        fun requestPlayPurchase(productId: String): String {
            return billingManager.requestPurchase(productId)
        }

        @JavascriptInterface
        fun restorePlayPurchases(): String {
            return billingManager.restorePurchases()
        }
    }

    override fun onDestroy() {
        runCatching {
            val captureDir = File(cacheDir, "captures")
            if (captureDir.exists()) captureDir.deleteRecursively()
            if (externalDocDir.exists()) externalDocDir.deleteRecursively()
        }
        ioExecutor.shutdownNow()
        webView.destroy()
        super.onDestroy()
    }
}
