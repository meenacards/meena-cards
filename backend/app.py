import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId

# Load env variables
load_dotenv()

app = Flask(__name__)

# Restrict CORS to the configured frontend origin in production.
# Falls back to allow all origins if FRONTEND_URL is not set (local dev).
_frontend_url = os.getenv("FRONTEND_URL")
CORS(app, origins=[_frontend_url] if _frontend_url else "*")

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
else:
    cards_collection = None
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
        "is_offer": card.get("is_offer", False)
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
            "is_offer": request.form.get("is_offer") == 'true'
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
        image = request.files.get("image")
    else:
        data = request.get_json() or {}
        if "name" in data: update_data["name"] = data["name"]
        if "category" in data: update_data["category"] = data["category"]
        if "description" in data: update_data["description"] = data["description"]
        if "is_latest" in data: update_data["is_latest"] = bool(data["is_latest"])
        if "is_offer" in data: update_data["is_offer"] = bool(data["is_offer"])
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
