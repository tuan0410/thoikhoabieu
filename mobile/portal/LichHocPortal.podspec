Pod::Spec.new do |s|
  s.name = 'LichHocPortal'
  s.version = '0.1.0'
  s.summary = 'User initiated school timetable reader for Lich Hoc'
  s.homepage = 'https://github.com/tuan0410/thoikhoabieu'
  s.author = 'tuan0410'
  s.license = { :type => 'UNLICENSED' }
  s.source = { :git => 'https://github.com/tuan0410/thoikhoabieu.git' }
  s.source_files = 'ios/Sources/**/*.swift'
  s.resources = 'ios/Sources/**/Resources/*.js'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor', '~> 8.0'
  s.swift_version = '5.9'
end
