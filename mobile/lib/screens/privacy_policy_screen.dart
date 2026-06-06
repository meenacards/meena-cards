import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Privacy Policy', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF3A0303),
        foregroundColor: const Color(0xFFFDFBF0),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSection('1. Data Collection', 'We collect minimal data required for your account, including your name, address, and phone number for press registration.'),
            _buildSection('2. Media Usage', 'Our app is designed strictly for browsing wedding invitation cards and exploring our beautiful card catalog. We do not require, collect, or store any images, media, or personal photos from your device.'),
            _buildSection('3. Data Storage', 'Your account information and card choices are securely saved and stored in high-security, protected servers to ensure completely safe access.'),
            _buildSection('4. Contact Information', 'For any privacy concerns or general support, you can contact us at our official email: meenacards.mdu@gmail.com'),
            _buildSection('5. Data Protection', 'We implement industry-standard security measures to protect your data from unauthorized access or disclosure.'),
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
