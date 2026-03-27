import os
import sys

def rename_by_modtime(folder):
    if not os.path.isdir(folder):
        print("Folder not found.")
        return

    files = [
        f for f in os.listdir(folder)
        if os.path.isfile(os.path.join(folder, f))
    ]

    if not files:
        print("No files found.")
        return

    # Sort files by last modified time
    files.sort(key=lambda f: os.path.getmtime(os.path.join(folder, f)))

    # Temporary rename to avoid collisions
    temp_names = {}

    for idx, filename in enumerate(files, start=1):
        ext = os.path.splitext(filename)[1]  # keep extension
        temp_name = f"__temp_{idx}{ext}"
        os.rename(
            os.path.join(folder, filename),
            os.path.join(folder, temp_name)
        )
        temp_names[temp_name] = f"{idx}{ext}"

    # Final rename
    for temp_name, final_name in temp_names.items():
        os.rename(
            os.path.join(folder, temp_name),
            os.path.join(folder, final_name)
        )

    print("Renaming completed.")

if __name__ == "__main__":
    # if len(sys.argv) < 2:
    #     print("Usage: python rename.py <folder>")
    # else:
    rename_by_modtime("KCat18")