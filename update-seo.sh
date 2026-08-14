#!/bin/bash

# Update all cancel pages with enhanced SEO metadata

cd /Users/alexidonckerwolcke/Subveris/client/src/pages

# List of all cancel pages
pages=(
  "cancel-adobe"
  "cancel-audible"
  "cancel-canva-pro"
  "cancel-disney-plus"
  "cancel-duolingo"
  "cancel-hbo-max"
  "cancel-hellofresh"
  "cancel-icloud"
  "cancel-linkedin-premium"
  "cancel-microsoft-365"
  "cancel-nordvpn"
  "cancel-playstation-plus"
  "cancel-readly"
  "cancel-tinder-gold"
  "cancel-viaplay"
  "cancel-xbox-game-pass"
  "cancel-youtube-premium"
)

for page in "${pages[@]}"; do
  file="${page}.tsx"
  
  if [ -f "$file" ]; then
    echo "Updating $file..."
    
    # Update pickMetaVariant to add SEO fields
    sed -i '' 's/image: "https:\/\/www\.subveris\.com\/assets\/logo\.png?v=3",$/image: "https:\/\/www.subveris.com\/assets\/logo.png?v=3",\n            author: "Subveris",\n            type: "guide",\n            publishedTime: "2024-01-01T00:00:00Z",\n            modifiedTime: new Date().toISOString(),/g' "$file"
    
    # Update CancelPageJsonLd to add steps parameter
    sed -i '' "s/<CancelPageJsonLd productName=/<CancelPageJsonLd productName=/g" "$file"
    
  fi
done

echo "Done!"
