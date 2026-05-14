import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../models/card_model.dart';
import '../models/press_model.dart';
import '../utils/config.dart';
import 'secure_storage_service.dart';

class ApiService {
  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await SecureStorageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          // Handle token expiry / unauthorized access
          SecureStorageService.clearAll();
          // We might want to trigger a logout in the UI here
        }
        return handler.next(e);
      },
    ));

    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
      ));
    }
  }

  // Helper for user-friendly error messages
  String getErrorMessage(dynamic e) {
    if (e is DioException) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return "Network timeout. Please check your internet.";
      } else if (e.type == DioExceptionType.connectionError) {
        return "No internet connection.";
      } else if (e.response?.statusCode == 401) {
        return "Session expired. Please login again.";
      } else if (e.response?.statusCode == 403) {
        return "Access denied.";
      } else if (e.response?.statusCode == 404) {
        return "Resource not found.";
      } else if (e.response?.statusCode != null && e.response!.statusCode! >= 500) {
        return "Server error. Please try again later.";
      }
    }
    return "Something went wrong. Please try again.";
  }

  Future<List<CardModel>> fetchCards() async {
    try {
      final response = await _dio.get('/cards');
      if (response.statusCode == 200) {
        List<dynamic> data = response.data;
        return data.map((item) => CardModel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<CardModel?> fetchCard(String id) async {
    try {
      final response = await _dio.get('/cards/$id');
      if (response.statusCode == 200) {
        return CardModel.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<CardModel?> addCard({
    required String name,
    required List<String> categories,
    required File image,
    String description = '',
    bool isLatest = false,
    bool isOffer = false,
    double price = 0.0,
    int stock = 0,
  }) async {
    try {
      String fileName = image.path.split('/').last;
      FormData formData = FormData.fromMap({
        'name': name,
        'category': categories,
        'description': description,
        'is_latest': isLatest.toString(),
        'is_offer': isOffer.toString(),
        'price': price.toString(),
        'stock': stock.toString(),
        'image': await MultipartFile.fromFile(image.path, filename: fileName),
      });

      final response = await _dio.post('/cards', data: formData);
      if (response.statusCode == 201) {
        return CardModel.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<CardModel?> updateCard(String id, {
    String? name,
    List<String>? categories,
    File? image,
    String? description,
    bool? isLatest,
    bool? isOffer,
    double? price,
    int? stock,
  }) async {
    try {
      Map<String, dynamic> dataMap = {};
      if (name != null) dataMap['name'] = name;
      if (categories != null) dataMap['category'] = categories;
      if (description != null) dataMap['description'] = description;
      if (isLatest != null) dataMap['is_latest'] = isLatest.toString();
      if (isOffer != null) dataMap['is_offer'] = isOffer.toString();
      if (price != null) dataMap['price'] = price.toString();
      if (stock != null) dataMap['stock'] = stock.toString();
      
      if (image != null) {
        String fileName = image.path.split('/').last;
        dataMap['image'] = await MultipartFile.fromFile(image.path, filename: fileName);
      }

      FormData formData = FormData.fromMap(dataMap);
      final response = await _dio.put('/cards/$id', data: formData);
      if (response.statusCode == 200) {
        return CardModel.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> deleteCard(String id) async {
    try {
      final response = await _dio.delete('/cards/$id');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // --- Auth ---

  Future<Map<String, dynamic>?> loginAdmin(String username, String password) async {
    try {
      final response = await _dio.post('/login/admin', data: {
        'username': username,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw getErrorMessage(e);
    }
  }

  Future<Map<String, dynamic>?> loginPress(String name, String phNo) async {
    try {
      final response = await _dio.post('/login/press', data: {
        'name': name,
        'ph_no': phNo,
      });
      return response.data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        return {'status': 'pending', 'error': e.response?.data['error']};
      }
      throw getErrorMessage(e);
    } catch (e) {
      throw "An unexpected error occurred.";
    }
  }

  Future<Press?> registerPress({
    required String name,
    required String address,
    required String phNo,
  }) async {
    try {
      final response = await _dio.post('/register/press', data: {
        'name': name,
        'address': address,
        'ph_no': phNo,
      });
      if (response.statusCode == 201) {
        return Press.fromJson(response.data);
      }
      return null;
    } catch (e) {
      throw getErrorMessage(e);
    }
  }

  // --- Presses Management ---

  Future<List<Press>> fetchPresses() async {
    try {
      final response = await _dio.get('/presses');
      if (response.statusCode == 200) {
        List<dynamic> data = response.data;
        return data.map((item) => Press.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Press?> addPress({
    required String name,
    required String address,
    String phNo = '',
  }) async {
    try {
      final response = await _dio.post('/presses', data: {
        'name': name,
        'address': address,
        'ph_no': phNo,
      });
      if (response.statusCode == 201) {
        return Press.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Press?> updatePress(String id, {
    String? name,
    String? address,
    String? phNo,
  }) async {
    try {
      Map<String, dynamic> data = {};
      if (name != null) data['name'] = name;
      if (address != null) data['address'] = address;
      if (phNo != null) data['ph_no'] = phNo;

      final response = await _dio.put('/presses/$id', data: data);
      if (response.statusCode == 200) {
        return Press.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> deletePress(String id) async {
    try {
      final response = await _dio.delete('/presses/$id');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // --- Press Approval Management ---

  Future<List<Press>> fetchPendingPresses() async {
    try {
      final response = await _dio.get('/presses/pending');
      if (response.statusCode == 200) {
        List<dynamic> data = response.data;
        return data.map((item) => Press.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<bool> approvePress(String id) async {
    try {
      final response = await _dio.post('/presses/$id/approve');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> rejectPress(String id) async {
    try {
      final response = await _dio.post('/presses/$id/reject');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
