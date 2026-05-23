import os
from datetime import datetime, timezone, timedelta
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

# Enable wide CORS for testing
CORS(app, resources={r"/*": {"origins": "*"}})

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
    invoices_collection = db["invoices"]
    presses_collection = db["presses"]
    companies_collection = db["companies"]
    purchases_collection = db["purchases"]
else:
    cards_collection = None
    invoices_collection = None
    presses_collection = None
    companies_collection = None
    purchases_collection = None
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
        "ph_no": press.get("ph_no", ""),
        "gstin": press.get("gstin", ""),
        "is_approved": press.get("is_approved", False)
    }

def format_company(company):
    return {
        "id": str(company["_id"]),
        "name": company.get("name"),
        "contact_person": company.get("contact_person", ""),
        "email": company.get("email", ""),
        "phone": company.get("phone", ""),
        "address": company.get("address", ""),
        "created_at": company.get("created_at").isoformat() if company.get("created_at") else None
    }

def format_purchase(purchase):
    return {
        "id": str(purchase["_id"]),
        "company_id": str(purchase.get("company_id", "")),
        "company_name": purchase.get("company_name", ""),
        "invoice_number": purchase.get("invoice_number", ""),
        "purchase_date": purchase.get("purchase_date"),
        "items": purchase.get("items", []),
        "subtotal": purchase.get("subtotal", 0),
        "tax": purchase.get("tax", 0),
        "total_amount": purchase.get("total_amount", 0),
        "notes": purchase.get("notes", ""),
        "created_at": purchase.get("created_at").isoformat() if purchase.get("created_at") else None
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

INVOICE_SEQUENCE_START = 74

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
            is_custom_line = bool(item.get("is_custom")) or (isinstance(card_id, str) and card_id.startswith("custom-"))
            if is_custom_line:
                continue

            quantity = int(item.get("quantity", 0))

            if not card_id or quantity <= 0:
                # Skip non-stock lines such as transportation charge rows.
                continue

            oid = parse_object_id(card_id)
            if oid is None:
                # Treat non-ObjectId lines as non-stock entries rather than hard-failing.
                continue

            card = cards_collection.find_one({"_id": oid}, {"name": 1, "stock": 1})
            if not card:
                return jsonify({"error": "One or more products were not found"}), 400

            available_stock = int(card.get("stock", 0))
            if quantity > available_stock:
                return jsonify({
                    "error": f"Insufficient stock for {card.get('name', 'product')}. Available: {available_stock}, requested: {quantity}"
                }), 400

        # Get the next invoice sequence number and build invoice number as <sequence>-<year>
        last_invoice = invoices_collection.find_one(sort=[("invoice_sequence", -1), ("_id", -1)])
        if last_invoice and isinstance(last_invoice.get("invoice_sequence"), int):
            invoice_sequence = int(last_invoice.get("invoice_sequence", 0)) + 1
        else:
            # Backward compatibility for older invoices that stored only invoice_number.
            legacy_last = invoices_collection.find_one(sort=[("_id", -1)])
            if not legacy_last:
                invoice_sequence = INVOICE_SEQUENCE_START
            else:
                legacy_value = legacy_last.get("invoice_number")
                if isinstance(legacy_value, str) and "-" in legacy_value:
                    legacy_value = legacy_value.split("-", 1)[0]
                try:
                    invoice_sequence = int(legacy_value) + 1
                except (TypeError, ValueError):
                    invoice_sequence = INVOICE_SEQUENCE_START

        invoice_year = datetime.now().year
        invoice_number = f"{invoice_sequence}-{invoice_year}"
        
        # Create invoice document
        invoice_doc = {
            "invoice_number": invoice_number,
            "invoice_sequence": invoice_sequence,
            "invoice_year": invoice_year,
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
            "created_at": datetime.utcnow(),
        }
        
        result = invoices_collection.insert_one(invoice_doc)
        invoice_doc["_id"] = str(result.inserted_id)
        
        # Update product stocks for each item in the invoice
        for item in items:
            card_id = item.get("id")
            is_custom_line = bool(item.get("is_custom")) or (isinstance(card_id, str) and card_id.startswith("custom-"))
            if is_custom_line:
                continue

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
        invoices = list(invoices_collection.find().sort([("invoice_sequence", -1), ("_id", -1)]))
        result = []
        for inv in invoices:
            result.append({
                "id": str(inv["_id"]),
                "invoice_number": inv.get("invoice_number"),
            "invoice_sequence": inv.get("invoice_sequence"),
            "invoice_year": inv.get("invoice_year"),
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
                "created_at": inv.get("created_at").strftime('%Y-%m-%dT%H:%M:%S.000Z') if inv.get("created_at") else None,
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
            "invoice_sequence": invoice.get("invoice_sequence"),
            "invoice_year": invoice.get("invoice_year"),
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
            "created_at": invoice.get("created_at").strftime('%Y-%m-%dT%H:%M:%S.000Z') if invoice.get("created_at") else None,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Authentication ---

@app.route("/login/admin", methods=["POST"])
def login_admin():
    data = request.get_json()
    user = data.get("username", "").strip()
    password = data.get("password", "").strip()
    
    admin_user = os.getenv("ADMIN_USER") or os.getenv("VITE_ADMIN_USER", "admin")
    admin_pass = os.getenv("ADMIN_PASS") or os.getenv("VITE_ADMIN_PASS", "1234")
    
    if user == admin_user and password == admin_pass:
        return jsonify({
            "message": "Admin login successful", 
            "role": "admin",
            "token": "admin-dummy-token-123"
        }), 200
    return jsonify({"error": "Invalid admin credentials"}), 401

@app.route("/login/press", methods=["POST"])
def login_press():
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    name = data.get("name")
    ph_no = data.get("ph_no")

    if not name or not ph_no:
        return jsonify({"error": "Name and phone number are required"}), 400

    # Clean input ph_no (remove all whitespace) for matching
    clean_ph_no = ph_no.replace(" ", "").strip()

    # Case-insensitive name match AND cleaned ph_no match
    press = presses_collection.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"}, 
        "ph_no": clean_ph_no
    })
    
    if not press:
        return jsonify({"error": "Invalid name or phone number"}), 401
    
    if not press.get("is_approved", False):
        return jsonify({"error": "Your account is pending approval. Please contact admin."}), 403

    return jsonify({
        "id": str(press["_id"]),
        "name": press["name"],
        "ph_no": press.get("ph_no", ""),
        "is_approved": True,
        "token": f"press-dummy-token-{str(press['_id'])}"
    }), 200

@app.route("/register/press", methods=["POST"])
def register_press():
    # Alias for adding a press via public registration
    return add_press()

# --- Press Management (CRUD) ---

@app.route("/presses", methods=["GET"])
def get_presses():
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    try:
        # Only return presses where is_approved is explicitly True
        presses = list(presses_collection.find({"is_approved": True}).sort('name', 1))
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
    gstin = str(data.get("gstin", "")).strip()

    if not name or not address:
        return jsonify({"error": "Name and address are required"}), 400

    try:
        # Clean phone number for consistency
        clean_ph_no = ph_no.replace(" ", "").strip()

        # Unique Phone Number Check
        existing = presses_collection.find_one({
            "ph_no": clean_ph_no
        })
        if existing:
            return jsonify({"error": "Already phone number exists, try different phone number."}), 400

        new_press = {
            "name": name,
            "address": address,
            "ph_no": clean_ph_no,
            "gstin": gstin,
            "is_approved": False  # New presses require approval
        }
        result = presses_collection.insert_one(new_press)
        new_press["_id"] = result.inserted_id
        return jsonify(format_press(new_press)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/presses/pending", methods=["GET"])
def get_pending_presses():
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    try:
        # Pending means is_approved is explicitly False OR missing OR None
        # We can use {'$ne': True} to catch all these states
        pending = list(presses_collection.find({
            "is_approved": {"$ne": True}
        }).sort('name', 1))
        return jsonify([format_press(p) for p in pending]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/presses/<press_id>/approve", methods=["POST"])
def approve_press(press_id):
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(press_id)
    if not oid: return jsonify({"error": "Invalid ID"}), 400
    
    result = presses_collection.update_one({"_id": oid}, {"$set": {"is_approved": True}})
    if result.matched_count == 0:
        return jsonify({"error": "Press not found"}), 404
    return jsonify({"message": "Press approved successfully"}), 200

@app.route("/presses/<press_id>/reject", methods=["POST"])
def reject_press(press_id):
    if presses_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(press_id)
    if not oid: return jsonify({"error": "Invalid ID"}), 400
    
    result = presses_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Press not found"}), 404
    return jsonify({"message": "Press rejected and removed"}), 200

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
    if "gstin" in data: update_data["gstin"] = str(data["gstin"]).strip()

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

# --- Companies Management ---

@app.route("/companies", methods=["GET"])
def get_companies():
    if companies_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    try:
        companies = list(companies_collection.find().sort('name', 1))
        return jsonify([format_company(c) for c in companies]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/companies", methods=["POST"])
def add_company():
    if companies_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    name = data.get("name", "").strip()
    contact_person = data.get("contact_person", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()
    
    if not name:
        return jsonify({"error": "Company name is required"}), 400
    
    try:
        # Check if company with same name already exists
        existing = companies_collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        if existing:
            return jsonify({"error": "Company with this name already exists"}), 400
        
        new_company = {
            "name": name,
            "contact_person": contact_person,
            "email": email,
            "phone": phone,
            "address": address,
            "created_at": datetime.now()
        }
        result = companies_collection.insert_one(new_company)
        new_company["_id"] = result.inserted_id
        return jsonify(format_company(new_company)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/companies/<company_id>", methods=["GET"])
def get_company(company_id):
    if companies_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(company_id)
    if oid is None:
        return jsonify({"error": "Invalid company ID format"}), 400
    try:
        company = companies_collection.find_one({"_id": oid})
        if company:
            return jsonify(format_company(company)), 200
        return jsonify({"error": "Company not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/companies/<company_id>", methods=["PUT"])
def update_company(company_id):
    if companies_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(company_id)
    if oid is None:
        return jsonify({"error": "Invalid company ID format"}), 400

    data = request.get_json()
    update_data = {}
    if "name" in data: update_data["name"] = data["name"].strip()
    if "contact_person" in data: update_data["contact_person"] = data["contact_person"].strip()
    if "email" in data: update_data["email"] = data["email"].strip()
    if "phone" in data: update_data["phone"] = data["phone"].strip()
    if "address" in data: update_data["address"] = data["address"].strip()

    if not update_data:
        return jsonify({"error": "No data provided to update"}), 400

    try:
        result = companies_collection.update_one({"_id": oid}, {"$set": update_data})
        if result.matched_count == 0:
            return jsonify({"error": "Company not found"}), 404
        
        updated_company = companies_collection.find_one({"_id": oid})
        return jsonify(format_company(updated_company)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/companies/<company_id>", methods=["DELETE"])
def delete_company(company_id):
    if companies_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    oid = parse_object_id(company_id)
    if oid is None:
        return jsonify({"error": "Invalid company ID format"}), 400
    try:
        result = companies_collection.delete_one({"_id": oid})
        if result.deleted_count > 0:
            return jsonify({"message": "Company deleted successfully"}), 200
        return jsonify({"error": "Company not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Purchases Management ---

@app.route("/purchases", methods=["POST"])
def create_purchase():
    if purchases_collection is None or companies_collection is None or cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    company_id = data.get("company_id")
    invoice_number = data.get("invoice_number", "").strip()
    purchase_date = data.get("purchase_date")
    items = data.get("items", [])
    subtotal = data.get("subtotal", 0)
    tax = data.get("tax", 0)
    total_amount = data.get("total_amount", 0)
    notes = data.get("notes", "").strip()
    
    if not company_id or not invoice_number or not items:
        return jsonify({"error": "Company, invoice number, and items are required"}), 400
    
    try:
        # Get company details
        company_oid = parse_object_id(company_id)
        if not company_oid:
            return jsonify({"error": "Invalid company ID"}), 400
        
        company = companies_collection.find_one({"_id": company_oid})
        if not company:
            return jsonify({"error": "Company not found"}), 404
        
        # Update product stock for each item
        for item in items:
            product_id = item.get("product_id")
            quantity = int(item.get("quantity", 0))
            
            if product_id and quantity > 0:
                prod_oid = parse_object_id(product_id)
                if prod_oid:
                    # Increase stock by quantity (adding purchased items to stock)
                    cards_collection.update_one(
                        {"_id": prod_oid},
                        {"$inc": {"stock": quantity}}
                    )
        
        # Create purchase document
        purchase_doc = {
            "company_id": company_oid,
            "company_name": company.get("name"),
            "invoice_number": invoice_number,
            "purchase_date": purchase_date,
            "items": items,
            "subtotal": float(subtotal),
            "tax": float(tax),
            "total_amount": float(total_amount),
            "notes": notes,
            "created_at": datetime.now()
        }
        
        result = purchases_collection.insert_one(purchase_doc)
        purchase_doc["_id"] = str(result.inserted_id)
        
        return jsonify({
            "id": purchase_doc["_id"],
            "message": "Purchase created successfully"
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/purchases", methods=["GET"])
def get_purchases():
    if purchases_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    try:
        purchases = list(purchases_collection.find().sort([("created_at", -1), ("_id", -1)]))
        result = []
        for purchase in purchases:
            result.append(format_purchase(purchase))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/purchases/company/<company_id>", methods=["GET"])
def get_purchases_by_company(company_id):
    if purchases_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    oid = parse_object_id(company_id)
    if oid is None:
        return jsonify({"error": "Invalid company ID format"}), 400
    
    try:
        purchases = list(purchases_collection.find({"company_id": oid}).sort([("created_at", -1), ("_id", -1)]))
        result = []
        for purchase in purchases:
            result.append(format_purchase(purchase))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/purchases/<purchase_id>", methods=["PUT"])
def update_purchase(purchase_id):
    if purchases_collection is None or cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    oid = parse_object_id(purchase_id)
    if oid is None:
        return jsonify({"error": "Invalid purchase ID format"}), 400
    
    try:
        old_purchase = purchases_collection.find_one({"_id": oid})
        if not old_purchase:
            return jsonify({"error": "Purchase not found"}), 404
        
        data = request.get_json()
        items = data.get("items", [])
        total_amount = data.get("total_amount", 0)
        
        # Calculate stock adjustments
        # First, map old items by product_id
        old_items_map = {str(item["product_id"]): item["quantity"] for item in old_purchase.get("items", [])}
        
        # Apply adjustments for new/updated items
        for item in items:
            p_id = str(item.get("product_id"))
            new_qty = int(item.get("quantity", 0))
            old_qty = old_items_map.get(p_id, 0)
            
            diff = new_qty - old_qty
            if diff != 0:
                prod_oid = parse_object_id(p_id)
                if prod_oid:
                    cards_collection.update_one({"_id": prod_oid}, {"$inc": {"stock": diff}})
            
            # Remove from map so we know which ones were removed from the bill
            if p_id in old_items_map:
                del old_items_map[p_id]
        
        # For items that were in the old bill but NOT in the new one, decrease stock by their old quantity
        for p_id, old_qty in old_items_map.items():
            prod_oid = parse_object_id(p_id)
            if prod_oid:
                cards_collection.update_one({"_id": prod_oid}, {"$inc": {"stock": -old_qty}})
        
        # Update purchase document
        update_data = {
            "invoice_number": data.get("invoice_number", old_purchase.get("invoice_number")),
            "purchase_date": data.get("purchase_date", old_purchase.get("purchase_date")),
            "items": items,
            "total_amount": float(total_amount),
            "updated_at": datetime.now()
        }
        
        purchases_collection.update_one({"_id": oid}, {"$set": update_data})
        
        return jsonify({"message": "Purchase updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/purchases/<purchase_id>", methods=["DELETE"])
def delete_purchase(purchase_id):
    if purchases_collection is None or cards_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    oid = parse_object_id(purchase_id)
    if oid is None:
        return jsonify({"error": "Invalid purchase ID format"}), 400
    
    try:
        purchase = purchases_collection.find_one({"_id": oid})
        if not purchase:
            return jsonify({"error": "Purchase not found"}), 404
        
        # Reverse stock changes
        for item in purchase.get("items", []):
            p_id = item.get("product_id")
            qty = int(item.get("quantity", 0))
            prod_oid = parse_object_id(p_id)
            if prod_oid:
                cards_collection.update_one({"_id": prod_oid}, {"$inc": {"stock": -qty}})
        
        purchases_collection.delete_one({"_id": oid})
        return jsonify({"message": "Purchase deleted and stock adjusted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    # use_reloader=False to prevent WinError 10038 on Windows
    app.run(debug=True, host='0.0.0.0', port=port, use_reloader=False)
