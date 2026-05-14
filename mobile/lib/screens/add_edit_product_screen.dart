import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../models/card_model.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import '../services/image_upload_service.dart';

class AddEditProductScreen extends StatefulWidget {
  final CardModel? card;
  const AddEditProductScreen({super.key, this.card});

  @override
  State<AddEditProductScreen> createState() => _AddEditProductScreenState();
}

class _AddEditProductScreenState extends State<AddEditProductScreen> {
  final _api = ApiService();
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _descController = TextEditingController();
  
  List<String> _selectedCategories = [];
  bool _isLatest = false;
  bool _isOffer = false;
  File? _imageFile;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.card != null) {
      _nameController.text = widget.card!.name;
      _priceController.text = widget.card!.price.toString();
      _stockController.text = widget.card!.stock.toString();
      _descController.text = widget.card!.description;
      _selectedCategories = List.from(widget.card!.categories);
      _isLatest = widget.card!.isLatest;
      _isOffer = widget.card!.isOffer;
    }
  }

  Future<void> _pickImage() async {
    try {
      final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
      if (picked != null) {
        if (!mounted) return;
        
        // Show loading
        setState(() => _isSubmitting = true);
        
        final processed = await ImageUploadService.processImage(File(picked.path));
        
        if (!mounted) return;
        setState(() {
          _imageFile = processed;
          _isSubmitting = false;
        });
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _submit() async {
    if (_nameController.text.isEmpty || _selectedCategories.isEmpty || (_imageFile == null && widget.card == null)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill required fields')));
      return;
    }

    setState(() => _isSubmitting = true);
    
    CardModel? result;
    if (widget.card == null) {
      result = await _api.addCard(
        name: _nameController.text,
        categories: _selectedCategories,
        image: _imageFile!,
        description: _descController.text,
        isLatest: _isLatest,
        isOffer: _isOffer,
        price: double.tryParse(_priceController.text) ?? 0.0,
        stock: int.tryParse(_stockController.text) ?? 0,
      );
    } else {
      result = await _api.updateCard(
        widget.card!.id,
        name: _nameController.text,
        categories: _selectedCategories,
        image: _imageFile,
        description: _descController.text,
        isLatest: _isLatest,
        isOffer: _isOffer,
        price: double.tryParse(_priceController.text) ?? 0.0,
        stock: int.tryParse(_stockController.text) ?? 0,
      );
    }

    setState(() => _isSubmitting = false);
    if (!mounted) return;
    if (result != null) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.card == null ? 'Add New Card' : 'Edit Card', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Color(0xFFFDFBF0),
        foregroundColor: const Color(0xFF3A0303),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildTextField(_nameController, 'Card Name', Icons.title),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _buildTextField(_priceController, 'Price (₹)', Icons.money, isNum: true)),
                const SizedBox(width: 16),
                Expanded(child: _buildTextField(_stockController, 'Stock', Icons.inventory, isNum: true)),
              ],
            ),
            const SizedBox(height: 16),
            _buildCategorySelector(),
            const SizedBox(height: 16),
            Row(
              children: [
                Checkbox(value: _isLatest, onChanged: (v) => setState(() => _isLatest = v!)),
                const Text('Is Latest Arrival'),
                const Spacer(),
                Checkbox(value: _isOffer, onChanged: (v) => setState(() => _isOffer = v!)),
                const Text('Is Offer Card'),
              ],
            ),
            const SizedBox(height: 16),
            _buildImagePicker(),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 55),
                backgroundColor: const Color(0xFF3A0303),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isSubmitting 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Color(0xFFFDFBF0), strokeWidth: 2)) 
                : const Text('Save Product', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFFDFBF0))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {bool isNum = false}) {
    return TextField(
      controller: controller,
      keyboardType: isNum ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.grey[50],
      ),
    );
  }

  Widget _buildCategorySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Categories (Tap to select multiple)', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          height: 150,
          decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(12)),
          child: ListView(
            children: AppConstants.flatCategories.map((cat) => CheckboxListTile(
              title: Text(cat, style: const TextStyle(fontSize: 12)),
              value: _selectedCategories.contains(cat),
              dense: true,
              activeColor: const Color(0xFF3A0303),
              onChanged: (v) {
                setState(() {
                  if (v!) {
                    _selectedCategories.add(cat);
                  } else {
                    _selectedCategories.remove(cat);
                  }
                });
              },
            )).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildImagePicker() {
    return InkWell(
      onTap: _pickImage,
      child: Container(
        height: 150,
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!), 
          borderRadius: BorderRadius.circular(12), 
          color: Colors.grey[50]
        ),
        child: _imageFile != null 
          ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(_imageFile!, fit: BoxFit.cover))
          : (widget.card != null 
              ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(widget.card!.imageUrl, fit: BoxFit.cover))
              : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.image, size: 40, color: Colors.grey), SizedBox(height: 8), Text('Select Image', style: TextStyle(color: Colors.grey))])),
      ),
    );
  }
}
