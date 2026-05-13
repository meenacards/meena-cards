class CardModel {
  final String id;
  final String name;
  final List<String> categories;
  final String imageUrl;
  final String description;
  final bool isLatest;
  final bool isOffer;
  final double price;
  final int stock;

  CardModel({
    required this.id,
    required this.name,
    required this.categories,
    required this.imageUrl,
    this.description = '',
    this.isLatest = false,
    this.isOffer = false,
    this.price = 0.0,
    this.stock = 0,
  });

  factory CardModel.fromJson(Map<String, dynamic> json) {
    // Handle category as string or list
    var categoriesRaw = json['category'];
    List<String> categoryList = [];
    if (categoriesRaw is String) {
      categoryList = categoriesRaw.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    } else if (categoriesRaw is List) {
      categoryList = categoriesRaw.map((e) => e.toString()).toList();
    }

    return CardModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? 'No Name',
      categories: categoryList,
      imageUrl: json['image_url'] ?? '',
      description: json['description'] ?? '',
      isLatest: json['is_latest'] == true || json['is_latest'] == "true",
      isOffer: json['is_offer'] == true || json['is_offer'] == "true",
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      stock: int.tryParse(json['stock']?.toString() ?? '0') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': categories,
      'image_url': imageUrl,
      'description': description,
      'is_latest': isLatest,
      'is_offer': isOffer,
      'price': price,
      'stock': stock,
    };
  }
}
