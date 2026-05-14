import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Terms & Conditions', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF3A0303),
        foregroundColor: const Color(0xFFFDFBF0),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSection('1. Acceptance', 'By using the Meena Cards app, you agree to comply with our terms and conditions.'),
            _buildSection('2. Admin Control', 'Admin has the right to approve or reject press registrations based on internal verification.'),
            _buildSection('3. Product Information', 'All card designs and prices are subject to change without prior notice.'),
            _buildSection('4. Prohibited Activities', 'Unauthorized access to admin panels or attempts to manipulate card data are strictly prohibited.'),
            _buildSection('5. Liability', 'Meena Cards is not liable for any delays caused by network issues or third-party service failures.'),
            const SizedBox(height: 20),
            Text('Last updated: May 2026', style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))),
          const SizedBox(height: 8),
          Text(content, style: GoogleFonts.outfit(fontSize: 14, color: Colors.black87, height: 1.5)),
        ],
      ),
    );
  }
}
