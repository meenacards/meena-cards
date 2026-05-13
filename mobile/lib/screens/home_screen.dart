import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/card_model.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../providers/favorites_provider.dart';
import 'package:go_router/go_router.dart';
import '../utils/constants.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();
  List<CardModel> _latestCards = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchLatest();
  }

  Future<void> _fetchLatest() async {
    final cards = await _api.fetchCards();
    setState(() {
      _latestCards = cards.where((c) => c.isLatest).toList();
      _isLoading = false;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    if (query.trim().isEmpty) return;
    context.push('/catalog?search=${Uri.encodeComponent(query)}');
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    
    return Scaffold(
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
              context.go('/catalog');
            }),
            const Divider(height: 1),
            _buildDrawerItem(Icons.contact_support_rounded, 'Contact Us', () {
              Navigator.pop(context);
              context.push('/contact');
            }),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: AppConstants.categoryHierarchy.entries.map((entry) {
                  return _buildExpansionTile(context, entry.key, entry.value);
                }).toList(),
              ),
            ),
            const Divider(height: 1),
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
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(context, auth),
          SliverToBoxAdapter(child: _buildHero(context)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 32, 20, 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Latest Arrivals', 
                    style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))
                  ),
                  TextButton(
                    onPressed: () => context.go('/catalog'),
                    child: const Text('View All'),
                  ),
                ],
              ),
            ),
          ),
          _isLoading 
            ? const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator()))
            : SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.7,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _buildCardItem(context, _latestCards[index]),
                    childCount: _latestCards.length,
                  ),
                ),
              ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
      floatingActionButton: auth.isAdmin 
        ? FloatingActionButton.extended(
            onPressed: () => context.push('/admin/product').then((_) => _fetchLatest()),
            label: const Text('Add Card', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFDFBF0))),
            icon: const Icon(Icons.add, color: Color(0xFFFDFBF0)),
            backgroundColor: const Color(0xFF3A0303),
          )
        : null,
    );
  }

  Widget _buildSliverAppBar(BuildContext context, AuthProvider auth) {
    return SliverAppBar(
      pinned: true,
      expandedHeight: 60,
      backgroundColor: const Color(0xFF3A0303),
      elevation: 0,
      leading: Builder(
        builder: (context) => IconButton(
          icon: const Icon(Icons.menu, color: Color(0xFFFDFBF0)),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.contact_support_outlined, color: Color(0xFFFDFBF0)),
          onPressed: () => context.push('/contact'),
        ),
        IconButton(
          icon: const Icon(Icons.favorite_border, color: Color(0xFFFDFBF0)),
          onPressed: () => context.push('/favorites'),
        ),
        IconButton(
          icon: Icon(
            auth.isAuthenticated ? Icons.account_circle : Icons.person_outline, 
            color: Colors.white
          ),
          onPressed: () => auth.isAuthenticated ? context.push('/profile') : context.go('/login'),
        ),
      ],
    );
  }

  Widget _buildHero(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: const BoxDecoration(
        color: Color(0xFF3A0303),
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(32), bottomRight: Radius.circular(32)),
      ),
      child: Column(
        children: [
          Hero(tag: 'logo', child: Image.asset('assets/images/logo.png', height: 180)),
          const SizedBox(height: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Modern Invitation\nCollections', 
                style: GoogleFonts.playfairDisplay(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2)
              ),
              const SizedBox(height: 12),
              Text('Crafting memories since decades with premium designs.', 
                style: GoogleFonts.outfit(fontSize: 16, color: Colors.white70)
              ),
              const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                      ),
                      child: TextField(
                        controller: _searchController,
                        style: const TextStyle(color: Colors.white),
                        textInputAction: TextInputAction.search,
                        onSubmitted: _onSearch,
                        decoration: InputDecoration(
                          hintText: 'Search for cards...',
                          hintStyle: const TextStyle(color: Colors.white60),
                          border: InputBorder.none,
                          icon: IconButton(
                            icon: const Icon(Icons.search, color: Colors.white70),
                            onPressed: () => _onSearch(_searchController.text),
                          ),
                        ),
                      ),
                    ),
            ],
          ),
        ],
      ),
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
    Color stockColor = card.stock > 0 ? Colors.green : Colors.red;
    
    if (isBrandSeries) {
      stockText = "Contact for stock";
      stockColor = const Color(0xFF1E3A8A); // Blue-ish unique color
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
          color: Color(0xFFFDFBF0),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 5)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    child: CachedNetworkImage(
                      imageUrl: card.imageUrl,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(color: Colors.grey.shade100),
                    ),
                  ),
                  if (card.isOffer)
                    Positioned(
                      top: 12, left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF3A0303), borderRadius: BorderRadius.circular(8)),
                        child: const Text('OFFER', style: TextStyle(color: Color(0xFFFDFBF0), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ),
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
                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('₹${card.price}', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))),
                      Text(stockText, style: TextStyle(color: stockColor, fontSize: 10, fontWeight: FontWeight.bold)),
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
                      context.push('/admin/product', extra: card).then((v) => _fetchLatest());
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
                        if (success) _fetchLatest();
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
      leading: Icon(icon, color: const Color(0xFF333333)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF333333))),
      onTap: onTap,
    );
  }

  Widget _buildExpansionTile(BuildContext context, String title, dynamic content) {
    return ExpansionTile(
      leading: const Icon(Icons.folder_open, color: Color(0xFF333333)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF333333))),
      children: _buildContent(context, content),
    );
  }

  List<Widget> _buildContent(BuildContext context, dynamic content) {
    if (content is List) {
      return content.map((cat) => ListTile(
        title: Text(cat, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        onTap: () {
          Navigator.pop(context);
          context.push('/catalog?category=${Uri.encodeComponent(cat)}');
        },
      )).toList();
    } else if (content is Map) {
      return content.entries.map((entry) {
        return ExpansionTile(
          title: Text(entry.key, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          children: _buildContent(context, entry.value),
        );
      }).toList();
    }
    return [];
  }
}
