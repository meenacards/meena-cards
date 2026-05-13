import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();

  static const String _keyToken = 'jwt_token';
  static const String _keyUserRole = 'user_role';

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  static Future<void> saveUserRole(String role) async {
    await _storage.write(key: _keyUserRole, value: role);
  }

  static Future<String?> getUserRole() async {
    return await _storage.read(key: _keyUserRole);
  }

  static Future<void> save(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  static Future<String?> get(String key) async {
    return await _storage.read(key: key);
  }

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
