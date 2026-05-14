import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/secure_storage_service.dart';

enum UserType { none, admin, customer }

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  UserType _userType = UserType.none;
  String? _userName;
  String? _phoneNumber;
  
  bool get isAuthenticated => _isAuthenticated;
  UserType get userType => _userType;
  bool get isAdmin => _userType == UserType.admin;
  bool get isCustomer => _userType == UserType.customer;
  String? get userName => _userName;
  String? get phoneNumber => _phoneNumber;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    final token = await SecureStorageService.getToken();
    if (token != null && token.isNotEmpty) {
      _isAuthenticated = true;
      final role = await SecureStorageService.getUserRole();
      _userType = UserType.values.firstWhere(
        (e) => e.name == role, 
        orElse: () => UserType.none
      );
      _userName = await SecureStorageService.get('user_name');
      _phoneNumber = await SecureStorageService.get('phone_number');
    } else {
      _isAuthenticated = false;
      _userType = UserType.none;
    }
    notifyListeners();
  }

  Future<bool> loginAdmin(String user, String pass, ApiService api) async {
    try {
      final res = await api.loginAdmin(user.trim(), pass.trim());
      if (res != null && res['token'] != null) {
        _isAuthenticated = true;
        _userType = UserType.admin;
        _userName = 'Administrator';
        _phoneNumber = user.trim();
        
        await SecureStorageService.saveToken(res['token']);
        await SecureStorageService.saveUserRole(UserType.admin.name);
        await SecureStorageService.save('user_name', _userName!);
        await SecureStorageService.save('phone_number', _phoneNumber!);
        
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      rethrow;
    }
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
        
        if (res['token'] != null) {
          _isAuthenticated = true;
          _userType = UserType.customer;
          _userName = res['name'] ?? cleanedName;
          _phoneNumber = cleanedPhNo;
          
          await SecureStorageService.saveToken(res['token']);
          await SecureStorageService.saveUserRole(UserType.customer.name);
          await SecureStorageService.save('user_name', _userName!);
          await SecureStorageService.save('phone_number', _phoneNumber!);
          
          notifyListeners();
          return null; // Success
        }
      }
      return "Login failed. Check your name and phone number.";
    } catch (e) {
      return e.toString();
    }
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _userType = UserType.none;
    _userName = null;
    await SecureStorageService.clearAll();
    notifyListeners();
  }
}
