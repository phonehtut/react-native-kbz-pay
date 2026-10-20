require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-kbz-pay"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/phonehtut/react-native-kbz-pay"
  s.license      = package["license"]
  s.authors      = { "Phone Htut Khaung" => "phonehtutkhaung.dev@gmail.com" }
  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => "https://github.com/phonehtut/react-native-kbz-pay.git", :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  xcframework_path = File.join(__dir__, "ios/KBZPayAPPPay.xcframework")
  if !File.exist?(xcframework_path)
    raise "\n========================================================================\n" \
          "[react-native-kbz-pay] ❌ KBZPayAPPPay.xcframework was not found in: #{xcframework_path}\n" \
          "Please download the official iOS SDK from:\n" \
          "  https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/in-app-download-en\n" \
          "and run the setup command in your project:\n" \
          "  npx react-native-kbz-pay setup-sdk <path-to-sdk-download>\n" \
          "========================================================================\n"
  end

  s.vendored_frameworks = "ios/KBZPayAPPPay.xcframework"

  s.dependency "React-Core"
end
