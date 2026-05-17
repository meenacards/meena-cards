class AppConstants {
  static const Map<String, dynamic> categoryHierarchy = {
    "Cards Only": {
      "1x5 Folding card only": ["Rani Series", "Vani Series", "Famous Series", "Meena Series", "Nila Series", "1 Side 3D", "2 side 3D", "Cute Series", "B Series", "K Series"],
      "12x8 Folding card only": ["Queen Series", "Vel 3D 1 side", "Meena color", "Browny Series", "Riya Series", "Mari Series", "J Series"],
      "Single Card Only": ["WS Series", "AS Series", "9x7 Metallic foil card", "10x8 Metallic foil card", "11x8 ACE card", "12x8 A Series", "XL Series"],
      "Pouch Card Set": ["9x5 Single Color Pouch", "9x7 Single Color Pouch", "9x7 Folding Pouch Set", "9x6 Single Color Pouch lock set"],
      "3 Folding Card": ["Jio 3 Folding Set", "Buff 3 Folding Set", "Offset 3 Folding Set", "Pearl Lock Card", "Rang XL Lock Card", "Daya Lock Card", "Trends Lock Card", "Theri Lock Card"],
      "2 Folding Card": ["Anu lilly 3D card only", "Anu lilly 3D Set Card"]
    },
    "Card, Cover, Paper Sets": {
      "9x6 Folding Set Card": ["9x6 Offset Set Card", "9x6 Metallic Set Card", "9x6 Color Set Card"],
      "7x7 Folding set Card": ["7x7 Offset Set Card", "7x7 Metallic Set Card"],
      "8x8 Folding Set Card": ["8x8 Sri Set", "8x8 Metallic Set"],
      "11x7 Folding Set Card": ["11x7 Rasi set"],
      "10x8 Folding set Card": ["10x8 Sana Gold", "10x8 Color Set", "10x8 Metallic Set"],
      "12x8 Folding Set Card": ["12x8 Star Set", "12x8 Metallic Set", "12x8 paper set"]
    },
    "Card, Cover, Board Sets": ["8x8 ITC Board Set", "10x8 Metallic ITC Board Set", "12x8 Metallic ITC Board Set", "12x8 Offset ITC Board Set"],
    "Brand Series": ["V Cards", "K Cards", "R Cards", "ES Cards"],
    "Ceremony Tags": ["Ear piercing", "Puberty", "House warming"],
    "Tradition Tags": ["Hindu", "Muslim", "Christian"],
    "Special Collections": ["Friends Card", "Luxe", "Offer"]
  };

  static List<String> get flatCategories {
    List<String> flat = [];
    void traverse(dynamic obj) {
      if (obj is List) {
        flat.addAll(obj.cast<String>());
      } else if (obj is Map) {
        obj.values.forEach(traverse);
      }
    }
    traverse(categoryHierarchy);
    return flat.toSet().toList()..sort();
  }

  static List<String> get orderedCategories {
    List<String> flat = [];
    void traverse(dynamic obj) {
      if (obj is List) {
        flat.addAll(obj.cast<String>());
      } else if (obj is Map) {
        for (var key in obj.keys) {
          flat.add(key.toString());
        }
        for (var val in obj.values) {
          traverse(val);
        }
      }
    }
    traverse(categoryHierarchy);
    for (var key in categoryHierarchy.keys) {
      flat.add(key);
    }
    return flat.toSet().toList();
  }
}
