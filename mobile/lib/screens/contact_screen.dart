import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  Future<void> _launchURL(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _sendWhatsApp() {
    const phone = "919965125250";
    const message = "Hello Meena Cards! I'm interested in your card designs.";
    final url = "https://wa.me/$phone?text=${Uri.encodeComponent(message)}";
    _launchURL(url);
  }

  void _makeCall(String phoneNumber) {
    _launchURL("tel:$phoneNumber");
  }

  void _sendEmail() {
    _launchURL("mailto:meenacards.mdu@gmail.com");
  }

  void _openMaps() {
    _launchURL("https://maps.google.com/?q=Meena+Cards+Madurai");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDFBF0),
      appBar: AppBar(
        title: Text('Contact Us', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFFFDFBF0))),
        backgroundColor: const Color(0xFF3A0303),
        iconTheme: const IconThemeData(color: Color(0xFFFDFBF0)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header Image Panel
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.asset(
                  'assets/images/shop.jpeg',
                  height: 220,
                  fit: BoxFit.cover,
                ),
              ),
            ),

            // About Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 10)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.storefront, color: Color(0xFFD4AF37), size: 28),
                        const SizedBox(width: 12),
                        Text('About MEENA CARDS', 
                          style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: const Color(0xFF1E3A8A))
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Welcome to Meena Cards, your premier destination for timeless wedding invitations. We specialize in exquisite handcrafted designs that blend perfection with tradition.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey[700], height: 1.6),
                    ),
                    const SizedBox(height: 24),
                    
                    // Business Hours
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.access_time, color: Color(0xFFD4AF37), size: 20),
                              const SizedBox(width: 8),
                              Text('Business Hours', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Column(
                            children: [
                              _buildTimeRow('Mon - Sat', '10:00 AM - 9:00 PM'),
                              const Divider(height: 16, color: Colors.black12),
                              _buildTimeRow('Sunday', '10:00 AM - 2:00 PM', isSpecial: true),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Contact Options Gridish layout
            _buildContactCard(
              icon: Icons.phone_android,
              title: 'Direct Contact',
              subtitle: 'Owner: 99651 25250\nOffice: 0452-7964782',
              buttonText: 'WhatsApp Now',
              onTap: _sendWhatsApp,
            ),

            _buildContactCard(
              icon: Icons.location_on_outlined,
              title: 'Main Showroom',
              subtitle: '62/1, Manjanakara Street,\nMadurai - 625001',
              buttonText: 'Find Location',
              onTap: _openMaps,
            ),

            _buildContactCard(
              icon: Icons.email_outlined,
              title: 'Inquiries Email',
              subtitle: 'meenacards.mdu@gmail.com',
              buttonText: 'Send Email',
              onTap: _sendEmail,
            ),

            // Social Section
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                   Text('Follow Us', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF3A0303))),
                   const SizedBox(height: 16),
                   Row(
                     mainAxisAlignment: MainAxisAlignment.center,
                     children: [
                       _buildSocialIcon(Icons.camera_alt, () => _launchURL("https://www.instagram.com/meena_cards")),
                       _buildSocialIcon(Icons.facebook, () => _launchURL("https://www.facebook.com/meenacards")),
                       _buildSocialIcon(Icons.public, () => _launchURL("https://meenacards.com")),
                     ],
                   )
                ],
              ),
            ),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeRow(String days, String time, {bool isSpecial = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(days, style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey[700], fontWeight: FontWeight.w500)),
        Text(time, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: isSpecial ? Colors.pink : Colors.black)),
      ],
    );
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String buttonText,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF3A0303), size: 30),
            const SizedBox(height: 12),
            Text(title, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center, style: GoogleFonts.outfit(color: Colors.grey[600])),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3A0303),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(buttonText),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSocialIcon(IconData icon, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10),
            ],
          ),
          child: Icon(icon, color: const Color(0xFF3A0303)),
        ),
      ),
    );
  }
}
