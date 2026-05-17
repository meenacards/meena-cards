import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/card_model.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import '../providers/favorites_provider.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../widgets/skeleton_loader.dart';

class CatalogScreen extends StatefulWidget {
  final String? initialCategory;
  final String? searchQuery;
  const CatalogScreen({super.key, this.initialCategory, this.searchQuery});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();
  List<CardModel> _allCards = [];
  List<CardModel> _filteredCards = [];
  bool _isLoading = true;
  late String _selectedCategory;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'All';
    _searchController.text = widget.searchQuery ?? '';
    _fetchCards();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchCards() async {
    final cards = await _api.fetchCards();
    setState(() {
      _allCards = cards;
      _applyFilters();
      _isLoading = false;
    });
  }

  void _applyFilters() {
    final query = _searchController.text.toLowerCase();
    _filteredCards = _allCards.where((card) {
      final matchesCategory = _selectedCategory == 'All' || card.categories.contains(_selectedCategory);
      final matchesSearch = card.name.toLowerCase().contains(query) || 
                            card.categories.any((c) => c.toLowerCase().contains(query));
      return matchesCategory && matchesSearch;
    }).toList();

    // Sort by Category Hierarchy
    final orderedCats = AppConstants.orderedCategories;
    _filteredCards.sort((a, b) {
      int indexA = 999999;
      for (var cat in a.categories) {
        final idx = orderedCats.indexOf(cat);
        if (idx != -1 && idx < indexA) indexA = idx;
      }
      int indexB = 999999;
      for (var cat in b.categories) {
        final idx = orderedCats.indexOf(cat);
        if (idx != -1 && idx < indexB) indexB = idx;
      }
      
      if (indexA != indexB) {
        return indexA.compareTo(indexB);
      }
      return a.name.compareTo(b.name);
    });
  }

  void _filter(String category) {
    setState(() {
      _selectedCategory = category;
      _applyFilters();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    // Top-level categories from hierarchy

    return Scaffold(
      appBar: AppBar(
        title: Hero(tag: 'logo', child: Image.asset('assets/images/logo.png', height: 55)),
        backgroundColor: const Color(0xFF3A0303),
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFFFDFBF0)),
        actions: [
          IconButton(
            icon: const Icon(Icons.contact_support_outlined),
            onPressed: () => context.push('/contact'),
          ),
          IconButton(
            icon: const Icon(Icons.favorite_border),
            onPressed: () => context.push('/favorites'),
          ),
          IconButton(
            icon: Icon(auth.isAuthenticated ? Icons.account_circle : Icons.person_outline),
            onPressed: () => auth.isAuthenticated ? context.push('/profile') : context.go('/login'),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: Color(0xFFFDFBF0),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
              decoration: const BoxDecoration(color: Color(0xFF3A0303)),
              child: Column(
                children: [
                  Image.asset('assets/images/logo.png', height: 90),
                  const SizedBox(height: 12),
                  const Text(
                    'UNITING HEARTS, CELEBRATING STORIES',
                    style: TextStyle(color: Color(0xFFFDFBF0), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            _buildDrawerItem(Icons.grid_view_rounded, 'All Products', () {
              Navigator.pop(context);
              _filter('All');
            }),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: AppConstants.categoryHierarchy.entries.map((entry) {
                  return _buildExpansionTile(entry.key, entry.value);
                }).toList(),
              ),
            ),
            const Divider(height: 1),
            _buildDrawerItem(Icons.policy_outlined, 'Privacy Policy', () => context.push('/privacy')),
            _buildDrawerItem(Icons.gavel_outlined, 'Terms & Conditions', () => context.push('/terms')),
            Container(
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.black12))),
              child: _buildDrawerItem(Icons.logout, 'Logout', () {
                 auth.logout();
                 context.go('/login');
              }),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            decoration: const BoxDecoration(
              color: Color(0xFF3A0303),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(24),
                bottomRight: Radius.circular(24),
              ),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white),
                onChanged: (v) => setState(() => _applyFilters()),
                decoration: const InputDecoration(
                  hintText: 'Search for cards...',
                  hintStyle: TextStyle(color: Colors.white60),
                  border: InputBorder.none,
                  icon: Icon(Icons.search, color: Colors.white70),
                ),
              ),
            ),
          ),
          if (_selectedCategory != 'All')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
              child: Row(
                children: [
                  Text(_selectedCategory, 
                    style: GoogleFonts.playfairDisplay(fontSize: 24, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => _filter('All'),
                  )
                ],
              ),
            ),
          Expanded(
            child: _isLoading 
              ? GridView.builder(
                  padding: const EdgeInsets.all(20),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.65,
                    crossAxisSpacing: 20,
                    mainAxisSpacing: 20,
                  ),
                  itemCount: 6,
                  itemBuilder: (context, index) => Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      color: Colors.white,
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Expanded(child: SkeletonLoader(width: double.infinity, height: double.infinity, borderRadius: 24)),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SkeletonLoader(width: 100, height: 12),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const SkeletonLoader(width: 40, height: 16),
                                  const SkeletonLoader(width: 50, height: 10),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : _filteredCards.isEmpty
                ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.search_off, size: 60, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    const Text('No cards found in this category'),
                  ]))
                : GridView.builder(
                    padding: const EdgeInsets.all(20),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.65,
                      crossAxisSpacing: 20,
                      mainAxisSpacing: 20,
                    ),
                    itemCount: _filteredCards.length,
                    itemBuilder: (context, index) => _buildCardItem(context, _filteredCards[index]),
                  ),
          ),
        ],
      ),
      floatingActionButton: auth.isAdmin 
        ? FloatingActionButton.extended(
            onPressed: () => context.push('/admin/product').then((_) => _fetchCards()),
            label: const Text('Add Card', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFDFBF0))),
            icon: const Icon(Icons.add, color: Color(0xFFFDFBF0)),
            backgroundColor: const Color(0xFF3A0303),
          )
        : null,
    );
  }

  Widget _buildCardItem(BuildContext context, CardModel card) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final favs = Provider.of<FavoritesProvider>(context);
    final isFav = favs.isFavorite(card.id);

    // Stock message logic for "Brand Series"
    final brandSeries = ["V Cards", "K Cards", "R Cards", "ES Cards", "Brand Series"];
    bool isBrandSeries = card.categories.any((c) => brandSeries.any((b) => c.toLowerCase() == b.toLowerCase())) ||
                         brandSeries.any((b) => card.name.toLowerCase().contains(b.toLowerCase()));
    String stockText = card.stock > 0 ? '${card.stock} in stock' : 'Out of stock';
    Color stockColor = card.stock > 0 ? Colors.green.shade800 : Colors.red.shade800;
    Color stockBg = card.stock > 0 ? Colors.green.shade50 : Colors.red.shade50;
    
    if (isBrandSeries) {
      stockText = "Contact for stock";
      stockColor = const Color(0xFF1E3A8A);
      stockBg = const Color(0xFFE0F2FE);
    }

    return GestureDetector(
      onTap: () {
        if (auth.isAdmin) {
          _showAdminOptions(context, card);
        } else {
          context.push('/product/${card.id}');
        }
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.grey.shade200),
          color: Color(0xFFFDFBF0),
        ),
        child: Column(
          children: [
            Expanded(
              child: Stack(
                children: [
                   Positioned.fill(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      child: CachedNetworkImage(
                        imageUrl: card.imageUrl,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(color: Colors.grey.shade100),
                      ),
                    ),
                  ),
                  if (card.isLatest)
                    Positioned(top: 10, left: 10, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: Colors.amber, borderRadius: BorderRadius.circular(8)), child: const Text('NEW', style: TextStyle(color: Color(0xFFFDFBF0), fontSize: 10, fontWeight: FontWeight.bold)))),
                  Positioned(
                    top: 8, right: 8,
                    child: GestureDetector(
                      onTap: () => favs.toggleFavorite(card.id),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Color(0xFFFDFBF0).withValues(alpha: 0.8),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(isFav ? Icons.favorite : Icons.favorite_border, 
                          color: isFav ? Colors.red : Colors.grey.shade400,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(card.name, maxLines: 1, overflow: TextOverflow.ellipsis, 
                    style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.blueGrey[900])
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('₹${card.price}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: const Color(0xFF3A0303))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), 
                        decoration: BoxDecoration(color: stockBg, borderRadius: BorderRadius.circular(4)), 
                        child: Text(stockText, style: TextStyle(color: stockColor, fontSize: 8, fontWeight: FontWeight.bold))
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAdminOptions(BuildContext context, CardModel card) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(card.name, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      context.push('/admin/product', extra: card).then((v) => _fetchCards());
                    },
                    icon: const Icon(Icons.edit),
                    label: const Text('Edit Card'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, padding: const EdgeInsets.symmetric(vertical: 16)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      Navigator.pop(context);
                      bool? confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Delete Product'),
                          content: const Text('Are you sure you want to delete this card?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), style: ElevatedButton.styleFrom(backgroundColor: Colors.red), child: const Text('Delete')),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        final success = await _api.deleteCard(card.id);
                        if (success) _fetchCards();
                      }
                    },
                    icon: const Icon(Icons.delete),
                    label: const Text('Delete'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.symmetric(vertical: 16)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF333333), size: 24),
      title: Text(title, style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF333333))),
      onTap: onTap,
    );
  }

  Widget _buildExpansionTile(String title, dynamic content) {
    return ExpansionTile(
      leading: const Icon(Icons.folder_open, color: Color(0xFF333333)),
      title: Text(title, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF333333))),
      children: _buildContent(content),
    );
  }

  List<Widget> _buildContent(dynamic content) {
    if (content is List) {
      return content.map((cat) => ListTile(
        title: Text(cat, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500)),
        onTap: () {
          Navigator.pop(context);
          _filter(cat);
        },
      )).toList();
    } else if (content is Map) {
      return content.entries.map((entry) {
        return ExpansionTile(
          title: Text(entry.key, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold)),
          children: _buildContent(entry.value),
        );
      }).toList();
    }
    return [];
  }
}
