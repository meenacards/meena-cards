import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/card_model.dart';
import '../models/press_model.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final ApiService _api = ApiService();
  List<CardModel> _cards = [];
  List<Press> _presses = [];
  List<Press> _pendingPresses = [];
  bool _isLoading = true;
  bool _isLoadingPresses = true;
  String _searchQuery = "";
  String _pressSearchQuery = "";
  int _selectedIndex = 0; // 0 for Products, 1 for Presses, 2 for Requests

  @override
  void initState() {
    super.initState();
    _fetchData();
    _fetchPresses();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    final cards = await _api.fetchCards();
    setState(() {
      _cards = cards;
      _isLoading = false;
    });
  }



  Future<void> _fetchPresses() async {
    setState(() => _isLoadingPresses = true);
    final res = await _api.fetchPresses();
    final pending = await _api.fetchPendingPresses();
    if (mounted) {
      setState(() {
        _presses = res;
        _pendingPresses = pending;
        _isLoadingPresses = false;
      });
    }
  }

  void _handleApproval(Press press, bool approve) async {
    String? reason;
    if (!approve) {
      // Show dialog to enter rejection reason
      final reasonController = TextEditingController();
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Reject Registration'),
          content: TextField(
            controller: reasonController,
            decoration: const InputDecoration(hintText: 'Enter reason for rejection'),
            maxLines: 3,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Reject'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
      reason = reasonController.text.trim();
      if (reason.isEmpty) reason = "Incomplete documentation or invalid details.";
    }

    bool success;
    if (approve) {
      success = await _api.approvePress(press.id);
    } else {
      success = await _api.rejectPress(press.id);
    }

    if (success) {
      // Send WhatsApp Notification
      final status = approve ? "APPROVED" : "REJECTED";
      String message = "Hello ${press.name},\nYour registration request for Meena Cards has been $status.";
      
      if (approve) {
        message += "\nYou can now login to the app with your name and phone number.";
      } else {
        message += "\nReason: $reason\n\nPlease contact admin if you think this is a mistake.";
      }
      
      final url = "https://wa.me/+91${press.phNo}?text=${Uri.encodeComponent(message)}";
      if (await canLaunchUrl(Uri.parse(url))) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
      _fetchPresses(); // Refresh lists
    }
  }


  void _showAddEditScreen([CardModel? card]) async {
    final result = await context.push('/admin/product', extra: card);
    if (result == true) _fetchData();
  }

  void _showAdminOptions(CardModel card) {
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
                      _showAddEditScreen(card);
                    },
                    icon: const Icon(Icons.edit),
                    label: const Text('Edit Card'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, padding: const EdgeInsets.symmetric(vertical: 16)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _deleteCard(card.id);
                    },
                    icon: const Icon(Icons.delete),
                    label: const Text('Delete Card'),
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

  void _deleteCard(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: const Text('Are you sure you want to delete this card?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await _api.deleteCard(id);
      if (success) _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    // Group cards by category for the main view
    Map<String, List<CardModel>> grouped = {};
    for (var card in _cards) {
      final q = _searchQuery.toLowerCase();
      bool matchesName = card.name.toLowerCase().contains(q);
      bool matchesCat = card.categories.any((c) => c.toLowerCase().contains(q));
      
      if (_searchQuery.isNotEmpty && !matchesName && !matchesCat) continue;
      
      for (var cat in card.categories) {
        if (!grouped.containsKey(cat)) grouped[cat] = [];
        grouped[cat]!.add(card);
      }
    }

    final sortedCats = grouped.keys.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: Hero(tag: 'logo', child: Image.asset('assets/images/logo.png', height: 55)),
        backgroundColor: const Color(0xFF3A0303),
        elevation: 4,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Color(0xFFFDFBF0)),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        actions: [
          IconButton(
            onPressed: () { 
              _fetchData(); 
              _fetchPresses();
            }, 
            icon: const Icon(Icons.refresh, color: Color(0xFFFDFBF0)),
            tooltip: 'Refresh',
          ),
          IconButton(
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(), 
            icon: const Icon(Icons.logout, color: Color(0xFFFDFBF0)),
            tooltip: 'Logout',
          ),
        ],
      ),
      drawer: _AdminDrawer(onCategorySelected: (cat) {
        setState(() {
          _searchQuery = cat;
          _selectedIndex = 0; // Switch to Products tab when category clicked
        });
        Navigator.pop(context); // Close drawer
      }),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildProductsView(sortedCats, grouped),
          _buildPressesView(),
          _buildRequestsView(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() => _selectedIndex = index);
          if (index == 2) _fetchPresses(); // Auto-refresh when entering Requests tab
        },
        selectedItemColor: const Color(0xFF3A0303),
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.inventory), label: 'Products'),
          const BottomNavigationBarItem(icon: Icon(Icons.business), label: 'Presses'),
          BottomNavigationBarItem(
            icon: Badge(
              label: Text(_pendingPresses.length.toString()),
              isLabelVisible: _pendingPresses.isNotEmpty,
              child: const Icon(Icons.notifications_active),
            ), 
            label: 'Requests'
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _selectedIndex == 1 ? _showAddEditPress() : _showAddEditScreen(),
        label: Text(_selectedIndex == 1 ? 'Add Press' : 'Add New Card', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFDFBF0))),
        icon: const Icon(Icons.add, color: Color(0xFFFDFBF0)),
        backgroundColor: const Color(0xFF8E0909),
        elevation: 12,
      ),
    );
  }


  Widget _buildProductsView(List<String> sortedCats, Map<String, List<CardModel>> grouped) {
    return Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                suffixIcon: _searchQuery.isNotEmpty ? IconButton(icon: const Icon(Icons.clear), onPressed: () => setState(() => _searchQuery = "")) : null,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: sortedCats.length,
              itemBuilder: (context, idx) {
                final cat = sortedCats[idx];
                final catCards = grouped[cat]!;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                      child: Row(
                        children: [
                          Container(width: 4, height: 20, color: const Color(0xFF3A0303)),
                          const SizedBox(width: 8),
                          Text(cat.toUpperCase(), style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1.1, color: Colors.blueGrey[800])),
                        ],
                      ),
                    ),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: catCards.length,
                      itemBuilder: (context, index) {
                        final card = catCards[index];
                        return GestureDetector(
                          onTap: () => _showAdminOptions(card),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Color(0xFFFDFBF0),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                              border: Border.all(color: Colors.grey.shade100),
                            ),
                            child: Column(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                    child: Image.network(card.imageUrl, width: double.infinity, fit: BoxFit.cover),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(card.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      const SizedBox(height: 4),
                                      Text('₹${card.price}', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                );
              },
            ),
          ),
        ],
      );
  }

  Widget _buildPressesView() {
    if (_isLoadingPresses) return const Center(child: CircularProgressIndicator());

    final query = _pressSearchQuery.trim().toLowerCase();
    final filteredPresses = query.isEmpty
        ? _presses
        : _presses.where((press) {
            return press.name.toLowerCase().contains(query) || press.address.toLowerCase().contains(query);
          }).toList();

    if (_presses.isEmpty) return const Center(child: Text('No presses registered yet.'));
    if (filteredPresses.isEmpty) return const Center(child: Text('No presses matched your search.'));

    Map<String, List<Press>> addrGroups = {};
    for (var p in filteredPresses) {
      if (!addrGroups.containsKey(p.address)) addrGroups[p.address] = [];
      addrGroups[p.address]!.add(p);
    }
    final sortedAddrs = addrGroups.keys.toList()..sort();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search presses by name or address...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              suffixIcon: _pressSearchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(() => _pressSearchQuery = ''),
                    )
                  : null,
            ),
            onChanged: (value) => setState(() => _pressSearchQuery = value),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: sortedAddrs.length,
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, idx) {
              final addr = sortedAddrs[idx];
              final group = addrGroups[addr]!;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(addr.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF3A0303))),
                  ),
                  ...group.map((press) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(press.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text([
                        if (press.address.isNotEmpty) press.address,
                        if (press.phNo.isNotEmpty) press.phNo else 'No phone number',
                        if (press.gstin.isNotEmpty) 'GSTIN: ${press.gstin}',
                      ].join(' • ')),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(icon: const Icon(Icons.edit, color: Colors.blue), onPressed: () => _showAddEditPress(press)),
                          IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _deletePress(press.id)),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 16),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRequestsView() {
    if (_isLoadingPresses) return const Center(child: CircularProgressIndicator());
    if (_pendingPresses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No pending requests', style: GoogleFonts.outfit(color: Colors.grey.shade500, fontSize: 18)),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: _pendingPresses.length,
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        final press = _pendingPresses[index];
        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(press.name, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                      child: Text('PENDING', style: TextStyle(color: Colors.orange.shade800, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(children: [const Icon(Icons.phone, size: 14, color: Colors.grey), const SizedBox(width: 8), Text(press.phNo, style: const TextStyle(color: Colors.grey))]),
                const SizedBox(height: 4),
                Row(children: [const Icon(Icons.location_on, size: 14, color: Colors.grey), const SizedBox(width: 8), Expanded(child: Text(press.address, style: const TextStyle(color: Colors.grey)))]),
                if (press.gstin.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Row(children: [const Icon(Icons.receipt_long, size: 14, color: Colors.grey), const SizedBox(width: 8), Expanded(child: Text('GSTIN: ${press.gstin}', style: const TextStyle(color: Colors.grey)))]),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _handleApproval(press, false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('REJECT'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _handleApproval(press, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3A0303),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('APPROVE'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAddEditPress([Press? press]) async {
    final nameController = TextEditingController(text: press?.name ?? '');
    final addrController = TextEditingController(text: press?.address ?? '');
    final phoneController = TextEditingController(text: press?.phNo ?? '');
    final gstinController = TextEditingController(text: press?.gstin ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(press == null ? 'Add Press' : 'Edit Press'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Press Name')),
              TextField(controller: addrController, decoration: const InputDecoration(labelText: 'Address')),
              TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Phone Number')),
              TextField(controller: gstinController, decoration: const InputDecoration(labelText: 'GSTIN')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isEmpty || addrController.text.isEmpty) return;
              bool success = false;
              try {
                if (press == null) {
                  final newPress = await _api.addPress(
                    name: nameController.text,
                    address: addrController.text,
                    phNo: phoneController.text,
                    gstin: gstinController.text,
                  );
                  success = newPress != null;
                } else {
                  final updPress = await _api.updatePress(
                    press.id,
                    name: nameController.text,
                    address: addrController.text,
                    phNo: phoneController.text,
                    gstin: gstinController.text,
                  );
                  success = updPress != null;
                }
              } catch (err) {
                final msg = err is String ? err : 'Failed to save press.';
                if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(msg)));
                return;
              }
              if (success && ctx.mounted) Navigator.pop(ctx, true);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3A0303)),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result == true) _fetchPresses();
  }

  void _deletePress(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Press'),
        content: const Text('Are you sure you want to delete this press record?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), style: ElevatedButton.styleFrom(backgroundColor: Colors.red), child: const Text('Delete')),
        ],
      ),
    );

    if (confirm == true) {
      final success = await _api.deletePress(id);
      if (success) _fetchPresses();
    }
  }

}class _AdminDrawer extends StatelessWidget {
  final Function(String) onCategorySelected;
  const _AdminDrawer({required this.onCategorySelected});

  @override
  Widget build(BuildContext context) {
    return Drawer(
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
          _buildDrawerItem(Icons.grid_view_rounded, 'All Products', () => onCategorySelected("")),
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
          _buildDrawerItem(Icons.logout, 'Logout', () {
            Navigator.pop(context);
            Provider.of<AuthProvider>(context, listen: false).logout();
          }),
          const SizedBox(height: 20),
        ],
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

  Widget _buildExpansionTile(String title, dynamic content) {
    return ExpansionTile(
      leading: const Icon(Icons.folder_open, color: Color(0xFF333333)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF333333))),
      children: _buildContent(content),
    );
  }

  List<Widget> _buildContent(dynamic content) {
    if (content is List) {
      return content.map((cat) => ListTile(
        title: Text(cat, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        onTap: () => onCategorySelected(cat),
      )).toList();
    } else if (content is Map) {
      return content.entries.map((entry) {
        return ExpansionTile(
          title: Text(entry.key, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          children: _buildContent(entry.value),
        );
      }).toList();
    }
    return [];
  }
}

