#!/usr/bin/env python3
"""
Convert SVG icon to ICO format using PIL
This approach uses a pre-rendered PNG approach
"""
import os
from PIL import Image, ImageDraw, ImageFont

backend_path = r"C:\01-repos\Unternehmen\OpcUAPlaygroundWithPythonBackendandFrontend\VentilTesterBackend"
ico_path = os.path.join(backend_path, "app.ico")

# Create icon programmatically
size = 256
img = Image.new('RGB', (size, size), color='white')
draw = ImageDraw.Draw(img)

# Main teal color
main_color = (13, 148, 136)  # #0d9488
accent_color = (20, 184, 166)  # #14b8a6

# Draw geometric shapes inspired by binder+co
# Left vertical bar
draw.rectangle([50, 50, 78, 170], fill=main_color)

# Top horizontal bar
draw.rectangle([50, 50, 190, 78], fill=main_color)

# Right accent bar
draw.rectangle([162, 50, 190, 110], fill=accent_color)

# Bottom accent bar
draw.rectangle([50, 142, 190, 170], fill=accent_color)

# Center accent square
draw.rectangle([100, 88, 152, 140], fill=accent_color)

# Diagonal line
draw.line([(140, 50), (190, 100)], fill=accent_color, width=8)

# Save as ICO with multiple sizes
ico_sizes = [(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)]
ico_images = []

for size in ico_sizes:
    resized = img.resize(size, Image.Resampling.LANCZOS)
    ico_images.append(resized)

# Save as ICO
ico_images[0].save(ico_path, format='ICO', sizes=ico_sizes)

print(f"✓ Icon created successfully: {ico_path}")
print("Now rebuild your project to apply the icon to the executable.")
