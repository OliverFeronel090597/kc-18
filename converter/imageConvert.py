from PIL import Image
import os

# Folders
source_folder = r"KCat18"
dest_folder = r"KCat18_LQ"
os.makedirs(dest_folder, exist_ok=True)

# Supported formats
supported_formats = (".jpg", ".jpeg", ".png")

# Max width/height for resizing
max_size = (1080, 1080)  # adjust for your needs

for file_name in os.listdir(source_folder):
    if file_name.lower().endswith(supported_formats):
        source_path = os.path.join(source_folder, file_name)
        dest_path = os.path.join(dest_folder, file_name)
        
        with Image.open(source_path) as img:
            # Resize if larger than max_size
            img.thumbnail(max_size, Image.LANCZOS)
            
            if img.format == "JPEG":
                img.save(dest_path, quality=15, optimize=True)
            elif img.format == "PNG":
                # Convert PNG to JPEG to save space (optional)
                if img.mode in ("RGBA", "LA"):
                    # keep transparency by converting to RGB with white background
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    bg.paste(img, mask=img.split()[3])  # 3 is alpha channel
                    bg.save(dest_path.replace(".png", ".jpg"), quality=15, optimize=True)
                else:
                    img.save(dest_path, optimize=True)
            else:
                rgb_img = img.convert("RGB")
                dest_path = os.path.splitext(dest_path)[0] + ".jpg"
                rgb_img.save(dest_path, quality=15, optimize=True)

print("All images processed and lighter.")