import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

enum UserType { none, admin, customer }

class AuthProvider extends ChangeNotifier {
  static const String _authKey = 'is_authenticated';
  static const String _userTypeKey = 'user_type';
  static const String _userNameKey = 'user_name';
  
  bool _isAuthenticated = false;
  UserType _userType = UserType.none;
  String? _userName;
  String? _password;

  bool get isAuthenticated => _isAuthenticated;
  UserType get userType => _userType;
  bool get isAdmin => _userType == UserType.admin;
  bool get isCustomer => _userType == UserType.customer;
  String? get userName => _userName;
  String? get password => _password;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    _isAuthenticated = prefs.getBool(_authKey) ?? false;
    String? typeName = prefs.getString(_userTypeKey);
    _userType = UserType.values.firstWhere(
      (e) => e.name == typeName, 
      orElse: () => UserType.none
    );
    _userName = prefs.getString(_userNameKey);
    _password = prefs.getString('user_password');
    notifyListeners();
  }

  Future<bool> loginAdmin(String user, String pass, ApiService api) async {
    final res = await api.loginAdmin(user.trim(), pass.trim());
    if (res != null) {
      _isAuthenticated = true;
      _userType = UserType.admin;
      _userName = 'Administrator';
      _password = pass;
      await _save();
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<String?> loginPress(String name, String phNo, ApiService api) async {
    try {
      final cleanedName = name.trim();
      final cleanedPhNo = phNo.replaceAll(RegExp(r'\s+'), '').trim();
      
      final res = await api.loginPress(cleanedName, cleanedPhNo);
      if (res != null) {
        if (res['status'] == 'pending') {
          return res['error'] ?? 'Your account is pending approval.';
        }
        _isAuthenticated = true;
        _userType = UserType.customer;
        _userName = res['name'];
        _password = phNo; 
        await _save();
        notifyListeners();
        return null; // Success
      }
      return "Login failed. Check your name and phone number.";
    } catch (e) {
      debugPrint('Login Error: $e');
      return "An error occurred during login.";
    }
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_authKey, _isAuthenticated);
    await prefs.setString(_userTypeKey, _userType.name);
    await prefs.setString(_userNameKey, _userName ?? '');
    await prefs.setString('user_password', _password ?? '');
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _userType = UserType.none;
    _userName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
