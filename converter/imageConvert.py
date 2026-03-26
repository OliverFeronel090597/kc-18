from PIL import Image
import os

# Folder with original images
source_folder = r"KC@18"

# Folder to save lower quality images
dest_folder = r"KC@18_LQ"
os.makedirs(dest_folder, exist_ok=True)

# Supported image formats
supported_formats = (".jpg", ".jpeg", ".png")  # add others if needed

for file_name in os.listdir(source_folder):
    if file_name.lower().endswith(supported_formats):
        source_path = os.path.join(source_folder, file_name)
        dest_path = os.path.join(dest_folder, file_name)
        
        with Image.open(source_path) as img:
            if img.format == "JPEG":
                img.save(dest_path, quality=18)
            elif img.format == "PNG":
                img.save(dest_path, optimize=True)  # PNG doesn't use quality param
            else:
                # fallback for other formats, just save as JPEG
                rgb_img = img.convert("RGB")
                dest_path = os.path.splitext(dest_path)[0] + ".jpg"
                rgb_img.save(dest_path, quality=18)

print("All images processed.")