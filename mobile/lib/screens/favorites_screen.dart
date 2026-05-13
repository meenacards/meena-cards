import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/card_model.dart';
import '../services/api_service.dart';
import '../providers/favorites_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final ApiService _api = ApiService();
  List<CardModel> _favCards = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchFavorites();
  }

  Future<void> _fetchFavorites() async {
    final favIds = Provider.of<FavoritesProvider>(context, listen: false).favoriteIds;
    if (favIds.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    final allCards = await _api.fetchCards();
    setState(() {
      _favCards = allCards.where((c) => favIds.contains(c.id)).toList();
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My Favorites', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _favCards.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   Icon(Icons.favorite_border, size: 80, color: Colors.grey.shade300),
                   const SizedBox(height: 16),
                   Text('No favorite cards yet', style: GoogleFonts.outfit(fontSize: 18, color: Colors.grey)),
                   const SizedBox(height: 8),
                   ElevatedButton(
                     onPressed: () => context.go('/catalog'),
                     child: const Text('Browse Collection'),
                   )
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.75,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: _favCards.length,
              itemBuilder: (context, index) => _buildFavItem(_favCards[index]),
            ),
    );
  }

  Widget _buildFavItem(CardModel card) {
    return Consumer<FavoritesProvider>(
      builder: (context, favs, _) => GestureDetector(
        onTap: () => context.push('/product/${card.id}'),
        child: Container(
          decoration: BoxDecoration(
            color: Color(0xFFFDFBF0),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
          ),
          child: Column(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        child: CachedNetworkImage(
                          imageUrl: card.imageUrl,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          placeholder: (context, url) => Container(color: Colors.grey.shade100),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8, right: 8,
                      child: GestureDetector(
                        onTap: () async {
                          await favs.toggleFavorite(card.id);
                          _fetchFavorites(); // Refresh the list
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Color(0xFFFDFBF0).withValues(alpha: 0.8),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.favorite, 
                            color: Colors.red,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  children: [
                    Text(card.name, style: GoogleFonts.outfit(fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Text('₹${card.price}', style: GoogleFonts.outfit(color: const Color(0xFF3A0303), fontWeight: FontWeight.bold)),
                  ],
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
