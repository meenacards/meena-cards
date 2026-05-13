import 'dart:io';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart' as path_provider;
import 'package:path/path.dart' as p;

class ImageUploadService {
  static const int maxFileSize = 2 * 1024 * 1024; // 2MB
  static const List<String> allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  static Future<File?> processImage(File image) async {
    // 1. Validate extension
    final extension = p.extension(image.path).toLowerCase();
    if (!allowedExtensions.contains(extension)) {
      throw "Invalid file type. Only JPG, PNG, and WEBP are allowed.";
    }

    // 2. Compress image
    final dir = await path_provider.getTemporaryDirectory();
    final targetPath = p.join(dir.absolute.path, "temp_${DateTime.now().millisecondsSinceEpoch}.jpg");

    var result = await FlutterImageCompress.compressAndGetFile(
      image.absolute.path,
      targetPath,
      quality: 70,
      format: CompressFormat.jpeg,
    );

    if (result == null) return null;

    final compressedFile = File(result.path);

    // 3. Validate size
    final size = await compressedFile.length();
    if (size > maxFileSize) {
      throw "Image is too large. Maximum allowed size is 2MB after compression.";
    }

    return compressedFile;
  }
}
