import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  void _register() async {
    final name = _nameController.text.trim();
    final address = _addressController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty || address.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields')),
      );
      return;
    }

    setState(() => _isLoading = true);
    final api = ApiService();

    try {
      final res = await api.registerPress(
        name: name,
        address: address,
        phNo: phone,
      );

      if (res != null) {
        // Show WhatsApp redirect dialog
        _showApprovalDialog(name, phone);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registration failed. Try again.')),
        );
      }
    } on DioException catch (e) {
      String msg = "Error occurred during registration.";
      if (e.response?.data is Map && e.response?.data['error'] != null) {
        msg = e.response?.data['error'];
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showApprovalDialog(String name, String phone) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            const Icon(Icons.check_circle_outline, color: Colors.green, size: 60),
            const SizedBox(height: 16),
            Text('Registration Submitted', style: GoogleFonts.playfairDisplay(fontWeight: FontWeight.bold, fontSize: 22)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Your request for $name has been received. To activate your account, please send an approval request to our admin on WhatsApp.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(color: Colors.grey[700]),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _sendWhatsAppRequest(name, phone),
              icon: const Icon(Icons.chat_bubble_outline),
              label: const Text('Send WhatsApp Request'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3A0303),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _sendWhatsAppRequest(String name, String phone) async {
    final message = "Registration Approval Request\nName: $name\nPhone: $phone\nPlease approve my account for Meena Cards.";
    const adminPhone = "919965125250";
    final url = "https://wa.me/+$adminPhone?text=${Uri.encodeComponent(message)}";
    
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      if (mounted) {
        Navigator.pop(context); // Close dialog
        context.go('/login'); // Return to login
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDFBF0),
      appBar: AppBar(
        title: Hero(tag: 'logo', child: Image.asset('assets/images/logo.png', height: 45)),
        centerTitle: true,
        backgroundColor: const Color(0xFF3A0303),
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFFFDFBF0)),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 10),
              Center(
                child: Column(
                  children: [
                    Hero(tag: 'login-logo', child: Image.asset('assets/images/logo.png', height: 100)),
                    const SizedBox(height: 12),
                    const Text(
                      'UNITING HEARTS, CELEBRATING STORIES',
                      style: TextStyle(color: Color(0xFF3A0303), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Join Meena Cards',
                textAlign: TextAlign.center,
                style: GoogleFonts.playfairDisplay(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF3A0303),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Apply for a new press account',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(color: Colors.grey[600], fontSize: 16),
              ),
              const SizedBox(height: 48),
              
              _buildFieldLabel('Press Name'),
              _buildField('e.g. Meena Digital Press', _nameController, Icons.business),
              
              const SizedBox(height: 24),
              _buildFieldLabel('Full Address'),
              _buildField('e.g. 123, Main Road, Madurai', _addressController, Icons.location_on, maxLines: 2),
              
              const SizedBox(height: 24),
              _buildFieldLabel('Phone Number'),
              _buildField('e.g. 9876543210', _phoneController, Icons.phone, isLast: true, isPhone: true),
              
              const SizedBox(height: 48),
              ElevatedButton(
                onPressed: _isLoading ? null : _register,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3A0303),
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                ),
                child: _isLoading 
                    ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Color(0xFFFDFBF0), strokeWidth: 2))
                    : const Text('Submit Application', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFFDFBF0))),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => context.pop(),
                style: TextButton.styleFrom(foregroundColor: const Color(0xFF3A0303)),
                child: const Text('Already have an account? Login', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF3A0303), fontSize: 16)),
    );
  }

  Widget _buildField(String hint, TextEditingController controller, IconData icon, {bool isLast = false, int maxLines = 1, bool isPhone = false}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: isPhone ? TextInputType.phone : TextInputType.text,
      textInputAction: isLast ? TextInputAction.done : TextInputAction.next,
      onFieldSubmitted: (v) {
        if (isLast) _register();
      },
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey.shade400),
        prefixIcon: Icon(icon, color: const Color(0xFF3A0303)),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF3A0303), width: 2)),
        filled: true,
        fillColor: const Color(0xFFFDFBF0),
        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
      ),
    );
  }
}
