import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'package:go_router/go_router.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  bool _showPassword = false;

  void _login() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields.')));
      return;
    }

    setState(() => _isLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final api = ApiService();

    try {
      // 1. Try Admin Login first
      final isAdminSuccess = await auth.loginAdmin(name, phone, api);
      if (!mounted) return;

      if (isAdminSuccess) {
        context.go('/');
      } else {
        // 2. Try Press Login
        final error = await auth.loginPress(name, phone, api);
        if (!mounted) return;
        if (error == null) {
           context.go('/');
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Column(
                    children: [
                      Hero(tag: 'login-logo', child: Image.asset('assets/images/logo.png', height: 120)),
                      const SizedBox(height: 12),
                      const Text(
                        'UNITING HEARTS, CELEBRATING STORIES',
                        style: TextStyle(color: Color(0xFF3A0303), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                Text(
                  'Welcome Back',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF3A0303),
                  ),
                ),
                const SizedBox(height: 8),
                Text('Sign in to continue to your dashboard', 
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(color: Colors.grey[600], fontSize: 16)
                ),
                const SizedBox(height: 48),
                const Text('Press Name', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF3A0303), fontSize: 16)),
                const SizedBox(height: 8),
                _buildField('e.g. Rajacardsmadurai', _nameController, Icons.business),
                const SizedBox(height: 24),
                const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF3A0303), fontSize: 16)),
                const SizedBox(height: 8),
                _buildField('e.g. 78068 93533', _phoneController, Icons.phone, isPass: true, isLast: true, isPhone: true),
                const SizedBox(height: 40),
                ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3A0303),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                  ),
                  child: _isLoading 
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Color(0xFFFDFBF0), strokeWidth: 2))
                      : const Text('Login', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFFDFBF0))),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: () => context.push('/register'),
                  style: TextButton.styleFrom(foregroundColor: const Color(0xFF3A0303)),
                  child: const Text('New Customer? Register here', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(String hint, TextEditingController controller, IconData icon, {bool isPass = false, bool isLast = false, bool isPhone = false}) {
    return TextFormField(
      controller: controller,
      keyboardType: isPhone ? TextInputType.phone : TextInputType.text,
      obscureText: isPass && !_showPassword,
      textInputAction: isLast ? TextInputAction.done : TextInputAction.next,
      onFieldSubmitted: (v) {
        if (isLast) _login();
      },
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey.shade400),
        prefixIcon: Icon(icon, color: const Color(0xFF3A0303)),
        suffixIcon: isPass 
          ? IconButton(
              icon: Icon(
                _showPassword ? Icons.visibility_off : Icons.visibility,
                color: const Color(0xFF3A0303),
              ),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            )
          : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF3A0303), width: 2)),
        filled: true,
        fillColor: Color(0xFFFDFBF0),
        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
      ),
    );
  }
}
