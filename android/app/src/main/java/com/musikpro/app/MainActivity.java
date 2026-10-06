package com.musikpro.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MusikProDownload";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        installBackNavigation();
        installDownloadListener();
    }

    // Bouton / geste « Retour » d'Android : revient d'abord en arrière dans les pages du site (historique de la
    // WebView) au lieu de fermer l'application. Capacitor ne le fait plus depuis la version 4 sans le plugin
    // @capacitor/app, que nous n'embarquons pas. Quand il n'y a plus de page précédente, on rend la main à
    // Android (comportement normal : l'application passe en arrière-plan).
    private void installBackNavigation() {
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack();
                        return;
                    }
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        );
    }

    // La WebView n'enregistre ni un lien « blob: » ni une réponse « attachment » sans DownloadListener (Capacitor
    // n'en installe aucun). Le site renvoie le MP3 d'une chanson avec Content-Disposition: attachment
    // (GET /api/songs/download) : on le confie au DownloadManager d'Android, qui l'enregistre dans « Téléchargements »
    // et affiche sa notification. Seuls les téléchargements https du domaine de l'application sont acceptés.
    private void installDownloadListener() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                Uri uri = Uri.parse(url);
                Uri page = Uri.parse(String.valueOf(webView.getUrl()));
                boolean sameApp = "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getHost().equals(page.getHost());
                if (!sameApp) {
                    Log.w(TAG, "Téléchargement refusé : domaine non autorisé");
                    return;
                }
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                DownloadManager.Request request = new DownloadManager.Request(uri);
                if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
                String cookies = CookieManager.getInstance().getCookie(url);
                if (cookies != null) request.addRequestHeader("Cookie", cookies);
                if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                request.setTitle(fileName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (manager != null) manager.enqueue(request);
            } catch (Exception error) {
                Log.e(TAG, "Téléchargement impossible", error);
            }
        });
    }
}
