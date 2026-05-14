
class Press {
  final String id;
  final String name;
  final String address;
  final String phNo;

  Press({
    required this.id,
    required this.name,
    required this.address,
    required this.phNo,
  });

  factory Press.fromJson(Map<String, dynamic> json) {
    return Press(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      phNo: json['ph_no'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'address': address,
      'ph_no': phNo,
    };
  }
}
