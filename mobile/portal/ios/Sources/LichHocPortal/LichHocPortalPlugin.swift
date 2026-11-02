import Foundation
import UIKit
import WebKit
import Capacitor

@objc(LichHocPortalPlugin)
public class LichHocPortalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LichHocPortalPlugin"
    public let jsName = "LichHocPortal"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise)]
    private var portal: PortalController?
    @objc func read(_ call: CAPPluginCall) {
        let school = call.getString("schoolId") ?? "", mode = call.getString("mode") ?? ""
        guard (school == "fpt-qn" && ["week", "semester", "exams"].contains(mode)) || (school == "uth" && mode == "week") else { call.reject("Unsupported school or mode."); return }
        DispatchQueue.main.async {
            guard self.portal == nil else { call.reject("A school portal is already open."); return }
            let options = ["schoolId": school, "mode": mode, "start": call.getString("start") ?? "", "end": call.getString("end") ?? ""]
            let controller = PortalController(options: options) { [weak self] result in
                self?.portal = nil
                switch result {
                case .success(let snapshot): call.resolve(["snapshot": snapshot])
                case .failure(let error): call.reject(error.localizedDescription)
                }
            }
            guard let parent = self.bridge?.viewController else { call.reject("App window unavailable."); return }
            self.portal = controller
            controller.modalPresentationStyle = .fullScreen
            parent.present(controller, animated: true)
        }
    }
}

private final class PortalController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    let options: [String: String]
    let completion: (Result<[String: Any], Error>) -> Void
    var web: WKWebView!
    let status = UILabel()
    let readButton = UIButton(type: .system)
    var timer: Timer?
    var finished = false
    var generation = 0
    var host: String { options["schoolId"] == "uth" ? "portal.ut.edu.vn" : "fap.fpt.edu.vn" }
    var target: URL { URL(string: "https://" + host + (host == "portal.ut.edu.vn" ? "/calendar" : options["mode"] == "exams" ? "/ExamSchedule" : "/WeeklyTimetable"))! }
    init(options: [String: String], completion: @escaping (Result<[String: Any], Error>) -> Void) {
        self.options = options; self.completion = completion
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
    func allowed(_ url: URL) -> Bool {
        url.scheme == "https" && (url.port == nil || url.port == 443) && [host, "accounts.google.com", "login.microsoftonline.com", "login.live.com"].contains(url.host ?? "")
    }
    func readable() -> Bool {
        guard let url = web.url, allowed(url), url.host == host else { return false }
        if host == "portal.ut.edu.vn" { return url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) == "calendar" && options["mode"] == "week" }
        let pattern = options["mode"] == "exams" ? "^/ExamSchedule/?$" : "(?:/WeeklyTimetable(?:/|$)|/ScheduleOfWeek\\.aspx$)"
        return url.path.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
    }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .systemBackground
        let config = WKWebViewConfiguration()
        // Separate portal view: no Capacitor bridge and no script message handlers.
        config.websiteDataStore = .default()
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self; web.uiDelegate = self
        let close = UIButton(type: .system); close.setTitle("Đóng", for: .normal); close.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        let calendar = UIButton(type: .system); calendar.setTitle("Lịch trường", for: .normal); calendar.addTarget(self, action: #selector(openCalendar), for: .touchUpInside)
        readButton.setTitle("Đọc lịch", for: .normal); readButton.addTarget(self, action: #selector(scan), for: .touchUpInside)
        let bar = UIStackView(arrangedSubviews: [close, calendar, readButton]); bar.distribution = .fillEqually
        status.numberOfLines = 0; status.font = .systemFont(ofSize: 13)
        status.text = "Tự đăng nhập tại cổng trường rồi mở lịch. Nếu Google chặn đăng nhập trong app, hãy đóng để quay lại; app không vượt chặn đăng nhập."
        let stack = UIStackView(arrangedSubviews: [bar, status, web]); stack.axis = .vertical; stack.spacing = 8; stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 8), stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8), stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor), bar.heightAnchor.constraint(equalToConstant: 44)])
        web.load(URLRequest(url: host == "fap.fpt.edu.vn" ? URL(string: "https://fap.fpt.edu.vn/")! : target))
    }
    @objc func openCalendar() { web.load(URLRequest(url: target)) }
    @objc func cancel() { end(.failure(NSError(domain: "LichHocPortal", code: 1, userInfo: [NSLocalizedDescriptionKey: "Đã đóng cổng trường. Chưa lưu lịch."]))) }
    func end(_ result: Result<[String: Any], Error>) {
        guard !finished else { return }; finished = true
        generation += 1; timer?.invalidate(); web.stopLoading()
        web.navigationDelegate = nil; web.uiDelegate = nil
        dismiss(animated: true) { self.completion(result) }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, allowed(url) else { status.text = "Trang đăng nhập này chưa được hỗ trợ."; decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        generation += 1; timer?.invalidate(); readButton.isEnabled = true
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, allowed(url) { webView.load(navigationAction.request) }
        return nil
    }
    @objc func scan() {
        guard readable() else { status.text = "Hãy đăng nhập và mở đúng lịch. Bấm Lịch trường để chuyển trang."; return }
        guard let url = Bundle.module.url(forResource: "portal-reader", withExtension: "js"), let source = try? String(contentsOf: url, encoding: .utf8), let encoded = try? JSONSerialization.data(withJSONObject: options), let json = String(data: encoded, encoding: .utf8) else { status.text = "Không tải được bộ đọc lịch."; return }
        generation += 1; let run = generation
        readButton.isEnabled = false; status.text = "Đang đọc lịch. Giữ trang mở để đọc đủ các tuần."
        let script = source + "\n;window.__lhResult=null;window.__lhRun=\(run);window.__lhRead(\(json)).then(snapshot=>{if(window.__lhRun===\(run))window.__lhResult={snapshot};}).catch(error=>{if(window.__lhRun===\(run))window.__lhResult={error:String(error.message)};});void 0;"
        web.evaluateJavaScript(script) { [weak self] _, error in
            guard let self = self, self.generation == run else { return }
            if error != nil { self.status.text = "Không khởi chạy được bộ đọc."; self.readButton.isEnabled = true; return }
            self.poll(run, count: 0)
        }
    }
    func poll(_ run: Int, count: Int) {
        guard !finished, generation == run else { return }
        guard readable(), count < 480 else { status.text = "Trang thay đổi hoặc đọc quá lâu. Hãy thử lại."; readButton.isEnabled = true; return }
        web.evaluateJavaScript("JSON.stringify(window.__lhResult || null)") { [weak self] value, error in
            guard let self = self, !self.finished, self.generation == run else { return }
            guard error == nil, let raw = value as? String else { self.status.text = "Không đọc được trang."; self.readButton.isEnabled = true; return }
            if raw == "null" {
                self.timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { [weak self] _ in self?.poll(run, count: count + 1) }; return
            }
            guard raw.utf8.count <= 512000, let data = raw.data(using: .utf8), let result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { self.status.text = "Dữ liệu không hợp lệ hoặc quá lớn."; self.readButton.isEnabled = true; return }
            if let message = result["error"] as? String { self.status.text = message; self.readButton.isEnabled = true; return }
            guard let snapshot = result["snapshot"] as? [String: Any], snapshot["schoolId"] as? String == self.options["schoolId"], snapshot["complete"] as? Bool == true else { self.status.text = "Bản đọc lịch không hợp lệ."; self.readButton.isEnabled = true; return }
            self.end(.success(snapshot))
        }
    }
    deinit { timer?.invalidate() }
}
