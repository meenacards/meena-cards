import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from werkzeug.security import generate_password_hash, check_password_hash

# Load env variables
load_dotenv()

app = Flask(__name__)

# Restrict CORS to known app origins in production.
# Keep desktop and local development origins enabled for Electron billing app.
_frontend_url = os.getenv("FRONTEND_URL")
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "null",  # Electron file:// origin appears as null
]
if _frontend_url:
    _allowed_origins.insert(0, _frontend_url)
CORS(app, origins="*" if not _frontend_url else _allowed_origins)

# MongoDB setup
MONGODB_URI = os.getenv("MONGODB_URI")
if MONGODB_URI:
    client = MongoClient(MONGODB_URI)
    try:
        # Use 'card_shop' database explicitly
        db = client["card_shop"]
    except Exception:
        db = client.card_shop
        
    cards_collection = db["cards"]
    customers_collection = db["customers"]
    invoices_collection = db["invoices"]
    presses_collection = db["presses"]
else:
    cards_collection = None
    customers_collection = None
    invoices_collection = None
    presses_collection = None
    print("WARNING: MONGODB_URI not set")

# Cloudinary setup
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def parse_object_id(card_id):
    """Return ObjectId if valid, else None."""
    try:
        return ObjectId(card_id)
    except (InvalidId, Exception):
        return None

def format_card(card):
    category = card.get("category")
    # Convert string categories from legacy data to lists for consistency
    if isinstance(category, str):
        category = [cat.strip() for cat in category.split(",") if cat.strip()]
    elif not category:
        category = []
        
    return {
        "id": str(card["_id"]),
        "name": card.get("name"),
        "category": category,
        "image_url": card.get("image_url"),
        "description": card.get("description", ""),
        "is_latest": card.get("is_latest", False),
        "is_offer": card.get("is_offer", False),
        "price": card.get("price", 0.0),
        "stock": card.get("stock", 0)
    }

def format_press(press):
    return {
        "id": str(press["_id"]),
        "name": press.get("name"),
        "address": press.get("address"),
        "ph_no": press.get("ph_no", "")
    }


@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "Card Shop API"}), 200

@app.route("/upload", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "No image part"}), 400
    
    image = request.files["image"]
    if not image.filename:
        return jsonify({"error": "Empty file uploaded"}), 400
    
    try:
        # Upload image to Cloudinary in 'Card_Shop' folder
        upload_result = cloudinary.uploader.upload(
            image,
            folder="Card_Shop"
        )
        return jsonify({"secure_url": upload_result.get("secure_url")}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/cards", methods=["GET"])
def get_cards():
    if cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    cards = list(cards_collection.find().sort('name', 1))
    return jsonify([format_card(c) for c in cards]), 200

@app.route("/cards/<card_id>", methods=["GET"])
def get_card(card_id):
    if cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(card_id)
    if oid is None:
        return jsonify({"error": "Invalid card ID format"}), 400
    try:
        card = cards_collection.find_one({"_id": oid})
        if card:
            return jsonify(format_card(card)), 200
        return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/cards", methods=["POST"])
def add_card():
    if cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    if "image" not in request.files:
        return jsonify({"error": "No image part"}), 400

    image = request.files["image"]
    name = request.form.get("name")
    
    # Handle multiple categories from form
    categories = request.form.getlist("category")
    if not categories:
        # Fallback if sent as a single string (comma separated)
        category_str = request.form.get("category")
        categories = [c.strip() for c in category_str.split(",")] if category_str else []

    description = request.form.get("description", "")

    if not name or not categories:
        return jsonify({"error": "Name and category are required"}), 400
    if not image.filename:
        return jsonify({"error": "Empty file uploaded"}), 400

    try:
        # Upload image to Cloudinary in 'Card_Shop' folder
        upload_result = cloudinary.uploader.upload(
            image,
            folder="Card_Shop"
        )
        image_url = upload_result.get("secure_url")

        new_card = {
            "name": name,
            "category": categories,
            "image_url": image_url,
            "description": description,
            "is_latest": request.form.get("is_latest") == 'true',
            "is_offer": request.form.get("is_offer") == 'true',
            "price": float(request.form.get("price", 0.0)),
            "stock": int(request.form.get("stock", 0))
        }

        result = cards_collection.insert_one(new_card)
        new_card["_id"] = result.inserted_id
        
        return jsonify(format_card(new_card)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/cards/<card_id>", methods=["PUT"])
def update_card(card_id):
    if cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(card_id)
    if oid is None:
        return jsonify({"error": "Invalid card ID format"}), 400

    update_data = {}
    
    # Can update via form (if image uploaded) or json
    if request.content_type and "multipart/form-data" in request.content_type:
        if "name" in request.form: update_data["name"] = request.form["name"]
        
        # Handle multiple categories from form
        if "category" in request.form:
            categories = request.form.getlist("category")
            if not categories:
                category_str = request.form.get("category")
                categories = [c.strip() for c in category_str.split(",")] if category_str else []
            update_data["category"] = categories

        if "description" in request.form: update_data["description"] = request.form["description"]
        if "is_latest" in request.form: update_data["is_latest"] = request.form["is_latest"] == 'true'
        if "is_offer" in request.form: update_data["is_offer"] = request.form["is_offer"] == 'true'
        if "price" in request.form: update_data["price"] = float(request.form["price"])
        if "stock" in request.form: update_data["stock"] = int(request.form["stock"])
        image = request.files.get("image")
    else:
        data = request.get_json() or {}
        if "name" in data: update_data["name"] = data["name"]
        if "category" in data: update_data["category"] = data["category"]
        if "description" in data: update_data["description"] = data["description"]
        if "is_latest" in data: update_data["is_latest"] = bool(data["is_latest"])
        if "is_offer" in data: update_data["is_offer"] = bool(data["is_offer"])
        if "price" in data: update_data["price"] = float(data["price"])
        if "stock" in data: update_data["stock"] = int(data["stock"])
        image = None

    try:
        if image and image.filename:
            # Upload new image
            upload_result = cloudinary.uploader.upload(
                image,
                folder="Card_Shop"
            )
            update_data["image_url"] = upload_result.get("secure_url")

        if not update_data:
            return jsonify({"error": "No data provided to update"}), 400
            
        result = cards_collection.update_one({"_id": oid}, {"$set": update_data})
        if result.matched_count == 0:
            return jsonify({"error": "Card not found"}), 404
            
        updated_card = cards_collection.find_one({"_id": oid})
        return jsonify(format_card(updated_card)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/cards/<card_id>", methods=["DELETE"])
def delete_card(card_id):
    if cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(card_id)
    if oid is None:
        return jsonify({"error": "Invalid card ID format"}), 400
    try:
        result = cards_collection.delete_one({"_id": oid})
        if result.deleted_count > 0:
            return jsonify({"message": "Card deleted successfully"}), 200
        return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Invoice Management ---

@app.route("/invoices", methods=["POST"])
def create_invoice():
    if invoices_collection is None or cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    items = data.get("items", [])
    subtotal = data.get("subtotal", 0)
    tax = data.get("tax", 0)
    total_amount = data.get("total_amount", 0)
    cgst_percent = data.get("cgst_percent", 9)
    sgst_percent = data.get("sgst_percent", 9)
    to_name = str(data.get("to_name", "")).strip()
    to_address = str(data.get("to_address", "")).strip()
    to_phone = str(data.get("to_phone", "")).strip()
    gstin = str(data.get("gstin", "")).strip()
    apply_terms_conditions = bool(data.get("apply_terms_conditions", False))
    
    if not items:
        return jsonify({"error": "Invoice must contain items"}), 400
    
    try:
        # Validate requested quantities before invoice creation.
        for item in items:
            card_id = item.get("id")
            quantity = int(item.get("quantity", 0))

            if not card_id or quantity <= 0:
                # Skip non-stock lines such as transportation charge rows.
                continue

            oid = parse_object_id(card_id)
            if oid is None:
                return jsonify({"error": "Invalid product ID in invoice items"}), 400

            card = cards_collection.find_one({"_id": oid}, {"name": 1, "stock": 1})
            if not card:
                return jsonify({"error": "One or more products were not found"}), 400

            available_stock = int(card.get("stock", 0))
            if quantity > available_stock:
                return jsonify({
                    "error": f"Insufficient stock for {card.get('name', 'product')}. Available: {available_stock}, requested: {quantity}"
                }), 400

        # Get the next invoice number
        last_invoice = invoices_collection.find_one(sort=[("invoice_number", -1)])
        invoice_number = (last_invoice.get("invoice_number", 0) if last_invoice else 0) + 1
        
        # Create invoice document
        invoice_doc = {
            "invoice_number": invoice_number,
            "items": items,
            "subtotal": float(subtotal),
            "tax": float(tax),
            "total_amount": float(total_amount),
            "cgst_percent": float(cgst_percent),
            "sgst_percent": float(sgst_percent),
            "apply_terms_conditions": apply_terms_conditions,
            "to_name": to_name,
            "to_address": to_address,
            "to_phone": to_phone,
            "gstin": gstin,
            "created_at": ObjectId().generation_time,
        }
        
        result = invoices_collection.insert_one(invoice_doc)
        invoice_doc["_id"] = str(result.inserted_id)
        
        # Update product stocks for each item in the invoice
        for item in items:
            card_id = item.get("id")
            quantity = int(item.get("quantity", 0))
            
            if card_id and quantity > 0:
                oid = parse_object_id(card_id)
                if oid:
                    # Decrease stock by quantity
                    cards_collection.update_one(
                        {"_id": oid},
                        {"$inc": {"stock": -quantity}}
                    )
        
        return jsonify({
            "invoice_number": invoice_number,
            "id": invoice_doc["_id"],
            "message": "Invoice created successfully"
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/invoices", methods=["GET"])
def get_invoices():
    if invoices_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    try:
        invoices = list(invoices_collection.find().sort("invoice_number", -1))
        result = []
        for inv in invoices:
            result.append({
                "id": str(inv["_id"]),
                "invoice_number": inv.get("invoice_number"),
                "items": inv.get("items", []),
                "subtotal": inv.get("subtotal", 0),
                "tax": inv.get("tax", 0),
                "total_amount": inv.get("total_amount", 0),
                "cgst_percent": inv.get("cgst_percent", 9),
                "sgst_percent": inv.get("sgst_percent", 9),
                "to_name": inv.get("to_name", ""),
                "to_address": inv.get("to_address", ""),
                "to_phone": inv.get("to_phone", ""),
                "gstin": inv.get("gstin", ""),
                "created_at": inv.get("created_at").isoformat() if inv.get("created_at") else None,
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/invoices/<invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    if invoices_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    oid = parse_object_id(invoice_id)
    if oid is None:
        return jsonify({"error": "Invalid invoice ID format"}), 400
    
    try:
        invoice = invoices_collection.find_one({"_id": oid})
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404
        
        return jsonify({
            "id": str(invoice["_id"]),
            "invoice_number": invoice.get("invoice_number"),
            "items": invoice.get("items", []),
            "subtotal": invoice.get("subtotal", 0),
            "tax": invoice.get("tax", 0),
            "total_amount": invoice.get("total_amount", 0),
            "cgst_percent": invoice.get("cgst_percent", 9),
            "sgst_percent": invoice.get("sgst_percent", 9),
            "to_name": invoice.get("to_name", ""),
            "to_address": invoice.get("to_address", ""),
            "to_phone": invoice.get("to_phone", ""),
            "gstin": invoice.get("gstin", ""),
            "created_at": invoice.get("created_at").isoformat() if invoice.get("created_at") else None,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Customer Authentication & Approval ---

@app.route("/register", methods=["POST"])
def register_customer():
    if customers_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    print(f"DEBUG: Received registration request: {data}")
    
    name = data.get("name")
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password")

    if not all([name, email, phone, password]):
        print(f"DEBUG: Registration failed - Missing fields: name={name}, email={email}, phone={phone}")
        return jsonify({"error": "Missing fields"}), 400

    existing_user = customers_collection.find_one({"email": email})
    if existing_user:
        print(f"DEBUG: Registration failed - Email '{email}' already registered")
        return jsonify({"error": "Email already registered"}), 400

    new_customer = {
        "name": name,
        "email": email,
        "phone": phone,
        "password": generate_password_hash(password),
        "is_approved": False, # Approval system
        "created_at": ObjectId().generation_time
    }

    customers_collection.insert_one(new_customer)
    return jsonify({"message": "Registration successful. Please contact Admin for approval."}), 201

@app.route("/login/customer", methods=["POST"])
def login_customer():
    if customers_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = customers_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Account not found"}), 404

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Incorrect password"}), 401

    if not user.get("is_approved", False):
        return jsonify({"error": "Account pending approval. Please contact Admin via WhatsApp."}), 403

    return jsonify({
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "is_approved": True
    }), 200

@app.route("/admin/customers", methods=["GET"])
def get_customers():
    if customers_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    customers = list(customers_collection.find())
    for c in customers:
        c["id"] = str(c.pop("_id"))
        c.pop("password", None)
    return jsonify(customers), 200

@app.route("/admin/customers/<cust_id>/approve", methods=["PUT"])
def approve_customer(cust_id):
    if customers_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    oid = parse_object_id(cust_id)
    if not oid: return jsonify({"error": "Invalid ID"}), 400

    result = customers_collection.update_one({"_id": oid}, {"$set": {"is_approved": True}})
    if result.matched_count == 0:
        return jsonify({"error": "Customer not found"}), 404
    
    return jsonify({"message": "Customer approved successfully"}), 200

@app.route("/admin/customers/<cust_id>", methods=["DELETE"])
def delete_customer(cust_id):
    if customers_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    oid = parse_object_id(cust_id)
    if not oid: return jsonify({"error": "Invalid ID"}), 400

    customers_collection.delete_one({"_id": oid})
    return jsonify({"message": "Customer removed"}), 200

# --- Press Management (CRUD) ---

@app.route("/presses", methods=["GET"])
def get_presses():
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    try:
        presses = list(presses_collection.find().sort('name', 1))
        return jsonify([format_press(p) for p in presses]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/presses/<press_id>", methods=["GET"])
def get_press(press_id):
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(press_id)
    if oid is None:
        return jsonify({"error": "Invalid press ID format"}), 400
    try:
        press = presses_collection.find_one({"_id": oid})
        if press:
            return jsonify(format_press(press)), 200
        return jsonify({"error": "Press not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/presses", methods=["POST"])
def add_press():
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    name = data.get("name")
    address = data.get("address")
    ph_no = data.get("ph_no", "")

    if not name or not address:
        return jsonify({"error": "Name and address are required"}), 400

    try:
        new_press = {
            "name": name,
            "address": address,
            "ph_no": ph_no
        }
        result = presses_collection.insert_one(new_press)
        new_press["_id"] = result.inserted_id
        return jsonify(format_press(new_press)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/presses/<press_id>", methods=["PUT"])
def update_press(press_id):
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(press_id)
    if oid is None:
        return jsonify({"error": "Invalid press ID format"}), 400

    data = request.get_json()
    update_data = {}
    if "name" in data: update_data["name"] = data["name"]
    if "address" in data: update_data["address"] = data["address"]
    if "ph_no" in data: update_data["ph_no"] = data["ph_no"]

    if not update_data:
        return jsonify({"error": "No data provided to update"}), 400

    try:
        result = presses_collection.update_one({"_id": oid}, {"$set": update_data})
        if result.matched_count == 0:
            return jsonify({"error": "Press not found"}), 404
        
        updated_press = presses_collection.find_one({"_id": oid})
        return jsonify(format_press(updated_press)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/presses/<press_id>", methods=["DELETE"])
def delete_press(press_id):
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(press_id)
    if oid is None:
        return jsonify({"error": "Invalid press ID format"}), 400
    try:
        result = presses_collection.delete_one({"_id": oid})
        if result.deleted_count > 0:
            return jsonify({"message": "Press deleted successfully"}), 200
        return jsonify({"error": "Press not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
