import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';

class AppConfig {
  static String get apiUrl => dotenv.env['API_URL'] ?? 'https://api.meenacards.com';
  static String get appName => dotenv.env['APP_NAME'] ?? 'Meena Cards';
  static String get version => dotenv.env['VERSION'] ?? '1.0.0';
  static String get buildNumber => dotenv.env['BUILD_NUMBER'] ?? '1';
  static bool get isProduction => dotenv.env['ENVIRONMENT'] == 'production' || !kDebugMode;

  static Future<void> init() async {
    await dotenv.load(fileName: ".env");
  }
}
