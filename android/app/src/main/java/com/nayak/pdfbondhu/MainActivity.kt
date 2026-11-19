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
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splashOverlay: LinearLayout
    private lateinit var offlineOverlay: LinearLayout
    private lateinit var retryButton: Button

    private val ioExecutor = Executors.newSingleThreadExecutor()

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingChooserParams: WebChromeClient.FileChooserParams? = null
    private var cameraPhotoUri: Uri? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var hasLoadedOnce = false
    private var lastBackPressedMs = 0L

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

        webView = findViewById(R.id.webView)
        splashOverlay = findViewById(R.id.splashOverlay)
        offlineOverlay = findViewById(R.id.offlineOverlay)
        retryButton = findViewById(R.id.retryButton)

        retryButton.setOnClickListener {
            offlineOverlay.visibility = View.GONE
            splashOverlay.visibility = View.VISIBLE
            loadAppUrl()
        }

        configureWebView()
        setupBackNavigation()
        loadAppUrl()
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
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val targetHost = Uri.parse(BuildConfig.APP_URL).host
                val scheme = uri.scheme?.lowercase() ?: ""

                if (scheme == "http" || scheme == "https") {
                    if (uri.host == targetHost) {
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
    }

    override fun onDestroy() {
        ioExecutor.shutdownNow()
        webView.destroy()
        super.onDestroy()
    }
}
