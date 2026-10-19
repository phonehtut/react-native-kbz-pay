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
  s.vendored_frameworks = "ios/KBZPayAPPPay.xcframework"

  s.dependency "React-Core"
end
