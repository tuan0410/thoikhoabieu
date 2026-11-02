// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "LichHocPortal",
    platforms: [.iOS(.v15)],
    products: [.library(name: "LichHocPortal", targets: ["LichHocPortal"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")],
    targets: [.target(name: "LichHocPortal", dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm"), .product(name: "Cordova", package: "capacitor-swift-pm")], path: "ios/Sources/LichHocPortal", resources: [.process("Resources")])]
)
