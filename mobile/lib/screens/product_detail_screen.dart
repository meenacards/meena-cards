import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/card_model.dart';
import '../services/api_service.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ProductDetailScreen extends StatefulWidget {
  final String cardId;
  const ProductDetailScreen({super.key, required this.cardId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final ApiService _api = ApiService();
  CardModel? _card;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    final card = await _api.fetchCard(widget.cardId);
    setState(() {
      _card = card;
      _isLoading = false;
    });
  }

  void _sendWhatsApp() async {
    if (_card == null) return;
    
    // Prioritizing the image URL for better WhatsApp rich preview
    final message = "Interested in: ${_card!.name}\n"
                    "Image: ${_card!.imageUrl}\n\n"
                    "Hello Meena Cards! I'm interested in this card design.\n"
                    "Price: ₹${_card!.price}\n"
                    "Product Page: https://meenacards.com/product/${_card!.id}";
                    
    // Admin WhatsApp Number (India)
    const phone = "919965125250"; 
    final url = "https://wa.me/+$phone?text=${Uri.encodeComponent(message)}";
    
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_card == null) return const Scaffold(body: Center(child: Text('Product not found')));

    return Scaffold(
      backgroundColor: Color(0xFFFDFBF0),
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          SliverToBoxAdapter(child: _buildDetails()),
          SliverToBoxAdapter(child: _buildSimilarSection()),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 450,
      backgroundColor: Color(0xFFFDFBF0),
      elevation: 0,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        background: Hero(
          tag: 'card-${_card!.id}',
          child: CachedNetworkImage(
            imageUrl: _card!.imageUrl,
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(color: Colors.grey.shade100),
          ),
        ),
      ),
      leading: IconButton(
        icon: const CircleAvatar(backgroundColor: Color(0xFFFDFBF0), child: Icon(Icons.arrow_back, color: Color(0xFF3A0303))),
        onPressed: () => Navigator.pop(context),
      ),
    );
  }

  Widget _buildDetails() {
    final brandSeries = ["V Cards", "K Cards", "R Cards", "ES Cards", "Brand Series"];
    bool isBrandSeries = _card!.categories.any((c) => brandSeries.any((b) => c.toLowerCase() == b.toLowerCase())) ||
                         brandSeries.any((b) => _card!.name.toLowerCase().contains(b.toLowerCase()));
    String stockText = _card!.stock > 0 ? '${_card!.stock} in stock' : 'Out of stock';
    Color stockColor = _card!.stock > 0 ? Colors.green.shade800 : Colors.red.shade800;
    Color stockBg = _card!.stock > 0 ? Colors.green.shade50 : Colors.red.shade50;
    
    if (isBrandSeries) {
      stockText = "Contact for stock";
      stockColor = const Color(0xFF1E3A8A);
      stockBg = const Color(0xFFE0F2FE);
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
      decoration: const BoxDecoration(
        color: Color(0xFFFDFBF0),
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(_card!.name, 
                  style: GoogleFonts.playfairDisplay(fontSize: 28, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))
                ),
              ),
              if (_card!.isLatest)
                Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.amber.shade50, shape: BoxShape.circle), child: const Icon(Icons.star, color: Colors.amber, size: 24)),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: _card!.categories.map((c) => Chip(
              label: Text(c, style: const TextStyle(fontSize: 10, color: Colors.blueGrey)),
              backgroundColor: Colors.blueGrey.shade50,
              padding: EdgeInsets.zero,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              side: BorderSide.none,
            )).toList(),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Text('₹${_card!.price}', style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w700, color: const Color(0xFF3A0303))),
              const SizedBox(width: 12),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: stockBg, borderRadius: BorderRadius.circular(10)), child: Text(stockText, style: TextStyle(color: stockColor, fontWeight: FontWeight.bold, fontSize: 13))),
            ],
          ),
          const SizedBox(height: 24),
          if (_card!.description.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              _card!.description,
              style: GoogleFonts.outfit(fontSize: 15, color: Colors.grey[700], height: 1.6),
            ),
          ],
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildSimilarSection() {
     return const Column(children: [SizedBox(height: 20)]);
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      decoration: BoxDecoration(
        color: Color(0xFFFDFBF0),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, -5))],
      ),
      child: ElevatedButton(
        onPressed: _sendWhatsApp,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF3A0303),
          padding: const EdgeInsets.symmetric(vertical: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.chat_bubble_outline, color: Color(0xFFFDFBF0)),
            const SizedBox(width: 12),
            Text('ENQUIRE NOW', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Color(0xFFFDFBF0))),
          ],
        ),
      ),
    );
  }
}
