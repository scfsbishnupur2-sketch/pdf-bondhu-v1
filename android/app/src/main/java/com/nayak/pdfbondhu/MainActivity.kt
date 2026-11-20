package com.nayak.pdfbondhu

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
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

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingChooserParams: WebChromeClient.FileChooserParams? = null
    private var cameraPhotoUri: Uri? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var hasLoadedOnce = false
    private var lastBackPressedMs = 0L
    private var lastOtaCheckMs = 0L
    private var otaUpdatePendingApply = false

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
        loadAppUrl()
        checkForOtaUpdateAsync(manualTrigger = false)
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
        settings.userAgentString = "${settings.userAgentString} PDFBondhuAndroid/${BuildConfig.VERSION_NAME}"

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
                val fallbackBase = if (repo.isNotBlank()) "https://raw.githubusercontent.com/$repo/main" else ""

                fun fetchSmart(vercelPath: String, githubPath: String): String? {
                    val primary = downloadText("$primaryBase/$vercelPath?t=$stamp")
                    if (!primary.isNullOrBlank()) return primary
                    if (fallbackBase.isNotBlank()) {
                        return downloadText("$fallbackBase/$githubPath?t=$stamp")
                    }
                    return null
                }

                val remoteHtml = fetchSmart("index.html", "index.html")
                val remoteJs = fetchSmart("app.js", "public/app.js")

                if (remoteHtml.isNullOrBlank() || remoteJs.isNullOrBlank() ||
                    !remoteHtml.contains("PDF Bondhu") || remoteJs.length < 5000
                ) {
                    if (manualTrigger) {
                        notifyWebUpdateStatus("error", "Could not reach update server. Try again in a moment.")
                    }
                    return@runCatching
                }

                val extraModules = listOf(
                    "i18n.js",
                    "pdf-office-pro.js",
                    "daily-utilities.js",
                    "india-vault.js",
                    "admob-service.js",
                    "icon.svg",
                    "manifest.json",
                    "version.json"
                )
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
                                    "Applying latest PDF Bondhu update...",
                                    Toast.LENGTH_SHORT
                                ).show()
                                webView.clearCache(true)
                                webView.reload()
                            }
                        } else {
                            notifyWebUpdateStatus("uptodate", "PDF Bondhu is already on the latest version!")
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
                    val modTmp = File(otaDir, "$mod.tmp")
                    modTmp.writeText(content, Charsets.UTF_8)
                    modTmp.renameTo(File(otaDir, mod))
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
                "admob-service.js",
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
            ".xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ".xls" -> "application/vnd.ms-excel"
            ".csv" -> "text/csv"
            ".jpg", ".jpeg" -> "image/jpeg"
            ".png" -> "image/png"
            ".webp" -> "image/webp"
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
    }

    override fun onDestroy() {
        runCatching {
            val captureDir = File(cacheDir, "captures")
            if (captureDir.exists()) captureDir.deleteRecursively()
        }
        ioExecutor.shutdownNow()
        webView.destroy()
        super.onDestroy()
    }
}
