package com.tuan0410.portal;

import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "LichHocPortal")
public class LichHocPortalPlugin extends Plugin {
    private Dialog dialog;
    private WebView portal;
    private PluginCall pending;
    private TextView status;
    private Button readButton;
    private String host, target, reader;
    private JSONObject options;
    private int generation = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean navigationAllowed(String value) {
        if (value == null) return false;
        Uri u = Uri.parse(value);
        if (!"https".equals(u.getScheme()) || (u.getPort() != -1 && u.getPort() != 443)) return false;
        String h = u.getHost();
        return host.equals(h) || "accounts.google.com".equals(h) || "login.microsoftonline.com".equals(h) || "login.live.com".equals(h);
    }
    private boolean readable() {
        if (portal == null || portal.getUrl() == null) return false;
        Uri u = Uri.parse(portal.getUrl());
        if (!navigationAllowed(portal.getUrl()) || !host.equals(u.getHost())) return false;
        String p = u.getPath() == null ? "" : u.getPath(), mode = options.optString("mode");
        if ("portal.ut.edu.vn".equals(host)) return "week".equals(mode) && "/calendar".equals(p.replaceAll("/$", ""));
        return "exams".equals(mode) ? p.matches("(?i)/ExamSchedule/?") : p.matches("(?i).*(/WeeklyTimetable(/.*)?|/ScheduleOfWeek\\.aspx)");
    }
    @PluginMethod
    public void read(PluginCall call) {
        String school = call.getString("schoolId"), mode = call.getString("mode");
        if (pending != null) { call.reject("A school portal is already open."); return; }
        if (!("fpt-qn".equals(school) && ("week".equals(mode) || "semester".equals(mode) || "exams".equals(mode))) && !("uth".equals(school) && "week".equals(mode))) {
            call.reject("Unsupported school or mode."); return;
        }
        host = "uth".equals(school) ? "portal.ut.edu.vn" : "fap.fpt.edu.vn";
        target = "https://" + host + ("uth".equals(school) ? "/calendar" : "exams".equals(mode) ? "/ExamSchedule" : "/WeeklyTimetable");
        options = new JSONObject();
        try {
            options.put("schoolId", school); options.put("mode", mode);
            options.put("start", call.getString("start", "")); options.put("end", call.getString("end", ""));
            try (java.io.InputStream in = getContext().getAssets().open("portal-reader.js")) {
                java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[8192]; int n;
                while ((n = in.read(buffer)) != -1) bytes.write(buffer, 0, n);
                reader = bytes.toString("UTF-8");
            }
        } catch (Exception e) { call.reject("Could not load the school reader."); return; }
        pending = call;
        getActivity().runOnUiThread(this::showPortal);
    }
    private Button button(String text, LinearLayout row, Runnable action) {
        Button b = new Button(getContext()); b.setText(text); row.addView(b);
        b.setOnClickListener(v -> action.run()); return b;
    }
    private void showPortal() {
        dialog = new Dialog(getActivity(), android.R.style.Theme_Material_Light_NoActionBar);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        LinearLayout layout = new LinearLayout(getContext()); layout.setOrientation(LinearLayout.VERTICAL); layout.setBackgroundColor(Color.WHITE);
        LinearLayout bar = new LinearLayout(getContext());
        button("Đóng", bar, () -> dialog.dismiss());
        button("Lịch trường", bar, () -> portal.loadUrl(target));
        readButton = button("Đọc lịch", bar, this::scan);
        status = new TextView(getContext()); status.setPadding(16, 12, 16, 12);
        status.setText("Tự đăng nhập tại cổng trường, mở lịch rồi bấm Đọc lịch. Nếu Google chặn đăng nhập trong app, hãy đóng để quay lại; không có cơ chế vượt chặn.");
        portal = new WebView(getContext());
        WebSettings settings = portal.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // No JavaScriptInterface is exposed to the school or its authentication pages.
        portal.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                boolean blocked = !navigationAllowed(req.getUrl().toString());
                if (blocked) status.setText("Trang đăng nhập này chưa được hỗ trợ. Đã giữ bạn ở cổng trường.");
                return blocked;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                generation++; readButton.setEnabled(true);
            }
        });
        layout.addView(bar); layout.addView(status); layout.addView(portal, new LinearLayout.LayoutParams(-1, 0, 1));
        dialog.setContentView(layout);
        dialog.setOnDismissListener(d -> cleanup("Đã đóng cổng trường. Chưa lưu lịch."));
        dialog.show(); dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        portal.loadUrl("portal.ut.edu.vn".equals(host) ? target : "https://fap.fpt.edu.vn/");
    }
    private void scan() {
        if (!readable()) { status.setText("Hãy mở đúng lịch sau khi đăng nhập; có thể bấm Lịch trường để chuyển trang."); return; }
        final int run = ++generation;
        readButton.setEnabled(false); status.setText("Đang đọc lịch. Giữ trang mở cho tới khi có bản xem trước.");
        String script = reader + "\n;window.__lhResult=null;window.__lhRun=" + run + ";window.__lhRead(" + options.toString() + ").then(snapshot=>{if(window.__lhRun===" + run + ")window.__lhResult={snapshot};}).catch(error=>{if(window.__lhRun===" + run + ")window.__lhResult={error:String(error.message)};});void 0;";
        portal.evaluateJavascript(script, ignored -> poll(run, 0));
    }
    private void poll(int run, int count) {
        if (run != generation || portal == null || pending == null) return;
        if (!readable() || count > 480) { status.setText("Không đọc xong lịch hoặc trang đã thay đổi. Hãy thử đọc lại."); readButton.setEnabled(true); return; }
        portal.evaluateJavascript("JSON.stringify(window.__lhResult || null)", raw -> {
            if (run != generation || pending == null) return;
            try {
                Object decoded = new org.json.JSONTokener(raw).nextValue();
                String value = decoded instanceof String ? (String) decoded : "null";
                if ("null".equals(value)) { handler.postDelayed(() -> poll(run, count + 1), 500); return; }
                JSONObject result = new JSONObject(value);
                if (result.has("error")) { status.setText(result.optString("error")); readButton.setEnabled(true); return; }
                if (value.getBytes(StandardCharsets.UTF_8).length > 512000) throw new Exception("Snapshot too large");
                JSONObject snapshot = result.getJSONObject("snapshot");
                if (!options.optString("schoolId").equals(snapshot.optString("schoolId")) || !snapshot.optBoolean("complete")) throw new Exception("Invalid snapshot");
                PluginCall call = pending; pending = null;
                call.resolve(new JSObject(value)); dialog.dismiss();
            } catch (Exception error) { status.setText("Không đọc được dữ liệu hợp lệ. Hãy thử lại."); readButton.setEnabled(true); }
        });
    }
    private void cleanup(String reason) {
        generation++; handler.removeCallbacksAndMessages(null);
        if (portal != null) { portal.stopLoading(); portal.destroy(); portal = null; }
        if (pending != null) { pending.reject(reason); pending = null; }
        dialog = null;
    }
    @Override protected void handleOnDestroy() {
        if (dialog != null) dialog.dismiss();
        cleanup("Ứng dụng đã đóng cổng trường.");
    }
}
