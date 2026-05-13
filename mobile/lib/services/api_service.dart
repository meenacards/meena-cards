import 'dart:io';
import 'package:dio/dio.dart';
import '../models/card_model.dart';
import '../models/press_model.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  // Use http://10.0.2.2 for Android emulator to access computer's localhost
  // Production URL for release builds and physical devices
  // static String baseUrl = 'https://api.meenacards.com/'; 
  static String baseUrl = kDebugMode ? 'http://127.0.0.1:8080' : 'https://api.meenacards.com/';
  // NOTE: If testing locally on an emulator, you can temporarily change this to 'http://10.0.2.2:8080'

  final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  Future<List<CardModel>> fetchCards() async {
    try {
      final response = await _dio.get('/cards');
      if (response.statusCode == 200) {
        List<dynamic> data = response.data;
        return data.map((item) => CardModel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching cards: $e');
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
      debugPrint('Error fetching card $id: $e');
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
        'category': categories, // Dio handles lists automatically
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
      debugPrint('Error adding card: $e');
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
      debugPrint('Error updating card $id: $e');
      return null;
    }
  }

  Future<bool> deleteCard(String id) async {
    try {
      final response = await _dio.delete('/cards/$id');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting card $id: $e');
      return false;
    }
  }

  // --- Press Auth ---

  Future<Map<String, dynamic>?> loginAdmin(String username, String password) async {
    try {
      final response = await _dio.post('/login/admin', data: {
        'username': username,
        'password': password,
      });
      return response.data;
    } catch (e) {
      return null;
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
        // Return the error message from backend (e.g. "account pending approval")
        return {'status': 'pending', 'error': e.response?.data['error']};
      }
      debugPrint('Error press login: $e');
      return null;
    } catch (e) {
      debugPrint('Error press login: $e');
      return null;
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
      debugPrint('Error registering press: $e');
      return null;
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
      debugPrint('Error fetching presses: $e');
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
      debugPrint('Error adding press: $e');
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
      debugPrint('Error updating press $id: $e');
      return null;
    }
  }

  Future<bool> deletePress(String id) async {
    try {
      final response = await _dio.delete('/presses/$id');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting press $id: $e');
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
      debugPrint('Error fetching pending presses: $e');
      return [];
    }
  }

  Future<bool> approvePress(String id) async {
    try {
      final response = await _dio.post('/presses/$id/approve');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error approving press $id: $e');
      return false;
    }
  }

  Future<bool> rejectPress(String id) async {
    try {
      final response = await _dio.post('/presses/$id/reject');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error rejecting press $id: $e');
      return false;
    }
  }
}
