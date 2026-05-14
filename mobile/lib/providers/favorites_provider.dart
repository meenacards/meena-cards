import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FavoritesProvider extends ChangeNotifier {
  static const String _favKey = 'favorite_cards';
  List<String> _favoriteIds = [];

  List<String> get favoriteIds => _favoriteIds;

  FavoritesProvider() {
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    _favoriteIds = prefs.getStringList(_favKey) ?? [];
    notifyListeners();
  }

  bool isFavorite(String cardId) {
    return _favoriteIds.contains(cardId);
  }

  Future<void> toggleFavorite(String cardId) async {
    if (_favoriteIds.contains(cardId)) {
      _favoriteIds.remove(cardId);
    } else {
      _favoriteIds.add(cardId);
    }
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_favKey, _favoriteIds);
  }
}
